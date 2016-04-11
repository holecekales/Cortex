var express = require('express');
var sPi = require('./motion');

var app = express();

var port = process.env.PORT || 8080;

app.use(express.static('public'));


app.use('/upload', express.static('upload'));

app.use('/public/', express.static('public'));


app.use('/api/motion', sPi);

// catch all for the rest of the APIs
app.use('/api', function(req, res, next) {
    res.send('this API is not supported yet');
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});