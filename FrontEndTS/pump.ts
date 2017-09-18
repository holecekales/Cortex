// -------------------------------------------------------------------------
// Globals
// -------------------------------------------------------------------------
var globaleventCount = 0; // $$$ this should go away 

class Pump {

  readonly maxLen: number = 300;
  private timeoutHandle = null;
  private timeData = [];
  private level = [];
  private state = [];
  private chart = null;
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
      this.addData(JSON.parse(message.data), false);
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
          data: this.level,
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
          data: this.state,
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


    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: data,
      options: basicOption
    });
  }

  init() {
    this.initChart();
    this.getBaseData();
    this.initSocket();
  }


  // -------------------------------------------------------------------------
  // close the session()
  // -------------------------------------------------------------------------
  close() {
    this.reset();
  }

  reset() {
    this.timeData.splice(0, this.timeData.length);
    this.level.splice(0, this.level.length);
    this.state.splice(0, this.state.length);
  }

  // -------------------------------------------------------------------------
  // addData - adds one or more records
  // -------------------------------------------------------------------------
  addData(obj, reset: boolean) {

    if (reset)
      this.reset();

    if (obj.constructor === Array) {
      for (let i = 0; i < obj.length; i++) {
        this.addRecord(obj[i]);
      }
      this.chart.update();
    }
    else {
      this.addRecord(obj);
      this.chart.update();
    }
  }

  // -------------------------------------------------------------------------
  // add one record
  // -------------------------------------------------------------------------
  addRecord(obj) {
    try {
      this.timeData.push(obj.t);
      this.level.push(obj.l);
      // only keep no more than 50 points in the line chart
      let len = this.timeData.length;
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

    } catch (err) {
      console.error(err);
    }
  }

  // -------------------------------------------------------------------------
  // getBaseData
  // -------------------------------------------------------------------------
  getBaseData() {
    let url = '/api/pump';
    console.log(url);
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (e) => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        let obj = JSON.parse(xhr.responseText);
        this.addData(obj, true);
        // start recieving updates
        this.initSocket();
      }
    }
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Content-type', 'json');
    xhr.send();
  }

  // -------------------------------------------------------------------------
  // simulate data
  // -------------------------------------------------------------------------
  simulateData(count) {

    let onState = false;
    let mt = count > 1 ? moment().subtract(count * 15, 's') : moment();

    let a = new Array();

    for (let i = 0; i < count; i++) {
      let d = {};
      d['l'] = (globaleventCount % 40) * 0.75;
      d['s'] = onState ? 1 : 0;
      if ((globaleventCount % 40) == 0) onState = !onState;

      d['t'] = mt.toDate().valueOf();
      mt.add(15, 's');

      a.push(d);
      // this.addRecord(d);
      globaleventCount++;
    }

    this.addData(a, count > 1);
    this.chart.update();
  }

  handSim() {
    this.simulateData(this.maxLen + 10);
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



