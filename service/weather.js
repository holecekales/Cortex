"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const wxLoader_1 = require('./wxLoader');
const DayBoundary_1 = require('./DayBoundary');
const moment = require('moment-timezone');
class Weather {
    // --------------------------------------------------------
    // constructor
    // --------------------------------------------------------
    constructor(station) {
        this.aprsWx = new wxLoader_1.wxLoader();
        this.timerId = null;
        this.station = "";
        this.station = station;
    }
    // --------------------------------------------------------
    // filter to timestamp
    // --------------------------------------------------------
    init(pollPeriod = 30) {
        return __awaiter(this, void 0, void 0, function* () {
            let now = moment().unix();
            let mn = DayBoundary_1.getDateBoundary(now);
            // how long since midnight
            let diff = Math.min(Math.round((now - mn) / 3600), 24);
            yield this.getUpdate(diff);
            console.log("Polling for weather updates");
            this.startPolling(pollPeriod);
        });
    }
    // --------------------------------------------------------
    // filter to timestamp
    // --------------------------------------------------------
    timeFilter(unixTime) {
        this.aprsWx.timeFilter(unixTime);
    }
    // --------------------------------------------------------
    // start and stop polling for weather updates
    // the default polling interval is 30 minutes
    // --------------------------------------------------------
    startPolling(timeout) {
        // every 15 minutes get weather update (30*60*1000)
        this.timerId = setInterval(() => { this.getUpdate(); }, timeout * 60 * 1000);
    }
    stopPolling() {
        if (this.timerId != null)
            clearInterval(this.timerId);
    }
    // --------------------------------------------------------
    // getUpdate (hours) hours is how far back should we be looking
    // --------------------------------------------------------
    getUpdate(hours = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Get weather update");
            yield this.aprsWx.get(this.station, hours, hours);
        });
    }
    // --------------------------------------------------------
    // summary getters
    // --------------------------------------------------------
    temp() { return this.aprsWx.temp; }
    rain() { return this.aprsWx.rain; }
    minTemp() { return this.aprsWx.minTemp; }
    maxTemp() { return this.aprsWx.maxTemp; }
}
exports.Weather = Weather;
//# sourceMappingURL=weather.js.map