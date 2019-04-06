"use strict";
var http = require('http');
var wxparser_1 = require("./wxparser");
// -----------------------------------------------------------
// load and parse weather from findu.com from a give station
// -----------------------------------------------------------
var wxLoader = (function () {
    function wxLoader() {
        this.record = [];
    }
    wxLoader.prototype.get = function (station) {
        // goto http://www.findu.com/cgi-bin/rawwx.cgi?call=CW5002&start=1&length=1 to get the weather data
        var _this = this;
        var options = {
            host: 'www.findu.com',
            path: '/cgi-bin/rawwx.cgi?call=<station>&start=1&length=1',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        options.path = options.path.replace(/<station>/, station);
        http.get(options, function (res) {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                _this.process(body);
            });
        });
    };
    wxLoader.prototype.process = function (page) {
        var _this = this;
        page = page.replace(/(<.*\s?.*>)/gm, "");
        var match = page.match(/(^\S+)+/gm);
        match.forEach(function (rec) { _this.record.push(wxparser_1.wxParser.parse(rec)); });
    };
    return wxLoader;
}());
exports.wxLoader = wxLoader;
//# sourceMappingURL=wxLoader.js.map