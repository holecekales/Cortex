"use strict";
var express = require('express');
var WSSocket = require('ws');
var fs = require('fs');
var moment = require('moment');
var util_1 = require('util');
// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
var Pump = (function () {
    // ------------------------------------------------------------
    // construct the Pump object
    // ------------------------------------------------------------
    function Pump(server) {
        var _this = this;
        this.fileVerion = '1.0';
        this.socket = null;
        this.proxysocket = null;
        // express router.
        this.router = null;
        // in memory data retention
        // should be kept in sync between the client and the service
        // is define in the frontend pump.ts for the front end
        this.retentionTime = 2 * 60 * 60; // 2 hours in seconds
        this.maxLen = this.retentionTime / 2; // 3600
        // variables used to calculate pump cadence and keep
        // track of the history
        this.prevPumpTime = 0; // time of last pumping
        this.lastCadence = 0;
        this.avgWindow = undefined; // averging window (1 day)
        this.cadenceAverage = 0; // calculated average
        this.cadenceSampleCount = 0; // samples
        this.cadenceHist = [];
        // this array will be maxlen (2 hours) and will have all of the device samples
        // main purpose - drawing diagrams
        this.sampleData = [];
        // read the previous state from disk 
        // (hopefully it is still relevant)
        this.readStateFromDisk();
        // create and defined routes
        this.router = express.Router();
        // if someone calls us return all data in the last
        // 2 hours
        this.router.use('/', function (req, res, next) {
            var pumpInfo = {
                cadence: _this.lastCadence,
                cadenceHist: _this.cadenceHist,
                sampleData: _this.sampleData,
            };
            res.status(200).json(pumpInfo);
        });
        // create socket
        this.socket = new WSSocket.Server(server);
        this.socket.on('connection', function (ws, req) {
            console.log('socket connection: ' + ws.protocol);
            var p = _this;
            ws.on('message', function (msg) {
                p.rcvData(msg);
            });
        });
        // this is only for internal debugging
        // (Hacky) Workaround for environment variable for debugging
        // this is totally not awesome!!!
        if (process.env.COMPUTERNAME == "BLUEBIRD") {
            console.log("DEBUGGING ON BLUEBIRD");
            this.proxysocket = new WSSocket('ws://homecortex.azurewebsites.net', 'chart-protocol');
            this.proxysocket.on('message', function (data) {
                console.log(data);
                _this.rcvData(data);
            });
            this.proxysocket.on('open', function open() {
                console.log("homecoretex opened");
            });
        }
    }
    // ------------------------------------------------------------
    // recieve new reading from the device
    // ------------------------------------------------------------
    Pump.prototype.rcvData = function (data) {
        try {
            var obj = JSON.parse(data);
            if (obj.m == "d") {
                delete obj.m; // the source was device and we'll now get rid of it.
                obj.l = 55 - obj.l; // the bucket is 55cm deep -> converstion from device
            }
            if (util_1.isUndefined(obj.s) === false) {
                // the device reports state as well
                // take it off - since it is always 0 and just adds to the volume of data
                // which needs to be stored and transfered.
                delete obj.s;
            }
            //this seems like good device report
            if (util_1.isUndefined(obj.t) === false) {
                // store device data
                this.sampleData.push(obj);
                // if we're exceeding the maximum data that we're supposed to retain
                // we will just shift the data. maxLen is defined in terms of hour <2>
                if (this.sampleData.length > this.maxLen)
                    this.sampleData.shift(); // keep only a 2 days worth of data (sending every 2s)
                // calculate metrics 
                this.updateMetrics(this.sampleData.length);
                // broadcast to all the clients (browsers)
                this.broadcast(JSON.stringify(obj), 'chart-protocol');
                // write the state - important so we can restart the service if needed
                this.writeStateToDisk();
            }
        }
        catch (err) {
            console.log('Error pushing message out');
            console.log(data);
            console.error(err);
        }
    };
    // ------------------------------------------------------------
    // calc averages (input is unix time stemp)
    // ------------------------------------------------------------
    Pump.prototype.calcCadenceAverage = function (ut, cdc) {
        var ct = moment.unix(ut); // convert to moment
        // snap the averiging window to 1 day
        var hr = ct.hours(0).minutes(0).seconds(0).milliseconds(0);
        if ((this.avgWindow === undefined) || (hr.isAfter(this.avgWindow))) {
            // store the last average if we don't have one
            // or if we exceeded the averiging window (1 day)
            this.cadenceAverage = cdc;
            this.cadenceSampleCount = 1;
            this.avgWindow = hr;
            this.cadenceHist.push({ period: hr.unix(), cadence: cdc });
            if (this.cadenceHist.length > 365) {
                // keep data for rolling 365 days
                this.cadenceHist.shift();
            }
        }
        else {
            // approximate rolling average using Welford's method:
            // (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Online)
            this.cadenceSampleCount += 1;
            this.cadenceAverage = this.cadenceAverage * (this.cadenceSampleCount - 1) / this.cadenceSampleCount + cdc / this.cadenceSampleCount;
        }
    };
    // -----------------------------------------------------------------------------
    // updateMetrics - calculates metrics:
    // * how often is pump pumping
    // * calcualte averages
    // -----------------------------------------------------------------------------
    Pump.prototype.updateMetrics = function (len) {
        // calculate if the pump kicked in
        // we need to look across at least 15 samples to figure it out
        if (len >= 15 && len <= this.sampleData.length) {
            var rangeFirst = len - 15;
            // 24 is the level where we typically start pumping
            // if we're at that level (or higher) and if we saw a dip going down, 
            // let's see if we went through pumping
            if (this.sampleData[rangeFirst].l >= 24 && this.sampleData[rangeFirst + 1].l < this.sampleData[rangeFirst].l) {
                var minRangeLevel = 30;
                var maxRangeLevel = 0;
                // calculate min and max over our range
                for (var i = rangeFirst; i < len; i++) {
                    minRangeLevel = Math.min(minRangeLevel, this.sampleData[i].l);
                    maxRangeLevel = Math.max(maxRangeLevel, this.sampleData[i].l);
                }
                // if within this range the values exceeded max (24) and min (16)
                // than the pump is pumping and we need to remember the time and 
                // update the cadence
                if (minRangeLevel <= 16 && maxRangeLevel >= 24) {
                    // this is the time of the last device report
                    var time = this.sampleData[len - 1].t;
                    // this may be the first one we're seeing.
                    if (this.prevPumpTime > 0) {
                        // The cadence is in minutes. The time on the reports is Unix time 
                        // and therefore in seconds -> convert to minutes by x/60 
                        this.lastCadence = Math.round((time - this.prevPumpTime) / 60);
                        this.calcCadenceAverage(time, this.lastCadence);
                        console.log("Cadence Average update: ", this.cadenceAverage, " sample count:", this.cadenceSampleCount);
                    }
                    // remember when we saw it pumping. 
                    this.prevPumpTime = time;
                }
            }
        }
    };
    // ------------------------------------------------------------
    // write the state of the object to disk, just in case 
    // the service needs to be restarted
    // ------------------------------------------------------------
    Pump.prototype.writeStateToDisk = function () {
        var state = {
            version: this.fileVerion,
            cadenceCalc: {
                cadenceAverage: this.cadenceAverage,
                cadenceSampleCount: this.cadenceSampleCount,
                avgWindow: util_1.isUndefined(this.avgWindow) ? undefined : this.avgWindow.unix()
            },
            cadenceHist: this.cadenceHist,
            sampleData: this.sampleData
        };
        fs.writeFile('appState.json', JSON.stringify(state), 'utf8', function (err) {
            if (err) {
                console.error('State save failed at', moment().format('YYYY-MM-DD H:mm'));
            }
        });
    };
    // ------------------------------------------------------------
    // delOldRecords() 
    // delete all of the samples that are older than 2 hours (7200s)
    // ------------------------------------------------------------
    Pump.prototype.delOldRecords = function (time) {
        var len = this.sampleData.length;
        if ((time - this.sampleData[0].t < this.retentionTime)) {
            // the all are OK;
            return;
        }
        if ((time - this.sampleData[len - 1].t >= this.retentionTime)) {
            // all are bad! delete all;
            this.sampleData.splice(0, len);
            return;
        }
        // it's somewhere in the middle
        var begin = 0;
        var last = len - 1;
        var mid = 0;
        while (begin <= last) {
            mid = (begin + last) / 2 | 0; // integer devide 
            if (this.sampleData[mid] < time) {
                begin = mid + 1;
            }
            else if (this.sampleData[mid] > time) {
                last = mid - 1;
            }
            else {
                this.sampleData.splice(mid, len);
            }
        }
    };
    // ------------------------------------------------------------
    // evaluate if the file is compatible with runtime
    // ------------------------------------------------------------
    Pump.prototype.isCompatible = function (v) {
        return true; //v == this.fileVerion;
    };
    // ------------------------------------------------------------
    // read the state from the disk so we can restore the operation 
    // ------------------------------------------------------------
    Pump.prototype.readStateFromDisk = function () {
        if (fs.existsSync('appState.json')) {
            try {
                var state = JSON.parse(fs.readFileSync('appState.json', 'utf8'));
                // check the version of the file if is not the same
                // then get ignore the contents
                if (this.isCompatible(state.version)) {
                    // restore the state
                    this.sampleData = state.sampleData;
                    // cadence history
                    this.cadenceHist = state.cadenceHist;
                    // delete everything over 2 hours old
                    // $$$ Needs to be debugged.
                    // this.delOldRecords(now);
                    // process the last 2 hours of data
                    // so we propertly initialize the averiging
                    // we need to capture the previous time of empty
                    // but only of the time is less than the average cadence
                    var len = this.sampleData.length;
                    for (var i = 15; i < len; i++) {
                        this.updateMetrics(i);
                    }
                    var now = moment().unix();
                    // if there is a risk of significantly skewing the samples
                    var timeDiff = now - this.prevPumpTime;
                    // 600 == 10 minutes - which is would be very short pump period
                    // but if we have lastCadence already computed - we should use that
                    // if we have nothing - we have to start over
                    if (timeDiff > Math.max(this.lastCadence * 60, 600)) {
                        this.prevPumpTime = undefined;
                        this.lastCadence = 0;
                    }
                    if (util_1.isUndefined(state.cadenceCalc) === false) {
                        if (state.cadenceCalc.cadenceAverage > 0) {
                            this.cadenceAverage = state.cadenceCalc.cadenceAverage;
                        }
                        if (state.cadenceCalc.cadenceSampleCount > 0) {
                            this.cadenceSampleCount = state.cadenceCalc.cadenceSampleCount;
                        }
                        if (util_1.isUndefined(state.cadenceCalc.avgWindow) === false) {
                            // case that should not happen - but again possible 
                            this.avgWindow = moment.unix(state.cadenceCalc.avgWindow);
                            if (this.avgWindow.isValid() == false) {
                                // if somehow we're still not valid time (moment)
                                // them recompute
                                this.avgWindow = undefined;
                            }
                        }
                        // report to the console
                        console.log('Cadence Average(final): ', this.cadenceAverage, " sample count:", this.cadenceSampleCount);
                        var msg = ((util_1.isUndefined(this.avgWindow)) || (this.avgWindow.isValid() == false)) ? "still unknown" : this.avgWindow.format("MM/DD/YYYY H:mm:ss");
                        console.log("Averaging window start: ", msg);
                    }
                }
                else {
                }
            }
            catch (e) {
                console.error('Error reading state: ', e.message);
            }
        }
        else {
            console.warn('State file does not exist!');
        }
    };
    // ------------------------------------------------------------
    // broadcast to all of the clients (browsers)  
    // all clients are listening for updates on chart-protocol
    // ------------------------------------------------------------
    Pump.prototype.broadcast = function (data, protocol) {
        this.socket.clients.forEach(function each(client) {
            if (client.readyState === WSSocket.OPEN) {
                try {
                    // console.log('sending data ' + data);
                    if (protocol === undefined || client.protocol == protocol) {
                        client.send(data);
                    }
                }
                catch (e) {
                    console.error('Error notifying clients: ', e.message);
                }
            }
        });
    };
    ;
    // ------------------------------------------------------------
    // return the express router back to the app  
    // ------------------------------------------------------------
    Pump.prototype.routes = function () { return this.router; };
    return Pump;
}());
module.exports = function (server) { return new Pump(server); };
