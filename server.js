var express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
var sPi = require('./service/motion');
var pumpRoutes = require('./service/pump').router;
var pump = require('./service/pump').pump;

var app = express();

app.use(express.static('public'));

// directories on the service
app.use('/upload', express.static('upload'));
app.use('/public/', express.static('public'));

// APIs
app.use('/api/motion', sPi);
app.use('/api/pump', pumpRoutes);

// catch all for the rest of the APIs
app.use('/api', function(req, res, next) {
    res.send('this API is not supported yet');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

pump.setSocket(wss);

wss.on('connection', function connection(ws, req) {
  console.log('socket connection');
  ws.on('message', function(msg) {
    pump.rcvData(msg);
  });
  
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