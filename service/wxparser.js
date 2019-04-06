"use strict";
// -------------------------------------------------------
// wxRecord
// -------------------------------------------------------
var wxRecord = (function () {
    function wxRecord() {
    }
    return wxRecord;
}());
exports.wxRecord = wxRecord;
// -------------------------------------------------------
// wxParser - parses one record and returns wxRecord
// -------------------------------------------------------
var wxParser = (function () {
    function wxParser() {
    }
    // -------------------------------------------------------
    // parse - root parser function
    // -------------------------------------------------------
    wxParser.parse = function (packet) {
        var wxInfo = new wxRecord();
        var msg = packet.split('@');
        var body = msg[1];
        body = this.getTimeStamp(body, wxInfo);
        body = this.getLocation(body, wxInfo);
        body = this.getWeather(body, wxInfo);
        return wxInfo;
    };
    // -------------------------------------------------------
    // getTimeStamp - parses out the timestamp from the packet
    // -------------------------------------------------------
    wxParser.getTimeStamp = function (body, wxInfo) {
        // regexp to create 5 groups
        // (DD)(hh)(mm)(z)(the rest of the string)
        var re = new RegExp(/^(\d{2})(\d{2})(\d{2})(.)(.*$)/);
        var match = re.exec(body);
        // if we found a match.
        if (match) {
            var now = new Date();
            if (match[4] == 'z') {
                // convert this into UTC Unix timestamp
                var ts = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), parseInt(match[1]), // DD
                parseInt(match[2]), // hh
                parseInt(match[3]), // mm
                0) / 1000; // ss
                wxInfo.timestamp = ts;
                // return the last group (the remainder of the body)
                return match[5];
            }
        }
        console.error("Unsupported time format!");
        return ""; // error and return empty
    };
    // -------------------------------------------------------
    // getLocation - parses out the location of the station
    // -------------------------------------------------------
    wxParser.getLocation = function (body, wxInfo) {
        // match (DD)([MM ])(.)(MM)(NS) and then the same thing for lon 
        var re = new RegExp(/^(\d{2})([0-9 ]{2}\.[0-9 ]{2})([NnSs])(?:[\/])(\d{3})([0-9 ]{2}\.[0-9 ]{2})([EeWw])(.*)$/);
        var match = re.exec(body);
        if (match) {
            // extract the numbers
            var latDeg = parseInt(match[1]);
            var latMin = parseFloat(match[2]);
            var ns = match[3];
            var lonDeg = parseInt(match[4]);
            var lonMin = parseFloat(match[5]);
            var ew = match[6];
            // convert coordinates to decimal
            wxInfo.latitude = latDeg + latMin / 60.0;
            wxInfo.longitude = lonDeg + lonMin / 60.0;
            // if we're down south we need to negate
            if (ns.toLowerCase() == 's')
                wxInfo.latitude *= -1;
            // if we're out west we need to negate
            if (ew.toLowerCase() == 'w')
                wxInfo.longitude *= -1;
            // return the rest of the packet
            return match[7];
        }
        console.error("Unsupported location format!");
        return "";
    };
    // -------------------------------------------------------
    // weatherDecoder - decode ex info
    // -------------------------------------------------------
    wxParser.weatherDecoder = function (param, wxInfo) {
        var mphTometerps = 0.44704;
        var inchTomm = 0.254; // 1/100in to mm
        console.log(param);
        // make sure that this is not param 
        // with undefined value
        if (/\.{2,}$/.test(param.substr(1)))
            return;
        switch (param[0]) {
            case "_":
                wxInfo.windDir = parseInt(param.substring(1));
                break;
            case "/":
                wxInfo.windSpeed = parseInt(param.substring(1)) * mphTometerps;
                break;
            case "t":
                wxInfo.temp = (parseFloat(param.substring(1)) - 32) / 1.8;
                break;
            case "g":
                wxInfo.windGust = parseInt(param.substring(1)) * mphTometerps;
                break;
            case "r":
                wxInfo.rain1h = parseInt(param.substring(1)) * inchTomm;
                break;
            case "p":
                wxInfo.rain24h = parseInt(param.substring(1)) * inchTomm;
                break;
            case "P":
                wxInfo.rainMidnight = parseInt(param.substring(1)) * inchTomm;
                break;
            case "h":
                wxInfo.humidity = parseInt(param.substring(1));
                break;
            case "b":
                wxInfo.pressure = parseFloat(param.substring(1)) / 10.0;
                break;
            case "l":
                wxInfo.luminosity = parseInt(param.substring(1)) + 1000;
                break;
            case "L":
                wxInfo.luminosity = parseInt(param.substring(1));
                break;
            case "s":
                wxInfo.snow = parseFloat(param.substring(1)) * 25.4;
                break;
            case "#":
                wxInfo.rainRaw = parseInt(param.substring(1));
                break;
            default:
                console.error("Unsupported wx information!");
                break;
        }
    };
    // -------------------------------------------------------
    // getWeather - parse out the weather infromation
    // -------------------------------------------------------
    wxParser.getWeather = function (body, wxInfo) {
        var e = /([_\/cSgtrpPlLs#](\d{3}|\.{3})|t-\d{2}|h(\d{2}|\.{2})|b(\d{5}|\.{5})|s(\.\d{2}|\d\.\d|\.{3}))/g;
        var last = -1;
        var match;
        while ((match = e.exec(body)) != null) {
            this.weatherDecoder(match[0], wxInfo);
            last = e.lastIndex;
        }
        if (last == -1) {
            console.error("Unsuported weather format!");
        }
        return body.substr(last);
    };
    return wxParser;
}());
exports.wxParser = wxParser;
//# sourceMappingURL=wxparser.js.map