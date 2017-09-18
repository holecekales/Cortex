var express = require('express');
var iotHubClient = require('./IoTHub/iot-hub');
var moment = require('moment');
var router = express.Router();
// routes
router.use('/', function (req, res, next) {
    var a = [
        { "l": 1333, "s": 0, "t": "10:57:51" },
        { "l": 1846, "s": 0, "t": "10:57:53" },
        { "l": 2458, "s": 0, "t": "10:57:55" },
        { "l": 2861, "s": 1, "t": "10:57:57" },
        { "l": 1346, "s": 1, "t": "10:57:59" },
        { "l": 1475, "s": 1, "t": "10:58:01" }
    ];
    var m = JSON.stringify(a);
    res.send(m);
});
// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
var Pump = (function () {
    // ------------------------------------------------------------------------------------
    // constructor
    // ------------------------------------------------------------------------------------
    function Pump() {
        var _this = this;
        this.socket = null;
        this.iotHubReader = null;
        // open the Event Hub
        this.connectionString = 'HostName=IoTpump.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=NgVcqeqxlrecmyehSEDp0ghE6tPhQzjjzx7qpfDdsq0=';
        this.consumerGroup = 'eventdatagroup';
        this.iotHubReader = new iotHubClient(this.connectionString, this.consumerGroup);
        this.iotHubReader.startReadMessage(function (obj, date) {
            try {
                date = date || Date.now();
                obj["time"] = moment.utc(date).format('YYYY:MM:DD[T]hh:mm:ss');
                var msg = JSON.stringify(obj);
                console.log('socket msg: ' + msg);
                if (_this.socket) {
                    _this.socket.broadcast(msg);
                }
            }
            catch (err) {
                console.log('Error pushing message out');
                console.log(obj);
                console.error(err);
            }
        });
    }
    // set socket
    Pump.prototype.setSocket = function (s) { this.socket = s; };
    return Pump;
}());
module.exports = { "router": router, "pump": new Pump() };
