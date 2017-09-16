var express = require('express');
const http = require('http');
const WebSocket = require('ws');
const moment = require('moment');
const path = require('path');
var sPi = require('./motion');

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


var port = process.env.PORT || 8080;

server.listen(port, function () {
  console.log('Listening on port %d', server.address().port);
});