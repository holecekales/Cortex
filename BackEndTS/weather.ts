import { wxLoader } from './wxLoader'
import { getDateBoundary } from './DayBoundary';
import * as moment from 'moment-timezone';


export class Weather {

  aprsWx  : wxLoader = new wxLoader(); 
  timerId : NodeJS.Timer   = null;
  station : string = ""; 

  // --------------------------------------------------------
  // constructor
  // --------------------------------------------------------
  constructor(station : string) { this.station = station; }

    // --------------------------------------------------------
  // filter to timestamp
  // --------------------------------------------------------
  async init(pollPeriod : number = 30) {
    let now : number = moment().unix();
    let mn : number  = getDateBoundary(now);
    // how long since midnight
    let diff = Math.min(Math.round((now - mn)/3600), 24);
    await this.getUpdate(diff);
    console.log("Polling for weather updates");
    this.startPolling(pollPeriod);
  }

  // --------------------------------------------------------
  // filter to timestamp
  // --------------------------------------------------------
  timeFilter(unixTime : number) {
    this.aprsWx.timeFilter(unixTime);
  }


  // --------------------------------------------------------
  // start and stop polling for weather updates
  // the default polling interval is 30 minutes
  // --------------------------------------------------------
  startPolling(timeout:number) {
     // every 15 minutes get weather update (30*60*1000)
     this.timerId = setInterval(() => {this.getUpdate()}, timeout*60*1000);
  }

  stopPolling() {
    if(this.timerId != null)
      clearInterval(this.timerId);
  }

  // --------------------------------------------------------
  // getUpdate (hours) hours is how far back should we be looking
  // --------------------------------------------------------
  async getUpdate(hours: number = 1) {
    console.log("Get weather update");
    await this.aprsWx.get(this.station, hours, hours);
  }

  // --------------------------------------------------------
  // summary getters
  // --------------------------------------------------------
  temp() : number { return this.aprsWx.temp;  }
  rain() : number { return this.aprsWx.rain;  }
  minTemp() : number { return this.aprsWx.minTemp;}
  maxTemp() : number { return this.aprsWx.maxTemp;}
}