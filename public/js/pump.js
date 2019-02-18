// (hack)
var Chart;
// -------------------------------------------------------------------------
// class Pump
// -------------------------------------------------------------------------
var Pump = (function () {
    function Pump() {
        // data rentention 
        this.hoursOfData = 2; // hours worh of data that we'll be displaying
        // hoursOfData * minutes/hour * seconds/minute (but i sample only every 2 seconds so must devide by 2)  
        this.maxLen = this.hoursOfData * 60 * 60 / 2; // 3600
        // pumping cadance 
        this.prevPumpTime = 0; // when the  
        // time series
        this.timeData = [];
        this.level = [];
        this.state = [];
        this.chart = null;
        // pump monitoring
        this.lastUpdateTime = 0;
        this.updateWatchdog = 0;
        // Socket
        this.ws = null;
        this.diagramReady = false;
        this.lastLevel = 0.1;
    }
    ;
    // -------------------------------------------------------------------------
    // Init Chart function
    // -------------------------------------------------------------------------
    Pump.prototype.initSocket = function () {
        var _this = this;
        this.ws = new WebSocket('ws://' + location.host, 'chart-protocol');
        this.ws.onopen = function () {
            console.log('Successfully connect WebSocket');
        };
        this.ws.onmessage = function (message) {
            // console.log('receive message' + message.data);
            _this.addData(JSON.parse(message.data));
        };
    };
    // -------------------------------------------------------------------------
    // initDiagram
    // -------------------------------------------------------------------------
    Pump.prototype.initDiagram = function () {
        var _this = this;
        //Get the context of the canvas element we want to select
        this.diagramImage = new Image();
        this.diagramImage.onload = function () {
            var c = document.getElementById("diagram");
            c.width = _this.diagramImage.width;
            c.height = _this.diagramImage.height;
            _this.diagCtx = c.getContext("2d");
            _this.diagramReady = true;
            _this.updateDiagram(0);
        };
        this.diagramImage.src = '/public/images/sump.png';
    };
    // -------------------------------------------------------------------------
    // Init Chart function
    // -------------------------------------------------------------------------
    Pump.prototype.initChart = function () {
        var data = {
            labels: this.timeData,
            datasets: [
                {
                    label: 'Water Level',
                    yAxisID: 'waterlevel',
                    borderColor: "rgba(24, 120, 240, 1)",
                    pointBoarderColor: "rgba(24, 120, 240, 1)",
                    backgroundColor: "rgba(24, 120, 240, 0.4)",
                    pointHoverBackgroundColor: "rgba(24, 120, 240, 1)",
                    pointHoverBorderColor: "rgba(24, 120, 240, 1)",
                    data: this.level,
                    lineTension: 0
                }
            ]
        };
        var basicOption = {
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            title: {
                display: false,
                text: 'Realtime Monitor',
                fontSize: 20
            },
            scales: {
                xAxes: [{
                        type: 'time',
                        distribution: 'linear',
                        time: {
                            displayFormats: {
                                second: 'H:mm'
                            },
                            unit: 'second',
                            tooltipFormat: 'H:mm:ss',
                            stepSize: 600,
                        },
                        scaleLabel: {
                            display: false,
                            labelString: 'Time'
                        }
                    }],
                yAxes: [{
                        id: 'waterlevel',
                        type: 'linear',
                        scaleLabel: {
                            labelString: 'Water Level (cm)',
                            display: false
                        },
                        ticks: {
                            min: 13,
                            max: 25,
                            stepSize: 3
                        },
                        position: 'left',
                    },
                ] }
        };
        //Get the context of the canvas element we want to select
        this.ctx = document.getElementById("myChart").getContext("2d");
        Chart.defaults.global.animation.duration = 0;
        Chart.defaults.global.elements.point.radius = 0;
        Chart.defaults.global.elements.point.hitRadius = 3;
        Chart.defaults.global.elements.line.borderWidth = 1;
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: data,
            options: basicOption
        });
    };
    // -------------------------------------------------------------------------
    // init
    // -------------------------------------------------------------------------
    Pump.prototype.init = function () {
        var _this = this;
        this.initDiagram();
        this.initChart();
        this.getBaseData();
        this.updateWatchdog = window.setInterval(function () { _this.luTile(); }, 1000);
    };
    // -------------------------------------------------------------------------
    // close the session()
    // -------------------------------------------------------------------------
    Pump.prototype.close = function () {
        this.reset();
        window.clearInterval(this.updateWatchdog);
    };
    Pump.prototype.reset = function () {
        this.timeData.splice(0, this.timeData.length);
        this.level.splice(0, this.level.length);
        this.state.splice(0, this.state.length);
    };
    // -------------------------------------------------------------------------
    // updateDiagram
    // -------------------------------------------------------------------------
    Pump.prototype.updateDiagram = function (wh) {
        if (this.diagramReady === false)
            return;
        if (this.lastLevel == wh)
            return;
        this.lastLevel = wh;
        this.diagCtx.drawImage(this.diagramImage, 0, 0);
        this.diagCtx.globalAlpha = 0.4;
        this.diagCtx.fillStyle = 'rgb(24, 120, 240)';
        var top = 177; // top of the bucket on the diagrams in px
        var bot = 398; // bottom of the bucket on the diagram in px
        var depthInPixels = 398 - 177; // depth in pixels
        var depth = 55.0; // depth in cm
        wh = 55 - wh;
        wh = 53.3 - wh;
        var pixelperCm = depthInPixels / depth;
        var h = wh * pixelperCm;
        var y = 398 - h;
        this.diagCtx.fillRect(115, y, 134, h);
        this.diagCtx.globalAlpha = 1.0;
    };
    // -------------------------------------------------------------------------
    // luTile - Fix the last updated tile
    // -------------------------------------------------------------------------
    Pump.prototype.luTile = function () {
        // timeouts for green and yellow tile
        var g = 4; // i can miss 2 cycles to be green
        var y = 10; // i can miss 5 cycles to be yello
        // otherwise i turn red 
        // get the DOM elements for the text and the tile
        var tile = document.getElementById("lastUpdateTile");
        var tileValue = document.getElementById("lastUpdateValue");
        // current time in seconds;
        var ct = Math.floor(Date.now() / 1000);
        // the diff since we saw last update
        var diff = ct - this.lastUpdateTime;
        if (diff <= g) {
            // all is OK
            tile.classList.remove("orange", "red");
            tile.classList.add("green");
        }
        else if (diff > g && diff <= y) {
            // we did not get an update for some time
            // go check the pump
            tile.classList.remove("green", "red");
            tile.classList.add("orange");
        }
        else {
            // we did not get an update for some time
            // alarm
            tile.classList.remove("green", "orange");
            tile.classList.add("red");
        }
        // update the text in the tile
        tileValue.innerText = diff.toString();
    };
    // -------------------------------------------------------------------------
    // Update cadence tile with the right number
    // -------------------------------------------------------------------------
    Pump.prototype.updateCadence = function (time) {
        var cadence = 0;
        if (this.prevPumpTime > 0) {
            // i am rounding up to compensate for the bucket not
            // being cylinder
            cadence = Math.round((time - this.prevPumpTime) / 60 + 0.5);
        }
        this.prevPumpTime = time;
        var tileValue = document.getElementById("cadenceValue");
        // update the text in the tile
        // let n = parseInt(tileValue.innerText);
        tileValue.innerText = (cadence).toString();
        // calculate how many gallons a day 
        var pumpsPerDay = (60 / cadence) * 24;
        var pumpDepth = 0.10; // in meters
        var bucketR = 0.43 / 2; // in meters
        var volume = bucketR * bucketR * pumpDepth * 3.14; // in m^3
        var liters = volume * 1000 * pumpsPerDay;
        var gallons = volume * 264.172 * pumpsPerDay;
        // i am using floor, since the bucket is not cylinder anyway
        var litPerDayValue = document.getElementById("litersPerDay");
        litPerDayValue.innerText = (Math.floor(liters)).toString();
        var galPerDayValue = document.getElementById("gallonsPerDay");
        galPerDayValue.innerText = (Math.floor(gallons)).toString();
    };
    // -------------------------------------------------------------------------
    // addData - adds one or more records
    // -------------------------------------------------------------------------
    Pump.prototype.addData = function (obj) {
        var last;
        if (obj.constructor === Array) {
            // we will stop one short of the end
            // with the last one we're going to update the dashboard
            for (var i = 0; i < obj.length; i++) {
                this.addRecord(obj[i]);
            }
            last = obj[obj.length - 1];
        }
        else {
            this.addRecord(obj);
            last = obj;
        }
        // update the dashboard elements
        // update the real-time monitor
        // this.chart.update();
        // update the diagram
        this.updateDiagram(last.l);
        // update last updated tile
        this.lastUpdateTime = last.t;
    };
    // -------------------------------------------------------------------------
    // add one record
    // -------------------------------------------------------------------------
    Pump.prototype.addRecord = function (obj) {
        try {
            // convert obj.t from Unix based time to Javascript based
            // Javascript is in milliseconds while Unix is seconds
            // and push it into the array
            this.timeData.push(obj.t * 1000);
            // store the level of water in the bucket
            this.level.push(obj.l);
            var len = this.timeData.length;
            // --------------------------------------------------------------------------
            // $$$ This needs to move to the server!
            // calculate if the pump kicked in
            // we look across 15 samples
            var pumpOn = 0;
            if (len >= 15) {
                var rangeFirst = len - 15;
                // 24 is the level where we typically start pumping
                // if we're at that level (or higher) and if we saw a dip going down, 
                // let's see if we went through pumping
                if (this.level[rangeFirst] >= 24 && this.level[rangeFirst + 1] < this.level[rangeFirst]) {
                    var minRangeLevel = 30;
                    var maxRangeLevel = 0;
                    // calculate min and max over our range
                    for (var i = rangeFirst; i < len; i++) {
                        minRangeLevel = Math.min(minRangeLevel, this.level[i]);
                        maxRangeLevel = Math.max(maxRangeLevel, this.level[i]);
                    }
                    // if within this range the values exceeded max (24) and min (16)
                    // than the pump was pumping 
                    if (minRangeLevel <= 16 && maxRangeLevel >= 24) {
                        pumpOn = 1;
                        this.updateCadence(obj.t);
                    }
                }
            }
            this.state.push(pumpOn);
            // --------------------------------------------------------------------------
            // limit the number of points 
            if (len > this.maxLen) {
                this.timeData.shift();
                this.level.shift();
            }
            // $$$ this needs to be reenabled 
            // if (obj.s) 
            // {
            //   this.state.push(obj.s);
            // }
            if (this.state.length > this.maxLen) {
                this.state.shift();
            }
        }
        catch (err) {
            console.error(err);
        }
    };
    // -------------------------------------------------------------------------
    // getBaseData
    // -------------------------------------------------------------------------
    Pump.prototype.getBaseData = function () {
        var _this = this;
        var url = '/api/pump';
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (e) {
            if (xhr.readyState == 4 && xhr.status == 200) {
                var obj = JSON.parse(xhr.responseText);
                _this.reset();
                _this.addData(obj);
                // start recieving updates
                _this.initSocket();
            }
        };
        xhr.open("GET", url, true);
        xhr.setRequestHeader('Content-type', 'json');
        xhr.send();
    };
    return Pump;
}());
