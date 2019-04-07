import { urlGet } from "./downloader"
import { wxParser, wxRecord } from "./wxparser";

// -----------------------------------------------------------
// load and parse weather from findu.com from a give station
// -----------------------------------------------------------
export class wxLoader {

  private record : Array<wxRecord> = [];
  private recalc : boolean = false;  // recalculate averages
  
  // averages
  minTemp : number = 0;
  maxTemp : number = 0;
  temp    : number = 0;
  rain    : number = 0;

  // -----------------------------------------------------------
  // constructor
  // -----------------------------------------------------------
  constructor() {}

  // -----------------------------------------------------------
  // get update for given station
  // -----------------------------------------------------------
  async get(station : string, start : number = 1, length : number = 1) {
     // goto http://www.findu.com/cgi-bin/rawwx.cgi?call=CW5002&start=1&length=1 to get the weather data
     
     var options = {
      host: 'www.findu.com',
      path: '/cgi-bin/rawwx.cgi?call=<station>&start=<s>&length=<l>',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };

    options.path = options.path.replace(/<station>/, station);
    options.path = options.path.replace(/<s>/, start.toString());
    options.path = options.path.replace(/<l>/, length.toString());

    try {
      let page : string = await urlGet(options).catch((err) => console.error(err)) as string;
      this.process(page);
    }
    catch(err) {
      console.error(err);
    }
  }

  // -----------------------------------------------------------
  // process the findu.com page and update the local state
  // -----------------------------------------------------------
  private process(page : string) {
    page = page.replace(/(<.*\s?.*>)/gm, "");
    let match = page.match(/(^\S+)+/gm);
    // go through the returned values and store the new ones

    let len = this.record.length;
    let last : wxRecord = len > 0 ? this.record[len-1] :  {timestamp: 0} as wxRecord;  
    
    let matchLength = match == null ? 0 : match.length;

    // convert the packets to objects and insert them into local array of records
    for(let i=0; i < matchLength; i++) {
      // parse it into object
      let wxRec : wxRecord = wxParser.parse(match[i]);
      // de dup the records and maintain order
      if(last.timestamp < wxRec.timestamp) {
        this.record.push(wxRec);
        last = wxRec;
        this.recalc = true;
      }
    }
   
    this.updateSummary();
  }

  // -----------------------------------------------------------
  // timeFilter - remove all records older than unixtime 
  // -----------------------------------------------------------
  timeFilter(unixTime : number) {
    this.record = this.record.filter((rec)=>{
      return rec.timestamp > unixTime;
    });
    this.recalc = true;
  }

  updateSummary() {
    if(this.recalc == false) 
      return;
    
    // some important definition change 
    // recalculate weather summary
    
    let len = this.record.length;
    if(len > 0) {
      let tempSum : number = 0;
      this.minTemp  = 300;
      this.maxTemp  = -300;
      this.record.forEach(e => {
        this.minTemp = Math.min(this.minTemp, e.temp);
        this.maxTemp = Math.max(this.maxTemp, e.temp);
        tempSum += e.temp;
      });       
      this.temp = Math.round(tempSum / len * 10)   / 10;
      this.minTemp = Math.round(this.minTemp * 10) / 10;
      this.maxTemp = Math.round(this.maxTemp * 10) / 10;
    }
    this.rain = this.record.length > 0 ? this.record[len-1].rainMidnight : 0;
    this.recalc = false;
    this.dump();
  }

  dump()
  {
    let last = this.record.length - 1;
    console.log("Weather @ ", last < 0 ? "##########" : this.record[last].timestamp);
    console.log("---------------------");
    console.log("Count:", last+1);
    console.log("Temp:", this.temp);
    console.log("Min Temp:", this.minTemp);
    console.log("Max Temp:", this.maxTemp);
    console.log("Rain:", this.rain);
  } 
  
}