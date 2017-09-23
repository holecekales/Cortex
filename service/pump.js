var express = require('express');
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
    // constructor
    function Pump() {
        this.socket = null;
    }
    // set socket
    Pump.prototype.setSocket = function (s) { this.socket = s; };
    // recieve data from socket
    Pump.prototype.rcvData = function (data) {
        try {
            var obj = JSON.parse(data);
            if (obj.m == "d") {
                delete obj.m;
                obj.l = 55 - obj.l; // the bucket is 55cm deep
                sampleData.push(obj);
                this.socket.broadcast(JSON.stringify(obj));
            }
        }
        catch (err) {
            console.log('Error pushing message out');
            console.log(data);
            console.error(err);
        }
    };
    return Pump;
}());
module.exports = { "router": router, "pump": new Pump() };
