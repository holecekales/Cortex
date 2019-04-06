var http = require('http');
import { wxParser } from "./wxparser";

// -----------------------------------------------------------
// load and parse weather from findu.com from a give station
// -----------------------------------------------------------
export class wxLoader {

  constructor() {

  }

  get(station : string) {
     // goto http://www.findu.com/cgi-bin/rawwx.cgi?call=CW5002&start=1&length=1 to get the weather data
     
     var options = {
      host: 'www.findu.com',
      path: '/cgi-bin/rawwx.cgi?call=<station>&start=1&length=1',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };

    options.path = options.path.replace(/<station>/, station);

    http.get(options, (res) => {
      res.setEncoding("utf8");
      let body : string = "";
      res.on("data", (data) => {
        body += data;
      });
      res.on("end", () => {
        this.process(body);
      });
    });
  }

  private process(page : string)
  {
    page = page.replace(/(<.*\s?.*>)/gm, "");
    let match = page.match(/(^\S+)+/gm);
    let wx = new wxParser(match[0]);
  }


}