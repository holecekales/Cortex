"use strict";
var express = require('express');
var https = require('https');
const WSSocket = require('ws');
var fs = require('fs');
const moment = require('moment-timezone');
const util_1 = require('util');
const querystring_1 = require('querystring');
const DayBoundary_1 = require('./DayBoundary');
const weather_1 = require('./weather');
// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {
    // ------------------------------------------------------------
    // construct the Pump object
    // ------------------------------------------------------------
    constructor(server) {
        this.fileVersion = '1.0';
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
        this.time = 0; // time of last pumping
        this.interval = 0; // the last interval between to pump outs 
        // 365 days of history of # of pump runs
        this.history = [];
        // this array will be maxlen (2 hours) and will have all of the device samples
        // main purpose - drawing diagrams
        this.sampleData = [];
        this.weather = new weather_1.Weather("CW5022"); // KE7JL <- closest to the house
        // initialize weather. 
        // Since this is async we will start there
        this.weather.init(30);
        // read the previous state from disk 
        // (hopefully it is still relevant)
        this.readStateFromDisk();
        // create and defined routes
        this.router = express.Router();
        // see what we can get from the time
        this.router.get('/time', (req, res, next) => {
            let lt = moment.unix(this.time); // this will not work with PST since it is not taking care of DST
            let hi = moment.unix(this.history.length > 0 ? this.history[this.history.length - 1].period : 0);
            let data = {
                ver: 14,
                histLast: this.history.length > 0 ? this.history[this.history.length - 1].period : 0,
                histTime: hi.tz('America/Los_Angeles').format('MM/DD'),
                ltUnix: this.time ? this.time : "not set",
                ltTime: lt.tz('America/Los_Angeles').format('MM/DD hh:mm:ss'),
                ltBoundary: this.time ? DayBoundary_1.getDateBoundary(this.time) : "not set",
            };
            res.status(200).json(data);
        });
        // if someone calls us return all data in the last
        // 2 hours
        this.router.get('/', (req, res, next) => {
            let pumpInfo = {
                cadence: this.interval,
                time: this.time,
                history: this.history,
                sampleData: this.sampleData,
            };
            res.status(200).json(pumpInfo);
        });
        this.router.post('/', (req, res, next) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString(); // convert Buffer to string
            });
            req.on('end', () => {
                let obj = querystring_1.parse(body);
                // console.log("Raw Sensor Data", obj );
                // $$$ this is some serious hacking.
                obj['m'] = "d";
                this.rcvData(JSON.stringify(obj));
                res.end('ok');
            });
        });
        // create socket
        this.socket = new WSSocket.Server(server);
        this.socket.on('connection', (ws, req) => {
            console.log('socket connection: ' + ws.protocol);
            let p = this;
            ws.on('message', function (msg) {
                console.log("socket msg: ", msg, ws.protocol);
                // p.rcvData(msg);
            });
            ws.on('error', (err) => {
                console.log("socket error: ", err);
            });
            ws.on('close', (code, reason) => {
                console.log("Socket closed with code=", code, "reason: ", reason);
            });
        });
        // this is only for internal debugging
        // (Hacky) Workaround for environment variable for debugging
        // this is totally not awesome!!!
        if (process.env.COMPUTERNAME == "BLUEBIRD") {
            console.log("DEBUGGING ON BLUEBIRD");
            this.proxysocket = new WSSocket('ws://homecortex.azurewebsites.net', 'chart-protocol');
            this.proxysocket.on('message', (data) => {
                console.log(data);
                let msg = JSON.parse(data);
                this.rcvData(JSON.stringify(msg.reading));
            });
            this.proxysocket.on('open', function open() {
                console.log("homecoretex opened");
            });
            this.proxysocket.on('error', (err) => {
                console.error(err);
                this.proxysocket.terminate();
            });
            this.proxysocket.on('close', (code, reason) => {
                console.log("Socket closed with code=", code, "reason: ", reason);
            });
        }
    }
    // ------------------------------------------------------------
    // recieve new reading from the device
    // ------------------------------------------------------------
    rcvData(data) {
        try {
            let obj = JSON.parse(data);
            if (obj.m == "d") {
                delete obj.m; // the source was device and we'll now get rid of it.
                // meassuring from 280mm (tube) + 60mm (brick) 
                // (and there also seems to be some error on the sensor??)
                obj.l = 35 - obj.l;
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
                // we will use this to determine day roll over.
                let histLength = this.history.length;
                // data packet
                let packet = {
                    reading: obj,
                    histUpdate: undefined,
                    time: this.time,
                    interval: this.interval
                };
                // calculate metrics 
                if (this.updateMetrics()) {
                    // new day may have been added in updateMetrics (this.history.length + 1)
                    packet.histUpdate = this.history[histLength - 1];
                    // update time and interval
                    packet.time = this.time;
                    packet.interval = this.interval;
                }
                // broadcast to all the clients (browsers)
                this.broadcast(JSON.stringify(packet), 'chart-protocol');
                // write the state - important so we can restart the service if needed
                this.writeStateToDisk();
            }
        }
        catch (err) {
            console.log('Error pushing message out');
            console.log(data);
            console.error(err);
        }
    }
    // ------------------------------------------------------------
    // recordEvent - record pumpEvent into the history 
    // ------------------------------------------------------------
    recordEvent(time) {
        let len = this.history.length;
        let period = len == 0 ? 0 : this.history[len - 1].period;
        // snap  to a day boundary in PST
        let eventDay = DayBoundary_1.getDateBoundary(time);
        // did we move 24 hours (in seconds) forward?
        if (eventDay > period) {
            console.log(">>> Starting new period:", eventDay, "<<<");
            // we're in the next day store the stats and reset counter
            // and update the weather record in the history
            this.history.push({ period: eventDay, count: 1, temp: this.weather.temp(), rain: this.weather.rain() });
            if (this.history.length > 365) {
                // keep data for rolling 365 days
                this.history.shift();
            }
            this.weather.timeFilter(eventDay);
        }
        else {
            if (this.history[len - 1].period != eventDay) {
                console.error("Mismatch of event and accumulation period:", this.history[len - 1].period, eventDay);
            }
            this.history[len - 1].count += 1;
            // update the weather record in the history
            this.history[len - 1].temp = this.weather.temp();
            this.history[len - 1].rain = this.weather.rain();
        }
    }
    // -----------------------------------------------------------------------------
    // updateMetrics - calculates metrics:
    // * how often is pump pumping
    // * calcualte averages
    // -----------------------------------------------------------------------------
    updateMetrics() {
        const maxLevel = 24;
        const minLevel = 16;
        let len = this.sampleData.length;
        // calculate if the pump kicked in - we need 15 values for the filter
        if (len >= 15) {
            let rangeFirst = len - 15;
            // 24 is the level where we typically start pumping
            // if we're at that level (or higher) and if we saw a dip going down, 
            // let's see if we went through pumping
            if (this.sampleData[rangeFirst].l >= maxLevel && this.sampleData[rangeFirst + 1].l < this.sampleData[rangeFirst].l) {
                let minRangeLevel = 30;
                let maxRangeLevel = 0;
                // calculate min and max over our range
                for (let i = rangeFirst; i < len; i++) {
                    minRangeLevel = Math.min(minRangeLevel, this.sampleData[i].l);
                    maxRangeLevel = Math.max(maxRangeLevel, this.sampleData[i].l);
                }
                // if within this range the values exceeded max (maxLevel) and min (minLevel)
                // than the pump is pumping and we need to update metrics + record the event
                if (minRangeLevel <= minLevel && maxRangeLevel >= maxLevel) {
                    // this is the time of the last device report (unix time)
                    let time = this.sampleData[len - 1].t;
                    // this may be the first one we're seeing.
                    if (this.time > 0) {
                        // The interval is in minutes. The time on the reports is Unix time 
                        // and therefore in seconds -> convert to minutes by x/60 
                        this.interval = Math.round((time - this.time) / 60);
                        console.log("New Interval: ", this.interval);
                    }
                    // remember when we saw it pumping. 
                    this.time = time;
                    this.recordEvent(time);
                    return true;
                }
            }
        }
        return false;
    }
    // ------------------------------------------------------------
    // write the state of the object to disk, just in case 
    // the service needs to be restarted
    // ------------------------------------------------------------
    writeStateToDisk() {
        let state = {
            version: this.fileVersion,
            current: {
                time: this.time,
                interval: this.interval,
            },
            history: this.history,
            sampleData: this.sampleData
        };
        fs.writeFile('appState.json', JSON.stringify(state), 'utf8', (err) => {
            if (err) {
                console.error('State save failed at', moment().format('YYYY-MM-DD H:mm'), "with error", err);
            }
        });
    }
    // ------------------------------------------------------------
    // evaluate if the file is compatible with runtime
    // ------------------------------------------------------------
    isCompatible(v) {
        return v == this.fileVersion;
    }
    // ------------------------------------------------------------
    // read the state from the disk so we can restore the operation 
    // ------------------------------------------------------------
    readStateFromDisk() {
        if (fs.existsSync('appState.json')) {
            try {
                // let config: any = JSON.parse(fs.readFileSync('appConfig.json', 'utf8'));
                // this.weatherKey = config.weatherKey;
                let state = JSON.parse(fs.readFileSync('appState.json', 'utf8'));
                // check the version of the file if is not the same
                // then get ignore the contents
                if (this.isCompatible(state.version)) {
                    this.time = state.current.time;
                    this.interval = state.current.interval;
                    this.history = state.history;
                    this.sampleData = state.sampleData;
                    // this should be really obtained from the device 
                    // or at least from the time service. 
                    // hope the servers have the right time on them
                    let now = moment().unix();
                    // through out old data, since they are no more useful
                    // we want to display and track only the last 2 hours.
                    let len = this.sampleData.length;
                    let i = 0;
                    // find the point in the array when we're older than
                    // 2 hours (log2 would be better)
                    const sent = 7200; // sentinel for 2 hours in seconds
                    let delItems = false;
                    while ((i < len) && ((now - this.sampleData[i].t) > sent)) {
                        i++;
                        delItems = true;
                    }
                    if (delItems) {
                        console.log("Purging:", '0 -', i, "time: ", moment.unix(this.sampleData[Math.min(i + 1, len - 1)].t).format());
                        this.sampleData.splice(0, Math.min(i + 1, len));
                    }
                    if (this.interval > 0) {
                        let ins = this.interval * 60; // interval in seconds (unix time)
                        // for debugging purposes only - so we can display the log message
                        let addEventCount = Math.max(Math.round((now - (this.time + ins)) / ins), 0);
                        console.log("Synthetically adding", addEventCount, "events.");
                        // catch up with the down time, using the previous statistics
                        // if lastInterval is set, means that prevPumpTime must be set as well!
                        for (var t = (this.time + ins); t < now; t += ins) {
                            console.log("Adding event at time: ", t);
                            this.recordEvent(t);
                        }
                    }
                    else {
                        // just for debugging purposes.
                        // we could re-calculete the iterval from the samples.  
                        console.log("Time from last stored time =", now - this.time, "s.");
                        console.log("Invalid at 600s");
                        console.log("Interval 0. No events can be added!");
                    }
                    // if there is a risk of significantly skewing the samples
                    // require lastInterval 
                    let timeDiff = now - this.time;
                    // 600 == 10 minutes - which is would be very short pump period
                    // but if we have lastInterval already computed - we should use that
                    // if we have nothing - we have to start over
                    if (timeDiff > Math.max(this.interval * 60, 600)) {
                        this.time = 0;
                        this.interval = 0;
                        console.log("Time and interval stale -> reset");
                    }
                    // fixing up a file!
                    for (let x = 0; x < this.history.length; x++) {
                        let sod = DayBoundary_1.getDateBoundary(this.history[x].period);
                        // console.log(x, moment.unix(this.history[x].period).format("MM/DD HH:mm:ss"), this.history[x].count);
                        if (this.history[x].period != sod) {
                            console.error("Period not at SOD. idx=", x, ":", this.history[x].period, sod /*, "<- fixed"*/);
                        }
                    }
                }
            }
            catch (e) {
                console.error('Error reading state: ', e.message);
            }
        }
        else {
            console.warn('State file does not exist!');
        }
    }
    // ------------------------------------------------------------
    // broadcast to all of the clients (browsers)  
    // all clients are listening for updates on chart-protocol
    // ------------------------------------------------------------
    broadcast(data, protocol) {
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
    }
    ;
    // ------------------------------------------------------------
    // return the express router back to the app  
    // ------------------------------------------------------------
    routes() { return this.router; }
}
module.exports = (server) => { return new Pump(server); };
//# sourceMappingURL=pump.js.map