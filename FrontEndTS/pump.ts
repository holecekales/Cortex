// (hacks)
let Chart: any;
let moment: any;

// -------------------------------------------------------------------------
// Interface for One Meassurement
// -------------------------------------------------------------------------

interface HistoryUpate {
  period: number;
  count: number;
};

// -------------------------------------------------------------------------
// class Pump
// -------------------------------------------------------------------------
  class Pump {

  // data rentention 
  readonly hoursOfData: number = 2; // hours worh of data that we'll be displaying
  // hoursOfData * minutes/hour * seconds/minute (but i sample only every 2 seconds so must devide by 2)  
  readonly maxLen: number = this.hoursOfData * 60 * 60 / 2; // 3600

  // pumping cadance 
  private prevPumpTime: number = 0; // when the  

  // time series
  private timeData = [];
  private level = [];
  private chart = null;


  // history chart

  private historyCount = [];
  private historyChart = null;


  // pump monitoring
  private lastUpdateTime = 0;
  private updateWatchdog: number = 0;

  // Socket
  private ws: WebSocket = null;

  // Diagram ux
  private diagramImage: HTMLImageElement;
  private diagCtx: CanvasRenderingContext2D;
  private diagramReady: boolean = false;
  private lastLevel: number = 0.1;

  constructor() { };

  // -------------------------------------------------------------------------
  // Init Chart function
  // -------------------------------------------------------------------------
  initSocket() {
    this.ws = new WebSocket('ws://' + location.host, 'chart-protocol');
    this.ws.onopen = function () {
      console.log('Successfully connect WebSocket');
    }
    this.ws.onmessage = (message) => {
      // console.log('receive message' + message.data);
      let packet = JSON.parse(message.data);
      this.addData(packet.reading);
      if(packet.histUpdate !== undefined)
        this.updateHistory(<HistoryUpate>packet.histUpdate);
      this.updateCadenceTile(packet.interval);
    }
  }

  // -------------------------------------------------------------------------
  // initDiagram
  // -------------------------------------------------------------------------
  initDiagram() {
    //Get the context of the canvas element we want to select
    this.diagramImage = new Image();

    this.diagramImage.onload = () => {

      let c = <HTMLCanvasElement>document.getElementById("diagram");
      c.width = this.diagramImage.width;
      c.height = this.diagramImage.height;

      this.diagCtx = c.getContext("2d");

      this.diagramReady = true;
      this.updateDiagram(0);
    };

    this.diagramImage.src = '/public/images/sump.png';
  }

  // -------------------------------------------------------------------------
  // Init Chart function
  // -------------------------------------------------------------------------
  initChart() {
    let data = {
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
    }

    let basicOption = {
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
        ]
      }
    }

    //Get the context of the canvas element we want to select

    Chart.defaults.global.animation.duration = 0;
    Chart.defaults.global.elements.point.radius = 0;
    Chart.defaults.global.elements.point.hitRadius = 3;
    Chart.defaults.global.elements.line.borderWidth = 1;


    this.chart = new Chart("myChart", {
      type: 'line',
      data: data,
      options: basicOption
    });

    this.chart.canvas.parentNode.style.height = '60px';

    // >>>>>>>>> setup history chart <<<<<<<<<<<<<<

    let bardata = {
      datasets: [
        {
          backgroundColor: 'rgba(0,159,199,0.4)',//, //bkgClr, //'rgba(0,159,199,0.6)',
          data: this.historyCount
        },

      ]
    }

    this.historyChart = new Chart("myChart2", {
      type: 'bar',
      data: bardata,
      options: {
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: 'time',
            // barPercentage: 0.9,
            //categoryPercentage: 0.8,
            // gridLines: {
            //   offsetGridLines: false,
            // },
            time: {
              unit: 'day', // 'month'
              stepSize: 1,
              displayFormats: {
                month: 'MMM',
                day: 'M/D'
              }
            }
          }],
          yAxes: [{
            ticks: {
              suggestedMin: 0,
              suggestedMax: 20
            }
          }]
        }
      }
    });

    this.historyChart.canvas.parentNode.style.height = '60px';

  }

  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------
  init() {
    this.initDiagram();
    this.initChart();
    this.getBaseData();
    this.updateWatchdog = window.setInterval(() => { this.luTile(); }, 1000);
  }

  // -------------------------------------------------------------------------
  // close the session()
  // -------------------------------------------------------------------------
  close() {
    this.reset();
    window.clearInterval(this.updateWatchdog);

  }

  reset() {
    this.timeData.splice(0, this.timeData.length);
    this.level.splice(0, this.level.length);
  }

  // -------------------------------------------------------------------------
  // updateDiagram
  // -------------------------------------------------------------------------
  updateDiagram(wh: number) {
    if (this.diagramReady === false)
      return;


    if (this.lastLevel == wh)
      return;

    this.lastLevel = wh;

    this.diagCtx.drawImage(this.diagramImage, 0, 0);
    this.diagCtx.globalAlpha = 0.4;
    this.diagCtx.fillStyle = 'rgb(24, 120, 240)';


    const top = 177; // top of the bucket on the diagrams in px
    const bot = 398; // bottom of the bucket on the diagram in px
    const depthInPixels = 398 - 177; // depth in pixels
    const depth = 55.0;  // depth in cm

    wh = 55 - wh;
    wh = 53.3 - wh;

    let pixelperCm = depthInPixels / depth;

    let h = wh * pixelperCm;
    let y = 398 - h;
    this.diagCtx.fillRect(115, y, 134, h);
    this.diagCtx.globalAlpha = 1.0;
  }

  // -------------------------------------------------------------------------
  // luTile - Fix the last updated tile
  // -------------------------------------------------------------------------
  luTile() {
    // timeouts for green and yellow tile
    const g = 4;  // i can miss 2 cycles to be green
    const y = 10; // i can miss 5 cycles to be yello
    // otherwise i turn red 

    // get the DOM elements for the text and the tile
    let tile = document.getElementById("lastUpdateTile");
    let tileValue = document.getElementById("lastUpdateValue");

    // current time in seconds;
    let ct = Math.floor(Date.now() / 1000);

    // the diff since we saw last update
    let diff = ct - this.lastUpdateTime;

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

    //Convert here into better units
    let u = "Seconds" // units
    let h = 0;        // hours
    let m = 0;        // minuts

    // diff contains the seconds
    if (diff > 3600) {
      // we have valid hours
      h = Math.floor(diff / 3600);
      diff -= (h * 3600);
    }
    if (diff > 60) {
      m = Math.floor(diff / 60);
      diff -= (m * 60);
    }

    let display = '';
    let fontsize = '50px';
    if (h > 0) {
      display = h.toString() + ":"
      if (h > 100) {
        fontsize = '38px';
      }
      else if (h > 10) {
        fontsize = '40px';
      }

      u = 'Hours';
    }

    if (m > 0 || h > 0) {
      if (m < 10)
        display += '0';

      display += m.toString() + ":";

      if (h == 0) {
        u = 'Minutes'
      }
    }

    if ((m > 0 || h > 0) && diff < 10)
      display += '0';

    display += diff.toString();

    // update the text in the tile
    tileValue.innerText = display;
    tileValue.style.fontSize = fontsize;

    // update the units
    let unitElem = <HTMLElement>document.querySelector("#lastUpdateTile .units");
    unitElem.innerText = u;
  }

  // -------------------------------------------------------------------------
  // Update cadence tile with the right number
  // -------------------------------------------------------------------------
  updateCadenceTile(cadence: number) {

    // update cadence only if we have successfuly calculated
    // we have to have at least 2x empty the bucket (pumping)
    if (cadence > 0) {
      let tileValue = document.getElementById("cadenceValue");
      // update the text in the tile
      tileValue.innerText = (cadence).toString();

      // calculate how many gallons a day 
      let pumpsPerDay = (60 / cadence) * 24;
      const pumpDepth: number = 0.10; // in meters
      const bucketR: number = 0.43 / 2;  // in meters
      const volume: number = bucketR * bucketR * pumpDepth * 3.14; // in m^3
      let liters: number = volume * 1000 * pumpsPerDay;
      let gallons: number = volume * 264.172 * pumpsPerDay;

      // i am using floor, since the bucket is not cylinder anyway
      let litPerDayValue = document.getElementById("litersPerDay");
      litPerDayValue.innerText = (Math.floor(liters)).toString();

      let galPerDayValue = document.getElementById("gallonsPerDay");
      galPerDayValue.innerText = (Math.floor(gallons)).toString();
    }
  }

  // -------------------------------------------------------------------------
  // addData - adds one or more records
  // -------------------------------------------------------------------------
  addData(obj: any) {

    let last = null;

    if (obj.constructor === Array) {
      for (let i = 0; i < obj.length; i++) {
        this.addRecord(obj[i]);
        last = obj[i];
      }
    }
    else {
      this.addRecord(obj);
      last = obj;
    }
    // update the dashboard elements
    // update the real-time monitor
    this.chart.update();

    // update the diagram
    this.updateDiagram(last.l);
    // update last updated tile
    this.lastUpdateTime = last.t;
  }

  // -------------------------------------------------------------------------
  // add one record
  // -------------------------------------------------------------------------
  addRecord(obj: any) {
    try {
      // convert obj.t from Unix based time to Javascript based
      // Javascript is in milliseconds while Unix is seconds
      // and push it into the array
      if (obj.m != "i") {
        // skip any object that has .m property

        this.timeData.push(obj.t * 1000);

        // store the level of water in the bucket
        this.level.push(obj.l);

        // limit the number of points 
        if (this.timeData.length > this.maxLen) {
          this.timeData.shift();
          this.level.shift();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -------------------------------------------------------------------------
  // updateHistory - update the history chart
  // -------------------------------------------------------------------------
  updateHistory(event: HistoryUpate) {

    let len = this.historyCount.length;
    // convert the time in the record to unix * 1000 (milliseconds)
    let d = event.period * 1000;

    // if this is the first sample or if the day (unix time rounded to a day)
    // is different than the last day in the array then insert new record
    if (len == 0 || this.historyCount[len - 1].x != d) {
      this.historyCount.push({ x: d, y: event.count });
    }
    else {
      // update the value of the last record by the increment
      // which is normally 1
      this.historyCount[len - 1].y = event.count;
    }
    this.historyChart.update();
  }

  // -------------------------------------------------------------------------
  // populateHistory()
  // -------------------------------------------------------------------------
  populateHistory(hist: Array<HistoryUpate>) {

    let len = hist.length;

    for (let i = 0; i < len; i++) {
      this.historyCount.push({ x: hist[i].period * 1000, y: hist[i].count });
    }

    // set the units for the chart dynamicaly - keep it interesting
    if(len < 90)
      this.historyChart.options.scales.xAxes[0].time.unit = 'day';
    else  
      this.historyChart.options.scales.xAxes[0].time.unit = 'month';

    this.historyChart.update();
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
        this.reset();
        this.addData(obj.sampleData);
        this.populateHistory(obj.history);
        // start recieving updates
        this.initSocket();
      }
    }
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Content-type', 'json');
    xhr.send();
  }
}



