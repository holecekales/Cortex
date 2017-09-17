var express = require('express');
const http = require('http');
const WebSocket = require('ws');
const moment = require('moment');
const path = require('path');
var sPi = require('./service/motion');
var iotHubClient = require('./service/IoTHub/iot-hub');
var pump = require('./service/pump');

var app = express();



app.use(express.static('public'));

// directories on the service
app.use('/upload', express.static('upload'));
app.use('/public/', express.static('public'));

// APIs
app.use('/api/motion', sPi);

// catch all for the rest of the APIs
app.use('/api', function(req, res, next) {
    res.send('this API is not supported yet');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws, req) {
  console.log('socket connection');
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        console.log('sending data ' + data);
        client.send(data);
      } catch (e) {
        console.error('This' + e);
      }
    }
  });
};

// open the Event Hub
var connectionString = 'HostName=IoTpump.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=NgVcqeqxlrecmyehSEDp0ghE6tPhQzjjzx7qpfDdsq0=';
var consumerGroup = 'eventdatagroup'; 

// var iotHubReader = new iotHubClient(process.env['Azure.IoT.IoTHub.ConnectionString'], process.env['Azure.IoT.IoTHub.ConsumerGroup']);
var iotHubReader = new iotHubClient(connectionString, consumerGroup);
iotHubReader.startReadMessage(function (obj, date) {
  try {
    date = date || Date.now();
    let msg = JSON.stringify(Object.assign(obj, { time: moment.utc(date).format('YYYY:MM:DD[T]hh:mm:ss') }));
    console.log('socket msg: ' + msg);
    wss.broadcast(msg);
  } catch (err) {
    console.log('Error pushing message out');
    console.log(obj);
    console.error(err);
  }
});


var port = process.env.PORT || 8080;

server.listen(normalizePort(port), function () {
  console.log('Listening on port %d', server.address().port);
});

function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) { return val; }
  if (port >= 0) { return port; }
  return false;
}