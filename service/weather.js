"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var wxLoader_1 = require('./wxLoader');
var DayBoundary_1 = require('./DayBoundary');
var moment = require('moment-timezone');
var Weather = (function () {
    // --------------------------------------------------------
    // constructor
    // --------------------------------------------------------
    function Weather(station) {
        this.aprsWx = new wxLoader_1.wxLoader();
        this.timerId = null;
        this.station = "";
        this.station = station;
    }
    // --------------------------------------------------------
    // filter to timestamp
    // --------------------------------------------------------
    Weather.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function* () {
            var now = moment().unix();
            var mn = DayBoundary_1.getDateBoundary(now);
            // how long since midnight
            var diff = Math.min(Math.round((now - mn) / 3600), 24);
            yield this.getUpdate(diff);
            console.log("Polling for weather updates");
            this.startPolling();
        });
    };
    // --------------------------------------------------------
    // filter to timestamp
    // --------------------------------------------------------
    Weather.prototype.timeFilter = function (unixTime) {
        this.aprsWx.timeFilter(unixTime);
    };
    // --------------------------------------------------------
    // start and stop polling for weather updates
    // the default polling interval is 30 minutes
    // --------------------------------------------------------
    Weather.prototype.startPolling = function (timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 30; }
        // every 15 minutes get weather update (30*60*1000)
        this.timerId = setInterval(function () { _this.getUpdate(); }, timeout * 60 * 1000);
    };
    Weather.prototype.stopPolling = function () {
        if (this.timerId != null)
            clearInterval(this.timerId);
    };
    // --------------------------------------------------------
    // getUpdate (hours) hours is how far back should we be looking
    // --------------------------------------------------------
    Weather.prototype.getUpdate = function (hours) {
        return __awaiter(this, void 0, void 0, function* () {
            if (hours === void 0) { hours = 1; }
            console.log("Get weather update");
            yield this.aprsWx.get(this.station, hours, hours);
        });
    };
    // --------------------------------------------------------
    // summary getters
    // --------------------------------------------------------
    Weather.prototype.temp = function () { return this.aprsWx.temp; };
    Weather.prototype.rain = function () { return this.aprsWx.rain; };
    Weather.prototype.minTemp = function () { return this.aprsWx.minTemp; };
    Weather.prototype.maxTemp = function () { return this.aprsWx.maxTemp; };
    return Weather;
}());
exports.Weather = Weather;
//# sourceMappingURL=weather.js.map