var express = require('express');
const http = require('http');
const path = require('path');
var sPi = require('./service/motion');

var app = express();

app.use(express.static('public'));

// directories on the service
app.use('/upload', express.static('upload'));
app.use('/public/', express.static('public'));

// APIs
app.use('/api/motion', sPi);

const server = http.createServer(app);
var pump = require('./service/pump')({server});
app.use('/api/pump', pump.routes());

// catch all for the rest of the APIs
app.use('/api', function(req, res, next) {
    res.send('this API is not supported yet');
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