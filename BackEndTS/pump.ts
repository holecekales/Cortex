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
  private time: number = 0;       // time of last pumping
  private interval: number = 0;   // the last interval between to pump outs 

  // 365 days of history of # of pump runs
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

    this.router.get('/time', function (req, res, next) {
      var data = {
          js: moment().format(),
          time: this.time ? moment(this.time).format() : 0,
          timeUnix: this.time,
          offset: moment().utcOffset(),
          offsetForTime: moment.unix(this.time).utcOffset()
      };
      res.status(200).json(data);
  });

    this.router.use('/', (req, res, next) => {

      let pumpInfo: any = {
        cadence: this.interval,
        time: this.time,
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

        let msg = JSON.parse(data);
        if(isUndefined(msg.reading))
        {
          // this is not the new message so just pass the data
          // but at some point we should be able to count that
          // all messages have reading
          this.rcvData(data);
        }
        else
        {
          this.rcvData(JSON.stringify(msg.reading));
        }
        
      });
      this.proxysocket.on('open', function open() {
        console.log("homecoretex opened");
      });
      this.proxysocket.on('error', (err) => {
        console.error(err);
        this.proxysocket.terminate();
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
        // store device data
        this.sampleData.push(obj);
        // if we're exceeding the maximum data that we're supposed to retain
        // we will just shift the data. maxLen is defined in terms of hour <2>
        if (this.sampleData.length > this.maxLen)
          this.sampleData.shift();          // keep only a 2 days worth of data (sending every 2s)

        // we will use this to determine day roll over.
        let histLength = this.history.length;

        // data packet
        let packet: any = {
          reading: obj,           // the reading from the device
          histUpdate: undefined,  // empty history update
          time: this.time,
          interval: this.interval
        };

        // calculate metrics 
        if (this.updateMetrics()) {
          // new day may have been added in updateMetrics (this.history.length + 1)
          packet.histUpdate = this.history[histLength - 1];
           // update time and interval
          packet.time = this.time;        
          packet.interval = this.interval;
        }

        // broadcast to all the clients (browsers)
        this.broadcast(JSON.stringify(packet), 'chart-protocol');

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
  // recordEvent - record pumpEvent into the history 
  // ------------------------------------------------------------
  recordEvent(time: number) {

    let len = this.history.length;
    let period = len == 0 ? 0 : this.history[len - 1].period;

    // snap the sample time to a day boundary
    let eventDay: number = moment.unix(time).startOf('day').unix();

    if (eventDay > period) {
      console.log(">>> Starting new period:", eventDay, "<<<")
      // we're in the next day store the stats and reset counter
      this.history.push({ period: eventDay, count: 1 });
      if (this.history.length > 365) {
        // keep data for rolling 365 days
        this.history.shift();
      }
    }
    else {
      if (this.history[len - 1].period != eventDay) {
        console.error("Mismatch of event and accumulation period:", this.history[len - 1].period, eventDay);
      }
      this.history[len - 1].count += 1;
    }
  }

  // -----------------------------------------------------------------------------
  // updateMetrics - calculates metrics:
  // * how often is pump pumping
  // * calcualte averages
  // -----------------------------------------------------------------------------
  updateMetrics(): boolean {
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
        // than the pump is pumping and we need to update metrics + record the event
        if (minRangeLevel <= 16 && maxRangeLevel >= 24) {
          // this is the time of the last device report (unix time)
          let time = this.sampleData[len - 1].t;

          // this may be the first one we're seeing.
          if (this.time > 0) {
            // The interval is in minutes. The time on the reports is Unix time 
            // and therefore in seconds -> convert to minutes by x/60 
            this.interval = Math.round((time - this.time) / 60);
            console.log("New Interval: ", this.interval);
          }
          // remember when we saw it pumping. 
          this.time = time;
          this.recordEvent(time);
          return true;
        }
      }
    }
    return false;
  }

  // ------------------------------------------------------------
  // write the state of the object to disk, just in case 
  // the service needs to be restarted
  // ------------------------------------------------------------
  writeStateToDisk() {
    let state: any = {
      version: this.fileVersion,
      current: {
        time: this.time,
        interval: this.interval,
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
        if (this.isCompatible(state.version)) {
          this.time = state.current.time;
          this.interval = state.current.interval;
          this.history = state.history;
          this.sampleData = state.sampleData;

          // this should be really obtained from the device 
          // or at least from the time service. 
          // hope the servers have the right time on them
          let now = moment().unix();

          // through out old data, since they are no more useful
          // we want to display and track only the last 2 hours.
          let len = this.sampleData.length;
          let i = 0;
          // find the point in the array when we're older than
          // 2 hours (log2 would be better)
          const sent : number = 7200; // sentinel for 2 hours in seconds

          let delItems = false;
          while ((i < len) && ((now - this.sampleData[i].t) > sent)) {
            i++;
            delItems = true;
          }

          if(delItems)
          {
            console.log("Purging:", '0 -', i, "time: ", moment.unix(this.sampleData[Math.min(i+1, len-1)].t).format());
            this.sampleData.splice(0, Math.min(i+1, len));
          }

          if (this.interval > 0) {

            let ins = this.interval * 60; // interval in seconds (unix time)

            // for debugging purposes only - so we can display the log message
            let addEventCount = Math.round((now - (this.time + ins)) / ins);
            console.log("Onload: Synthetically adding", addEventCount, "events.");

            // catch up with the down time, using the previous statistics
            // if lastInterval is set, means that prevPumpTime must be set as well!
            for (var t = (this.time + ins); t < now; t += ins) {
              console.log("Adding event at time: ", t);
              this.recordEvent(t);
            }
          }
          // if there is a risk of significantly skewing the samples
          // require lastInterval 
          let timeDiff = now - this.time;
          // 600 == 10 minutes - which is would be very short pump period
          // but if we have lastInterval already computed - we should use that
          // if we have nothing - we have to start over
          if (timeDiff > Math.max(this.interval * 60, 600)) {
            this.time = 0;
            this.interval = 0;
            console.log("Onload: time and interval stale -> reset");
          }

          // fixing up a file!
          for (let x=0; x < this.history.length; x++)
          {
            let sod = moment.unix(this.history[x].period).startOf('day').unix();
            if(this.history[x].period  != sod)
            {
              
              console.error("Period not at SOD. idx=", x, moment.unix(this.history[x].period).format(), "<- fixing");
              this.history[x].period = sod; 
            }
          }
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


