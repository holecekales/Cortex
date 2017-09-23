var express = require('express');
var iotHubClient = require('./IoTHub/iot-hub');
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
        if (obj.time == undefined) {
          obj["time"] = Date.now();
        }

        sampleData.push(obj);

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

  // recieve data from socket
  rcvData(data: string) {
    try {
      let obj = JSON.parse(data);

      if (obj.m == "d") {
        delete obj.m;
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


