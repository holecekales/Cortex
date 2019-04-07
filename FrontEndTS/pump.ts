// (hacks)
let Chart: any;
let moment: any;

// -------------------------------------------------------------------------
// Interface for One Meassurement
// -------------------------------------------------------------------------

interface HistoryUpate {
  period: number;
  count: number;
  temp: number;
  rain: number;
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
  private total365 = 0;

  // weather chart
  private timeLine = [];
  private rainData = [];
  private tempData = [];
  private wxChart  = null;

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

  private unitSelector : number = 0;

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
      this.updateMonTitle(packet.time)
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
          borderColor: "rgba(130, 130, 130, 0.8)",
          backgroundColor: "rgba(120, 120, 120, 0.4)",
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
      },
      tooltips: {
        // Disable the on-canvas tooltip
        enabled: false,
      },
      elements: {
        point: {
          radius: 0,
          hitRadius: 0
        },
        line: {
          borderWidth: 1
        },

      }
    }

    //Get the context of the canvas element we want to select
    Chart.defaults.global.animation.duration = 0;
    
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
            barPercentage: 0.95,
            categoryPercentage: 0.8,
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
        },
        tooltips: {
          // Disable the on-canvas tooltip
          enabled: true,
          mode: 'index',
          callbacks: {
            label: (tooltipItem, data) => {
              return tooltipItem.yLabel + " => " + this.getVolume(tooltipItem.yLabel) + " " + this.getUnitDesctiption(true);
            },
            title: function(tooltipItem, data) {
              return moment(tooltipItem[0].xLabel, "MMM DD YYYY").format("MMMM D") ;
            } 
          }
        }
      }
    });
    this.historyChart.canvas.parentNode.style.height = '60px';

    // >>>>>>>>> setup weather chart <<<<<<<<<<<<<<

    let wxChardata = {
      labels: this.timeLine,
      datasets: [
        {
          label: "Rainfall",
          backgroundColor: "rgba(24, 120, 250, 0.4)",
          data: this.rainData,
          yAxisID: "rain"
        },
        {
          label: "Temperature",
          data: this.tempData,
          type: 'line',
          yAxisID: "temp",
          pointRadius: 0,
          pointHoverRadius: 0,
          lineTension: 0.4,
          fill: false,
          borderColor: "rgba(180, 67, 255, 0.9)",
          borderWidth: 2
        }
      ]
    }

    let wxChartOptions = {
      type: 'bar',
      data: wxChardata,
      options: {
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: 'time',
            barPercentage: 0.95,
            categoryPercentage: 0.8,
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
            position: "right",
            id: "rain",
            ticks: {
              suggestedMin: 0,
              suggestedMax: 5 
            }
          
          },
          {
            position: "left",
            id: "temp",
            ticks: {
              suggestedMin: 0,
              suggestedMax: 20
            }
          }]
        },
        tooltips :{
          enabled: true,
          intersect: false,
          mode: 'index',
          callbacks: {
            label: (tooltipItem, data) => {
              let label : string =  data.datasets[tooltipItem.datasetIndex].label + ": " + tooltipItem.yLabel + " ["
              if(tooltipItem.datasetIndex == 0) {
                label += 'mm]';
              }
              else {
                label += '\u00B0C]';
              }
              return label;
            }
          }
        },
        }
      }
    
    this.wxChart = new Chart("wxChart", wxChartOptions);
    this.wxChart.canvas.parentNode.style.height = '60px';
  }

  
  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------
  init() {
    this.initDiagram();
    this.initChart();
    this.getBaseData();
    this.updateWatchdog = window.setInterval(() => { this.luTile(); }, 1000);
    
    // register the unit switcher
    let elem = document.querySelector("#seven");
    elem.addEventListener('click', (event) =>{
      this.switchUnits();     
    });

    elem = document.querySelector("#three");
    elem.addEventListener('click', (event) =>{
      this.switchUnits();     
    });

    elem = document.querySelector("#total365");
    elem.addEventListener('click', (event) =>{
      this.switchUnits();     
    });

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

    let txtX = 123;
    let txtY = 240;

    this.diagCtx.fillStyle = 'rgb(60, 60, 60)'; //'rgb(60, 60, 60)';
    this.diagCtx.textAlign = 'left'; //'center'; 
    this.diagCtx.font = "bold 18px/1 sans-serif ";
    this.diagCtx.fillText(Math.round(this.lastLevel).toString() + "cm", txtX+15, txtY);

    this.diagCtx.beginPath();
    this.diagCtx.arc(txtX, y, 2, 0, Math.PI * 2); // circle
    this.diagCtx.fill();

    this.diagCtx.beginPath();
    this.diagCtx.moveTo(txtX, y);
    this.diagCtx.lineTo(txtX, txtY + 3);
    this.diagCtx.lineTo(txtX+61, txtY + 3);
    this.diagCtx.stroke();

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
  // switchUnits (si/m3/l)
  // -------------------------------------------------------------------------
  switchUnits()
  {
    this.unitSelector  =  (this.unitSelector + 1) % 2;
    // call some updates
    let len = this.historyCount.length;
    if(len > 0) {
      this.updateDailyTotalTile(this.historyCount[len-1].y);
    }
    let tileValue = document.getElementById("cadenceValue");
    if(tileValue)
    {
      // update the text in the tile
      let cadence = parseInt(tileValue.innerText); 
      this.updateCadenceTile(cadence);
    }
  }

  getActiveUnits() 
  {
    switch(this.unitSelector)
    {
      case 0: return "l";
      case 1: return "g";
    }

    return "m";
  }

  getUnitDesctiption(textOnly : boolean) {
    switch(this.unitSelector)
    {
      case 0: return "Liters";
      case 1: return "Gallons";
    }
    return "Meter" + (textOnly ? "^3" : "<sup>3</sup>");
  } 

  // -------------------------------------------------------------------------
  // getVolume
  // -------------------------------------------------------------------------
  getVolume(pumpCount: number) {
    const pumpDepth: number = 0.10; // in meters
    const bucketR: number = 0.43 / 2;  // in meters
    const volume: number = bucketR * bucketR * pumpDepth * 3.14; // in m^3
    
    switch(this.unitSelector) {
      case 0: return Math.floor(volume * pumpCount * 1000);       // liters 
      case 1: return Math.floor(volume * pumpCount * 264.172);    // gallons
    }

    // just return cube meters
    return Math.round(volume * pumpCount * 1000) / 1000 ;
  }

  // -------------------------------------------------------------------------
  // update daily estimate
  // -------------------------------------------------------------------------
  updateDailyEstimate(pumpsPerDay : number)
  {
    let volume: number    = this.getVolume(pumpsPerDay);
    let litPerDayValue = document.getElementById("dailyEstimate");
    litPerDayValue.innerText = volume.toString();
    let unitsDiv = document.querySelector("#dailyEstimate + .units");
    unitsDiv.innerHTML = this.getUnitDesctiption(false); 
  }

  // -------------------------------------------------------------------------
  // Update pumpOutTile
  // -------------------------------------------------------------------------
  updateTotal365(val : number) {
    let totalSpan = document.querySelector("#total365");
    let totalHidden = document.querySelector("#total365Hidden");
    let str  = "Total: " + val + " " + this.getUnitDesctiption(true); 
    totalSpan.innerHTML = str; 
    totalHidden.innerHTML = str;
  }

  // -------------------------------------------------------------------------
  // Update pumpOutTile
  // -------------------------------------------------------------------------
  updateDailyTotalTile (pumpsPerDay : number)
  {
    let gallons: number   = this.getVolume(pumpsPerDay);
    let galPerDayValue = document.getElementById("gallonsPerDay");
    galPerDayValue.innerText = gallons.toString();
    let unitsDiv = document.querySelector("#gallonsPerDay + .units");
    unitsDiv.innerHTML = this.getUnitDesctiption(false); 
    // also update the 365 total
    this.updateTotal365(this.getVolume(this.total365));
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
      this.updateDailyEstimate(pumpsPerDay);
    }
  }

  // -------------------------------------------------------------------------
  // update the time of the last pumpout in the monitoring tile
  // -------------------------------------------------------------------------
  updateMonTitle(time : number) {
    let title = <HTMLElement>document.querySelector('#updateTime > span');
    title.innerText = moment.unix(time).format('HH:mm');
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
    if (len == 0 || this.historyCount[len - 1].x < d) {
      this.historyCount.push({ x: d, y: event.count });
      this.rainData.push(d);
      this.rainData.push(event.rain === undefined ? 0 : event.rain);
      this.tempData.push(event.temp === undefined ? 0 : event.temp);
    }
    else {
      // update the value of the last record by the increment
      // which is normally 1
      this.historyCount[len - 1].y = event.count;
      this.rainData[len - 1] = event.rain;
      this.tempData[len - 1] = event.temp;
    }

    this.total365 += event.count;
    this.updateDailyTotalTile(event.count);

    this.historyChart.update();
    this.wxChart.update();
  }

  // -------------------------------------------------------------------------
  // populateHistory()
  // -------------------------------------------------------------------------
  populateHistory(hist: Array<HistoryUpate>) {

    let len = hist.length;
    for (let i = 0; i < len; i++) {
      this.historyCount.push({ x: hist[i].period * 1000, y: hist[i].count });
      
      // getting weather data ready
      this.timeLine.push(hist[i].period * 1000);
      this.rainData.push(hist[i].rain === undefined ? 0 : hist[i].rain);
      this.tempData.push(hist[i].temp === undefined ? 0 : hist[i].temp);
      
      // calculate total
      this.total365 += hist[i].count;
    }

    // set the units for the chart dynamicaly - keep it interesting
    if(len > 30 && len < 90)
    {
      this.historyChart.options.scales.xAxes[0].time.stepSize = 2;
      this.wxChart.options.scales.xAxes[0].time.stepSize = 2;
    }
    if(len < 90) {
      this.historyChart.options.scales.xAxes[0].time.unit = 'day';
      this.wxChart.options.scales.xAxes[0].time.unit = 'day';
    }
    else {  
      this.historyChart.options.scales.xAxes[0].time.unit = 'month';
      this.wxChart.options.scales.xAxes[0].time.unit = 'month';
    }

    if(len > 0)
    {  
      let pumpsPerDay = hist[len-1].count;
      this.updateDailyTotalTile(pumpsPerDay);
    }

    this.historyChart.update();
    this.wxChart.update();
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



