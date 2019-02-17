// (hack)
// let Chart: any;

// -------------------------------------------------------------------------
// class Pump
// -------------------------------------------------------------------------
class Pump {

  readonly maxLen: number = 3000;
  private timeData = [];
  private level = [];
  private state = [];
  private chart = null;
  private ws: WebSocket = null;

  private ctx: CanvasRenderingContext2D;
  
  private diagramImage : HTMLImageElement;
  private diagCtx: CanvasRenderingContext2D;
  private diagramReady : boolean = false;
  private lastLevel : number = 0.1;

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
      this.addData(JSON.parse(message.data));
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
    }

    let basicOption = {
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

  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------
  init() {
    this.initDiagram();
    this.initChart();
    this.getBaseData();
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
  // updateDiagram
  // -------------------------------------------------------------------------
  updateDiagram(wh : number) {
    if(this.diagramReady === false)
      return;

    if(this.lastLevel == wh)
      return;
    
    this.lastLevel = wh;

    this.diagCtx.drawImage(this.diagramImage, 0,0);
    this.diagCtx.globalAlpha = 0.4;
    this.diagCtx.fillStyle = 'rgb(24, 120, 240)';


    const top = 177; // top of the bucket on the diagrams in px
    const bot = 398; // bottom of the bucket on the diagram in px
    const depthInPixels = 398-177; // depth in pixels
    const depth = 55.0;  // depth in cm

    wh = 55 - wh;
    wh = 53.3 - wh;

    let pixelperCm = depthInPixels / depth;

    let h = wh * pixelperCm;
    let y = 398-h;  
    this.diagCtx.fillRect(115,y, 134, h);
    this.diagCtx.globalAlpha = 1.0;

  }

  // -------------------------------------------------------------------------
  // addData - adds one or more records
  // -------------------------------------------------------------------------
  addData(obj) {
    if (obj.constructor === Array) {
      for (let i = 0; i < obj.length; i++) {
        this.addRecord(obj[i]);
      }
    }
    else {
      this.addRecord(obj);
    }
    this.chart.update();
  }

  // -------------------------------------------------------------------------
  // add one record
  // -------------------------------------------------------------------------
  addRecord(obj) {
    try {
      this.timeData.push(obj.t*1000);
      this.level.push(obj.l);
      this.updateDiagram(obj.l);
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
        this.reset();
        this.addData(obj);
        // start recieving updates
        this.initSocket();
      }
    }
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Content-type', 'json');
    xhr.send();
  }

}



