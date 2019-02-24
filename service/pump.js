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
        this.socket = null;
        this.proxysocket = null;
        // express router.
        this.router = null;
        // in memory data retention
        // should be kept in sync between the client and the service
        // is define in the frontend pump.ts for the front end
        this.hoursOfData = 2; // hours worh of data that we'll be displaying
        // hoursOfData * minutes/hour * seconds/minute (but i sample only every 2 seconds so must devide by 2)  
        this.maxLen = this.hoursOfData * 60 * 60 / 2; // 3600
        // variables used to calculate pump cadence and keep
        // track of the history
        this.prevPumpTime = 0; // time of last pumping
        this.lastHour = undefined; // are we in the same average window 
        this.cadenceAverage = 0; // calculated average
        this.cadenceSampleCount = 0; // samples
        // this array will be thi maxlen big
        this.sampleData = [];
        // create and defined routes
        this.router = express.Router();
        // if someone calls us return all data in the last
        // 2 hours
        this.router.use('/', function (req, res, next) {
            res.status(200).json(_this.sampleData);
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
            this.sampleData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
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
            //this seems like good device report
            if (util_1.isUndefined(obj.t) === false) {
                // store device data
                this.sampleData.push(obj);
                // if we're exceeding the maximum data that we're supposed to retain
                // we will just shift the data. maxLen is defined in terms of hour <2>
                if (this.sampleData.length > this.maxLen)
                    this.sampleData.shift(); // keep only a 2 days worth of data (sending every 2s)
                // calculate metrics 
                this.updateMetrics();
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
        var hr = ct.minutes(0).seconds(0).milliseconds(0);
        if (this.lastHour === undefined || hr > this.lastHour) {
            //store the last hour if we don't have one have yet
            // $$$ we should load it from the file
            this.cadenceAverage = cdc;
            this.cadenceSampleCount = 1;
            this.lastHour = hr;
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
    Pump.prototype.updateMetrics = function () {
        var len = this.sampleData.length;
        // calculate if the pump kicked in
        // we need to look across at least 15 samples to figure it out
        if (len >= 15) {
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
                        var cadence = Math.round((time - this.prevPumpTime) / 60);
                        this.calcCadenceAverage(time, cadence);
                        console.log("Cadence Average update: ", this.cadenceAverage);
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
        var content = {
            cadenceHist: [],
            sampleData: this.sampleData
        };
        fs.writeFile('appState.json', JSON.stringify(content), 'utf8', function (err) {
            if (err) {
                console.error('State file failed to save at', moment().format('YYYY-MM-DD H:mm'));
                throw err;
            }
            console.log('State saved at', moment().format('YYYY-MM-DD H:mm:ss'));
        });
    };
    // ------------------------------------------------------------
    // write the state of the object to disk, just in case 
    // the service needs to be restarted
    // ------------------------------------------------------------
    Pump.prototype.readStateFromDisk = function () {
        var state = JSON.parse(fs.readFileSync('appState.json', 'utf8'));
        console.log(state);
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
                    console.error('This' + e);
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
