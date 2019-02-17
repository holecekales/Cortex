var express = require('express');
const WSSocket = require('ws');


// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {

  private socket = null;


  private proxysocket = null; 

  private router = null;
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
      console.log("BLUEBIRD");
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
      if(this.sampleData.length > 86400)
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

// module.exports = { "router": router, "pump": new Pump() };

module.exports = (server) => { return new Pump(server); }


