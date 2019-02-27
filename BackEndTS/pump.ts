var express = require('express');

const WSSocket = require('ws');
var fs = require('fs');

import * as moment from 'moment';
import { isUndefined } from 'util';

// ------------------------------------------------------------------------------------
// Pump
// ------------------------------------------------------------------------------------
class Pump {

  readonly fileVersion: string = '1.0';

  private socket = null;
  private proxysocket = null;

  // express router.
  private router = null;

  // in memory data retention
  // should be kept in sync between the client and the service
  // is define in the frontend pump.ts for the front end
  readonly retentionTime: number = 2 * 60 * 60;          // 2 hours in seconds
  readonly maxLen: number = this.retentionTime / 2; // 3600

  // variables used to calculate pump cadence and keep
  // track of the history
  private prevPumpTime: number = 0;   // time of last pumping
  private dailyPumpCount: number = 0; // how many time the pump went this day
  private lastInterval: number = 0;   // the last interval between to pump outs 

  private period: moment.Moment = undefined; // averging window (1 day)


  private history = [];

  // this array will be maxlen (2 hours) and will have all of the device samples
  // main purpose - drawing diagrams
  private sampleData = [];

  // ------------------------------------------------------------
  // construct the Pump object
  // ------------------------------------------------------------
  constructor(server) {
    // read the previous state from disk 
    // (hopefully it is still relevant)
    this.readStateFromDisk();

    // create and defined routes
    this.router = express.Router();

    // if someone calls us return all data in the last
    // 2 hours
    this.router.use('/', (req, res, next) => {

      let pumpInfo: any = {
        cadence: this.lastInterval,
        history: this.history,
        sampleData: this.sampleData,
      };
      res.status(200).json(pumpInfo);
    });

    // create socket
    this.socket = new WSSocket.Server(server);
    this.socket.on('connection', (ws, req) => {
      console.log('socket connection: ' + ws.protocol);
      let p = this;
      ws.on('message', function (msg) {
        p.rcvData(msg);
      });
    });

    // this is only for internal debugging
    // (Hacky) Workaround for environment variable for debugging
    // this is totally not awesome!!!
    if ((process.env as any).COMPUTERNAME == "BLUEBIRD") {
      console.log("DEBUGGING ON BLUEBIRD");
      this.proxysocket = new WSSocket('ws://homecortex.azurewebsites.net', 'chart-protocol');
      this.proxysocket.on('message', (data) => {
        console.log(data);
        this.rcvData(data);
      });
      this.proxysocket.on('open', function open() {
        console.log("homecoretex opened");
      });
    }
  }

  // ------------------------------------------------------------
  // recieve new reading from the device
  // ------------------------------------------------------------
  rcvData(data: string) {
    try {
      let obj = JSON.parse(data);

      if (obj.m == "d") {
        delete obj.m; // the source was device and we'll now get rid of it.
        obj.l = 55 - obj.l; // the bucket is 55cm deep -> converstion from device
      }

      if (isUndefined(obj.s) === false) {
        // the device reports state as well
        // take it off - since it is always 0 and just adds to the volume of data
        // which needs to be stored and transfered.
        delete obj.s;
      }
      //this seems like good device report
      if (isUndefined(obj.t) === false) {

        if (isUndefined(this.period)) {
          // find the day (the window for averiging)
          // this is how we store the histogram
          this.period = moment(obj.t).hours(0).minutes(0).seconds(0).milliseconds(0);
        }

        // store device data
        this.sampleData.push(obj);
        // if we're exceeding the maximum data that we're supposed to retain
        // we will just shift the data. maxLen is defined in terms of hour <2>
        if (this.sampleData.length > this.maxLen)
          this.sampleData.shift();          // keep only a 2 days worth of data (sending every 2s)

        // calculate metrics 
        this.updateMetrics();

        // broadcast to all the clients (browsers)
        this.broadcast(JSON.stringify(obj), 'chart-protocol');

        // write the state - important so we can restart the service if needed
        this.writeStateToDisk();
      }
    }
    catch (err) {
      console.log('Error pushing message out');
      console.log(data);
      console.error(err);
    }
  }

  // ------------------------------------------------------------
  // checkForDayBoundary() - if new day store stuff 
  // ------------------------------------------------------------
  checkDayBoundary(time: number) {
    // snap the sample time to a day boundary
    let day: moment.Moment = moment.unix(time).hours(0).minutes(0).seconds(0).milliseconds(0);
    if (day.isAfter(this.period)) {
      // we're in the next day store the stats and reset counter
      this.history.push({ period: this.period.unix(), count: this.dailyPumpCount });
      if (this.history.length > 365) {
        // keep data for rolling 365 days
        this.history.shift();
      }
      // remember the new day and start counting from 1
      this.dailyPumpCount = 1;
      this.period = day;
      return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------------
  // updateMetrics - calculates metrics:
  // * how often is pump pumping
  // * calcualte averages
  // -----------------------------------------------------------------------------
  updateMetrics() {
    let len: number = this.sampleData.length;
    // calculate if the pump kicked in - we need 15 values for the filter
    if (len >= 15) {
      let rangeFirst: number = len - 15;
      // 24 is the level where we typically start pumping
      // if we're at that level (or higher) and if we saw a dip going down, 
      // let's see if we went through pumping
      if (this.sampleData[rangeFirst].l >= 24 && this.sampleData[rangeFirst + 1].l < this.sampleData[rangeFirst].l) {
        let minRangeLevel = 30;
        let maxRangeLevel = 0;
        // calculate min and max over our range
        for (let i = rangeFirst; i < len; i++) {
          minRangeLevel = Math.min(minRangeLevel, this.sampleData[i].l);
          maxRangeLevel = Math.max(maxRangeLevel, this.sampleData[i].l);
        }
        // if within this range the values exceeded max (24) and min (16)
        // than the pump is pumping and we need to update metrics
        if (minRangeLevel <= 16 && maxRangeLevel >= 24) {
          // this is the time of the last device report
          let time = this.sampleData[len - 1].t;

          // this may be the first one we're seeing.
          if (this.prevPumpTime > 0) {
            // The interval is in minutes. The time on the reports is Unix time 
            // and therefore in seconds -> convert to minutes by x/60 
            this.lastInterval = Math.round((time - this.prevPumpTime) / 60);
            console.log("New Interval: ", this.lastInterval);
          }
          // remember when we saw it pumping. 
          this.prevPumpTime = time;
          this.dailyPumpCount += 1;
          this.checkDayBoundary(time);
        }
      }
    }
  }

  // ------------------------------------------------------------
  // write the state of the object to disk, just in case 
  // the service needs to be restarted
  // ------------------------------------------------------------
  writeStateToDisk() {
    let state: any = {
      version: this.fileVersion,
      current: {
        time: this.prevPumpTime,
        interval: this.lastInterval,
        period: this.period.unix(),
        count: this.dailyPumpCount,
      },
      history: this.history,
      sampleData: this.sampleData
    }

    fs.writeFile('appState.json', JSON.stringify(state), 'utf8', (err) => {
      if (err) {
        console.error('State save failed at', moment().format('YYYY-MM-DD H:mm'));
        // i don't know if i want to throw here - it will tear the service down??
      }
    });
  }


  // ------------------------------------------------------------
  // evaluate if the file is compatible with runtime
  // ------------------------------------------------------------
  isCompatible(v: string): boolean {
    return v == this.fileVersion;
  }

  // ------------------------------------------------------------
  // read the state from the disk so we can restore the operation 
  // ------------------------------------------------------------
  readStateFromDisk() {
    if (fs.existsSync('appState.json')) {
      try {
        let state: any = JSON.parse(fs.readFileSync('appState.json', 'utf8'));

        // check the version of the file if is not the same
        // then get ignore the contents
        if (this.isCompatible(state.version)) 
        {
          this.prevPumpTime = state.current.time;
          this.lastInterval = state.current.interval;
          this.period = moment.unix(state.current.period);
          this.dailyPumpCount = state.current.count;

          this.history = state.history;
          this.sampleData = state.sampleData;

          // if there is a risk of significantly skewing the samples
          // we better start over!
          let now = moment().unix();
          let timeDiff = now - this.prevPumpTime;
          // 600 == 10 minutes - which is would be very short pump period
          // but if we have lastInterval already computed - we should use that
          // if we have nothing - we have to start over
          if (timeDiff > Math.max(this.lastInterval * 60, 600)) {
            this.prevPumpTime = 0;
            this.lastInterval = 0;
          }

          if(this.checkDayBoundary(now))
          {
            // re-aquire day from the device
            this.period = undefined;
            // start counting
            this.dailyPumpCount = 0;
          }

          let msg = (isUndefined(this.period)) ? "still unknown" : this.period.format("MM/DD/YYYY H:mm:ss");
          console.log("current period: ", msg);
        }
      }
      catch (e) {
        console.error('Error reading state: ', e.message);
      }
    }
    else {
      console.warn('State file does not exist!');
    }
  }

  // ------------------------------------------------------------
  // broadcast to all of the clients (browsers)  
  // all clients are listening for updates on chart-protocol
  // ------------------------------------------------------------
  broadcast(data, protocol?: string) {
    this.socket.clients.forEach(function each(client) {
      if (client.readyState === WSSocket.OPEN) {
        try {
          // console.log('sending data ' + data);
          if (protocol === undefined || client.protocol == protocol) {
            client.send(data);
          }
        } catch (e) {
          console.error('Error notifying clients: ', e.message);
        }
      }
    });
  };


  // ------------------------------------------------------------
  // return the express router back to the app  
  // ------------------------------------------------------------
  routes() { return this.router; }
}

module.exports = (server) => { return new Pump(server); }


