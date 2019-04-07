
// -------------------------------------------------------
// wxRecord
// -------------------------------------------------------
export class wxRecord {
  // time
  timestamp : number;     // unix time
  // location
  latitude: number;       // decimal latitude
  longitude : number;     // decimal longitude 
  // wind
  windDir : number;       // degrees
  windSpeed : number;     // m/s
  windGust: number;        // m/s
  // percipitation
  rain1h: number;         // mm
  rain24h : number;       // mm
  rainMidnight : number;  // mm
  rainRaw : number;       // 
  snow : number;          // mm
  // atmospherics
  temp : number;          // degrees celsius 
  humidity : number;      // percentage
  pressure : number;      // pressure mbar (pascal / 100)
  // sunlight
  luminosity : number;    // 

  constructor() { }
}

// -------------------------------------------------------
// wxParser - parses one record and returns wxRecord
// -------------------------------------------------------
export class wxParser {
 
  // -------------------------------------------------------
  // parse - root parser function
  // -------------------------------------------------------
  static parse(packet:string) : wxRecord {
    
    let wxInfo : wxRecord = new wxRecord();

    let msg = packet.split('@');
    let body : string = msg[1];
    body = this.getTimeStamp(body, wxInfo);
    body = this.getLocation(body, wxInfo);
    body = this.getWeather(body, wxInfo);

    return wxInfo;
  }

  // -------------------------------------------------------
  // getTimeStamp - parses out the timestamp from the packet
  // -------------------------------------------------------
  private static getTimeStamp(body : string, wxInfo : wxRecord) :string {
    // regexp to create 5 groups
    // (DD)(hh)(mm)(z)(the rest of the string)
    let re = new RegExp(/^(\d{2})(\d{2})(\d{2})(.)(.*$)/);
    let match = re.exec(body);
    // if we found a match.
    if(match) {
      let now = new Date();
      if(match[4] == 'z') {
        // convert this into UTC Unix timestamp
        let ts = Date.UTC(now.getUTCFullYear(), 
                          now.getUTCMonth(), 
                          parseInt(match[1]), // DD
                          parseInt(match[2]), // hh
                          parseInt(match[3]), // mm
                          0) / 1000;          // ss
        wxInfo.timestamp = ts;
        // return the last group (the remainder of the body)
        return match[5];
      }      
    }
    console.error("Unsupported time format!");
    return "";  // error and return empty
  }

  // -------------------------------------------------------
  // getLocation - parses out the location of the station
  // -------------------------------------------------------
  private static getLocation(body : string, wxInfo : wxRecord) :string {
    // match (DD)([MM ])(.)(MM)(NS) and then the same thing for lon 
    let re = new RegExp(/^(\d{2})([0-9 ]{2}\.[0-9 ]{2})([NnSs])(?:[\/])(\d{3})([0-9 ]{2}\.[0-9 ]{2})([EeWw])(.*)$/);
    let match = re.exec(body);
    if(match) {
      // extract the numbers
      let latDeg = parseInt(match[1]);
      let latMin = parseFloat(match[2]);
      let ns     = match[3];
      let lonDeg = parseInt(match[4]);
      let lonMin = parseFloat(match[5]);
      let ew     = match[6];

      // convert coordinates to decimal
      wxInfo.latitude  = latDeg + latMin / 60.0;
      wxInfo.longitude = lonDeg + lonMin / 60.0;

      // if we're down south we need to negate
      if(ns.toLowerCase() == 's')
        wxInfo.latitude *= -1;
      
      // if we're out west we need to negate
      if(ew.toLowerCase() == 'w')
        wxInfo.longitude *= -1;
     
      // return the rest of the packet
      return match[7];
    }
    console.error("Unsupported location format!");
    return "";
  }

  // -------------------------------------------------------
  // weatherDecoder - decode ex info
  // -------------------------------------------------------
  private static weatherDecoder(param : string, wxInfo : wxRecord)
  {
    const mphTometerps : number = 0.44704;
    const inchTomm : number = 0.254 // 1/100in to mm

    //console.log(param);

    // make sure that this is not param 
    // with undefined value
    if(/\.{2,}$/.test(param.substr(1)))
      return;

    switch(param[0]) {
      case "_": // wind direction
        wxInfo.windDir = parseInt(param.substring(1));
      break;
      case "/": // wind speed
        wxInfo.windSpeed = parseInt(param.substring(1)) * mphTometerps;
      break;
      case "t": 
        wxInfo.temp = (parseFloat(param.substring(1)) - 32) / 1.8;
      break;
      case "g": // wind gusts
        wxInfo.windGust = parseInt(param.substring(1)) * mphTometerps;
      break;
      case "r": // rain 1 hour
        wxInfo.rain1h = parseInt(param.substring(1)) * inchTomm;
      break;
      case "p": // rain last 24 hours
        wxInfo.rain24h = parseInt(param.substring(1)) * inchTomm;
      break;
      case "P": // rain since midnight
        wxInfo.rainMidnight = parseInt(param.substring(1)) * inchTomm;
      break;
      case "h": // humidity
        wxInfo.humidity = parseInt(param.substring(1));
      break;
      case "b": // pressure
        wxInfo.pressure = parseFloat(param.substring(1)) / 10.0;
      break;
      case "l": // luminosity
        wxInfo.luminosity = parseInt(param.substring(1)) + 1000;
      break;
      case "L": // luminosity
        wxInfo.luminosity = parseInt(param.substring(1));
      break;
      case "s": // snow
        wxInfo.snow = parseFloat(param.substring(1)) * 25.4;
      break;
      case "#": // rainRaw
        wxInfo.rainRaw = parseInt(param.substring(1));
      break;
      default:
        console.error("Unsupported wx information!");
      break;
    }
  }


  // -------------------------------------------------------
  // getWeather - parse out the weather infromation
  // -------------------------------------------------------
  private static getWeather(body : string, wxInfo : wxRecord) :string {
    let e = /([_\/cSgtrpPlLs#](\d{3}|\.{3})|t-\d{2}|h(\d{2}|\.{2})|b(\d{5}|\.{5})|s(\.\d{2}|\d\.\d|\.{3}))/g
    let last = -1;
    let match : Array<string>;
    while((match = e.exec(body)) != null) {
      this.weatherDecoder(match[0], wxInfo);
      last = e.lastIndex;
    }

    if(last == -1) {
      console.error("Unsuported weather format!");
    }
    return body.substr(last);
  }
}