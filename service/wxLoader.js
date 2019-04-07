"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const downloader_1 = require("./downloader");
const wxparser_1 = require("./wxparser");
// -----------------------------------------------------------
// load and parse weather from findu.com from a give station
// -----------------------------------------------------------
class wxLoader {
    // -----------------------------------------------------------
    // constructor
    // -----------------------------------------------------------
    constructor() {
        this.record = [];
        this.recalc = false; // recalculate averages
        // averages
        this.minTemp = 0;
        this.maxTemp = 0;
        this.temp = 0;
        this.rain = 0;
        this.some = 0;
    }
    // -----------------------------------------------------------
    // get update for given station
    // -----------------------------------------------------------
    get(station, start = 1, length = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            // goto http://www.findu.com/cgi-bin/rawwx.cgi?call=CW5002&start=1&length=1 to get the weather data
            var options = {
                host: 'www.findu.com',
                path: '/cgi-bin/rawwx.cgi?call=<station>&start=<s>&length=<l>',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            };
            options.path = options.path.replace(/<station>/, station);
            options.path = options.path.replace(/<s>/, start.toString());
            options.path = options.path.replace(/<l>/, length.toString());
            try {
                let page = yield downloader_1.urlGet(options).catch((err) => console.error(err));
                this.process(page);
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    // -----------------------------------------------------------
    // process the findu.com page and update the local state
    // -----------------------------------------------------------
    process(page) {
        page = page.replace(/(<.*\s?.*>)/gm, "");
        let match = page.match(/(^\S+)+/gm);
        // go through the returned values and store the new ones
        let len = this.record.length;
        let last = len > 0 ? this.record[len - 1] : { timestamp: 0 };
        let matchLength = match == null ? 0 : match.length;
        // convert the packets to objects and insert them into local array of records
        for (let i = 0; i < matchLength; i++) {
            // parse it into object
            let wxRec = wxparser_1.wxParser.parse(match[i]);
            // de dup the records and maintain order
            if (last.timestamp < wxRec.timestamp) {
                this.record.push(wxRec);
                last = wxRec;
                this.recalc = true;
            }
        }
        this.updateSummary();
    }
    // -----------------------------------------------------------
    // timeFilter - remove all records older than unixtime 
    // -----------------------------------------------------------
    timeFilter(unixTime) {
        this.record = this.record.filter((rec) => {
            return rec.timestamp > unixTime;
        });
        this.recalc = true;
    }
    updateSummary() {
        if (this.recalc == false)
            return;
        // some important definition change 
        // recalculate weather summary
        let len = this.record.length;
        if (len > 0) {
            let tempSum = 0;
            this.minTemp = 300;
            this.maxTemp = -300;
            this.record.forEach(e => {
                this.minTemp = Math.min(this.minTemp, e.temp);
                this.maxTemp = Math.max(this.maxTemp, e.temp);
                tempSum += e.temp;
            });
            this.temp = Math.round(tempSum / len * 10) / 10;
            this.minTemp = Math.round(this.minTemp * 10) / 10;
            this.maxTemp = Math.round(this.maxTemp * 10) / 10;
        }
        this.rain = this.record.length > 0 ? Math.round(this.record[len - 1].rainMidnight * 10) / 10 : 0;
        this.recalc = false;
        // this.dump();
    }
    dump() {
        let last = this.record.length - 1;
        console.log("Weather @ ", last < 0 ? "##########" : this.record[last].timestamp);
        console.log("---------------------");
        console.log("Count:", last + 1);
        console.log("Temp:", this.temp);
        console.log("Min Temp:", this.minTemp);
        console.log("Max Temp:", this.maxTemp);
        console.log("Rain:", this.rain);
    }
}
exports.wxLoader = wxLoader;
//# sourceMappingURL=wxLoader.js.map