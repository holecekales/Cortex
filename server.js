var express = require('express');
const http = require('http');
const WebSocket = require('ws');
const moment = require('moment');
const path = require('path');
var sPi = require('./motion');

var app = express();

var port = process.env.PORT || 8080;

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

app.listen(port, function () {
  console.log('Listening on port %d', port);
});