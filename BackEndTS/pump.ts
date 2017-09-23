var express = require('express');
const moment = require('moment');

let router = express.Router();

var sampleData = [];

// routes
router.use('/', function (req, res, next) {
  res.status(200).json(sampleData);
});


// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {

  private socket = null;

  // constructor
  constructor() {}

  // set socket
  setSocket(s) { this.socket = s; }

  // recieve data from socket
  rcvData(data: string) {
    try {
      let obj = JSON.parse(data);

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
  }
}

module.exports = { "router": router, "pump": new Pump() };


