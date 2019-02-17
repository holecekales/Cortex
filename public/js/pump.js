// (hack)
// let Chart: any;
// -------------------------------------------------------------------------
// class Pump
// -------------------------------------------------------------------------
var Pump = (function () {
    function Pump() {
        this.maxLen = 3000;
        this.timeData = [];
        this.level = [];
        this.state = [];
        this.chart = null;
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
                    fill: -1,
                    label: 'Water Level',
                    yAxisID: 'waterlevel',
                    borderColor: "rgba(24, 120, 240, 1)",
                    pointBoarderColor: "rgba(24, 120, 240, 1)",
                    backgroundColor: "rgba(24, 120, 240, 0.4)",
                    pointHoverBackgroundColor: "rgba(24, 120, 240, 1)",
                    pointHoverBorderColor: "rgba(24, 120, 240, 1)",
                    data: this.level,
                    lineTension: 0
                },
                {
                    fill: false,
                    label: 'Pump State',
                    yAxisID: 'running',
                    borderColor: "rgba(255, 204, 0, 1)",
                    pointBoarderColor: "rgba(255, 204, 0, 1)",
                    backgroundColor: "rgba(255, 204, 0, 0.4)",
                    pointHoverBackgroundColor: "rgba(255, 204, 0, 1)",
                    pointHoverBorderColor: "rgba(255, 204, 0, 1)",
                    data: this.state,
                    lineTension: 0
                }
            ]
        };
        var basicOption = {
            maintainAspectRatio: true,
            title: {
                display: true,
                text: 'Realtime Monitor',
                fontSize: 24
            },
            scales: {
                xAxes: [{
                        type: "time",
                        time: {
                            displayFormats: {
                                second: 'HH:mm:ss',
                            },
                            minUnit: 'second',
                            tooltipFormat: 'HH:mm:ss',
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Time'
                        }
                    }],
                yAxes: [{
                        id: 'waterlevel',
                        type: 'linear',
                        scaleLabel: {
                            labelString: 'Water Level (cm)',
                            display: true
                        },
                        ticks: {
                            min: 13,
                            max: 25,
                            stepSize: 1
                        },
                        position: 'left',
                    }, {
                        id: 'running',
                        type: 'linear',
                        scaleLabel: {
                            labelString: 'Pump On',
                            display: false
                        },
                        position: 'right',
                        ticks: {
                            min: 0,
                            max: 1,
                            stepSize: 1
                        },
                    }]
            }
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
        this.initDiagram();
        this.initChart();
        this.getBaseData();
    };
    // -------------------------------------------------------------------------
    // close the session()
    // -------------------------------------------------------------------------
    Pump.prototype.close = function () {
        this.reset();
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
    // addData - adds one or more records
    // -------------------------------------------------------------------------
    Pump.prototype.addData = function (obj) {
        if (obj.constructor === Array) {
            for (var i = 0; i < obj.length; i++) {
                this.addRecord(obj[i]);
            }
        }
        else {
            this.addRecord(obj);
        }
        this.chart.update();
    };
    // -------------------------------------------------------------------------
    // add one record
    // -------------------------------------------------------------------------
    Pump.prototype.addRecord = function (obj) {
        try {
            this.timeData.push(obj.t * 1000);
            this.level.push(obj.l);
            this.updateDiagram(obj.l);
            // only keep no more than 50 points in the line chart
            var len = this.timeData.length;
            if (len > this.maxLen) {
                this.timeData.shift();
                this.level.shift();
            }
            if (obj.s) {
                this.state.push(obj.s);
            }
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
