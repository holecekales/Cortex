// -------------------------------------------------------------------------
// Globals
// -------------------------------------------------------------------------
var globaleventCount = 0; // $$$ this should go away 

class Pump {

  readonly maxLen: number = 500;
  private timeoutHandle = null;
  private timeData = [];
  private temperatureData = [];
  private humidityData = [];
  private myLineChart = null;
  private ws: WebSocket = null;

  private ctx: CanvasRenderingContext2D;

  constructor() { };

  // -------------------------------------------------------------------------
  // Init Chart function
  // -------------------------------------------------------------------------
  initSocket() {
    this.ws = new WebSocket('ws://' + location.host);
    this.ws.onopen = function () {
      console.log('Successfully connect WebSocket');
    }
    this.ws.onmessage = (message) => {
      console.log('receive message' + message.data);
      this.addData(JSON.parse(message.data), true);
    }
  }

  // -------------------------------------------------------------------------
  // Init Chart function
  // -------------------------------------------------------------------------
  initChart() {
    let data = {
      labels: this.timeData,
      datasets: [
        {
          fill: -1,
          label: 'Water Level',
          yAxisID: 'waterlevel',
          borderColor: "rgba(255, 204, 0, 1)",
          pointBoarderColor: "rgba(255, 204, 0, 1)",
          backgroundColor: "rgba(255, 204, 0, 0.4)",
          pointHoverBackgroundColor: "rgba(255, 204, 0, 1)",
          pointHoverBorderColor: "rgba(255, 204, 0, 1)",
          data: this.temperatureData,
          lineTension: 0
        },
        {
          fill: false,
          label: 'Pump State',
          yAxisID: 'running',
          borderColor: "rgba(24, 120, 240, 1)",
          pointBoarderColor: "rgba(24, 120, 240, 1)",
          backgroundColor: "rgba(24, 120, 240, 0.4)",
          pointHoverBackgroundColor: "rgba(24, 120, 240, 1)",
          pointHoverBorderColor: "rgba(24, 120, 240, 1)",
          data: this.humidityData,
          lineTension: 0
        }
      ]
    }

    let basicOption = {
      maintainAspectRatio: true,
      title: {
        display: true,
        text: 'Sump Pump Real-time Data',
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
            labelString: 'Water Level (mm)',
            display: true
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
    }

    //Get the context of the canvas element we want to select
    this.ctx = (<HTMLCanvasElement>document.getElementById("myChart")).getContext("2d");

    Chart.defaults.global.animation.duration = 0;
    Chart.defaults.global.elements.point.radius = 0;
    Chart.defaults.global.elements.point.hitRadius = 3;

    Chart.defaults.global.elements.line.borderWidth = 1;


    this.myLineChart = new Chart(this.ctx, {
      type: 'line',
      data: data,
      options: basicOption
    });
  }

  init() {
    this.initChart();
    // this.initSocket();
    this.simulateData(200);
    this.handlePause();
  }

  close() {
    
  }

  // -------------------------------------------------------------------------
  // parseData new for the chart
  // -------------------------------------------------------------------------
  addData(obj, update) {
    try {

      if (!obj.time || !obj.temperature) {
        return;
      }

      // console.log(obj.time);

      this.timeData.push(obj.time);
      this.temperatureData.push(obj.temperature);
      // only keep no more than 50 points in the line chart
      let len = this.timeData.length;
      if (len > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
      }

      if (obj.humidity) {
        this.humidityData.push(obj.humidity);
      }
      if (this.humidityData.length > this.maxLen) {
        this.humidityData.shift();
      }

      if (update)
        this.myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  }


  simulateData(count) {

    let onState = false;

    let d = { "messageId": 0, "deviceId": "pumpMonitor", "temperature": 0, "humidity": 0, "time": Date.now() };

    let mt = count > 1 ? moment().subtract(count * 15, 's') : moment();

    for (let i = 0; i < count; i++) {
      d.messageId = globaleventCount;
      d.temperature = (globaleventCount % 40) * 0.75;
      d.humidity = onState ? 1 : 0.1;
      if ((globaleventCount % 40) == 0) onState = !onState;

      d.time = mt.toDate();
      mt.add(15, 's');

      this.addData(d, (i == count - 1));
      globaleventCount++;
    }

  }



  handSim() {
    this.simulateData(this.maxLen + 10);
    this.timeoutHandle = setInterval(function () {
      this.simulateData(1);
    }, 1000);
  }

  handlePause() {
    if (this.timeoutHandle) {
      clearInterval(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    else {
      this.timeoutHandle = setInterval(() => {
        this.simulateData(1);
      }, 1000);

    }
  }
}



