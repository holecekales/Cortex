var express = require('express');
const WSSocket = require('ws');
var fs = require('fs');


// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {

  private socket = null;
  private proxysocket = null; 

  private router = null;

  // in memory data retention
  // should be kept in sync between the client and the service
  // is define in the frontend pump.ts for the front end
  readonly hoursOfData : number = 2; // hours worh of data that we'll be displaying
  // hoursOfData * minutes/hour * seconds/minute (but i sample only every 2 seconds so must devide by 2)  
  readonly maxLen: number = this.hoursOfData * 60 * 60 / 2; // 3600

  // this array will be thi maxlen big
  private sampleData = [];

  // constructor
  constructor(server) {

    // create and defined routes
    this.router = express.Router();
    this.router.use('/', (req, res, next) => {
      res.status(200).json(this.sampleData);
    });

    // create socket
    this.socket = new WSSocket.Server(server);
    this.socket.on('connection', (ws, req) => {
      console.log('socket connection: ' + ws.protocol);
      let p = this;
      ws.on('message', function(msg) {
        p.rcvData(msg);
      });
    });

    // this is only for internal debugging
    // (Hacky) Workaround for environment variable for debugging
    // this is totally not awesome!!!
    if((process.env as any).COMPUTERNAME == "BLUEBIRD")
    {
      console.log("DEBUGGING ON BLUEBIRD");
      this.sampleData = JSON.parse(fs.readFileSync('data.json', 'utf8'));

      this.proxysocket = new WSSocket('ws://homecortex.azurewebsites.net', 'chart-protocol');
      this.proxysocket.on('message', (data) => {
        console.log(data);
        this.rcvData(data);
      });
      this.proxysocket.on('open', function open() {
        console.log("homecoretex opened");
      });
    }

  }

  // recieve data from socket
  rcvData(data: string) {
    try {
      let obj = JSON.parse(data);

      if (obj.m == "d") 
      {
        delete obj.m; // the source was device and we'll now get rid of it.
        obj.l = 55 - obj.l; // the bucket is 55cm deep -> converstion from device
      }
       
      this.sampleData.push(obj);

      // if we're exceeding the maximum data that we're supposed to retain
      // we will just shift the data. maxLen is defined in terms of hour <2>
      if(this.sampleData.length > this.maxLen)
        this.sampleData.shift();          // keep only a 2 days worth of data (sending every 2s)
      
        this.broadcast(JSON.stringify(obj), 'chart-protocol');
    }
    catch (err) {
      console.log('Error pushing message out');
      console.log(data);
      console.error(err);
    }
  }

  // Broadcast to all.
  broadcast(data, protocol? :string) {
    this.socket.clients.forEach(function each(client) {
      if (client.readyState === WSSocket.OPEN) {
        try {
          // console.log('sending data ' + data);
          if(protocol === undefined || client.protocol == protocol) {
            client.send(data);
          }
        } catch (e) {
          console.error('This' + e);
        }
      }
    });
  };

  routes() { return this.router; }

}

module.exports = (server) => { return new Pump(server); }


