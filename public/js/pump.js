// -------------------------------------------------------------------------
// Globals
// -------------------------------------------------------------------------
var globaleventCount = 0; // $$$ this should go away 
var Pump = (function () {
    function Pump() {
        this.maxLen = 3000;
        this.timeoutHandle = null;
        this.timeData = [];
        this.level = [];
        this.state = [];
        this.chart = null;
        this.ws = null;
    }
    ;
    // -------------------------------------------------------------------------
    // Init Chart function
    // -------------------------------------------------------------------------
    Pump.prototype.initSocket = function () {
        var _this = this;
        this.ws = new WebSocket('ws://' + location.host);
        this.ws.onopen = function () {
            console.log('Successfully connect WebSocket');
        };
        this.ws.onmessage = function (message) {
            console.log('receive message' + message.data);
            _this.addData(JSON.parse(message.data));
        };
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
                text: 'Sump Pump Monitor',
                fontSize: 36
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
                            min: 4,
                            max: 40,
                            stepSize: 2
                        },
                        position: 'left',
                    }, {
                        id: 'running',
                        type: 'linear',
                        scaleLabel: {
                            labelString: 'Pump On',
                            display: true
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
    Pump.prototype.init = function () {
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
