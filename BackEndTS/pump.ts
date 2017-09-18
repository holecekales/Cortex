var express = require('express');
var iotHubClient = require('./IoTHub/iot-hub');
const moment = require('moment');

let router = express.Router();

// routes
router.use('/', function (req, res, next) {

  let a = [
    {"l":1333,"s":0,"t":"10:57:51"},
    {"l":1846,"s":0,"t":"10:57:53"},
    {"l":2458,"s":0,"t":"10:57:55"},
    {"l":2861,"s":1,"t":"10:57:57"},
    {"l":1346,"s":1,"t":"10:57:59"},
    {"l":1475,"s":1,"t":"10:58:01"}
    ];

  let m = JSON.stringify(a);
  res.send(m);
});


// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {

  private socket = null;
  private iotHubReader = null;



  // open the Event Hub
  readonly connectionString: string = 'HostName=IoTpump.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=NgVcqeqxlrecmyehSEDp0ghE6tPhQzjjzx7qpfDdsq0=';
  readonly consumerGroup: string = 'eventdatagroup';


  // ------------------------------------------------------------------------------------
  // constructor
  // ------------------------------------------------------------------------------------
  constructor() {
    this.iotHubReader = new iotHubClient(this.connectionString, this.consumerGroup);
    this.iotHubReader.startReadMessage((obj, date) => {
      try {
        date = date || Date.now();
        obj["time"] = moment.utc(date).format('YYYY:MM:DD[T]hh:mm:ss');
        let msg = JSON.stringify(obj);
        console.log('socket msg: ' + msg);

        if (this.socket) {
          this.socket.broadcast(msg);
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
  setSocket(s) { this.socket = s; }




}

module.exports = { "router": router, "pump": new Pump() };


