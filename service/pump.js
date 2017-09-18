var express = require('express');
var iotHubClient = require('./IoTHub/iot-hub');
var moment = require('moment');
var router = express.Router();
var sampleData = [];

// routes
router.use('/', function (req, res, next) {
    res.status(200).json(sampleData);
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
                if (obj.t == undefined) {
                    obj["t"] = Date.now();
                }
                sampleData.push(obj);
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
