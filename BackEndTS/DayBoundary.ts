import * as moment from 'moment';


// calc the timezone offset without the day light saving 
function stdTimezoneOffset(m) {
  let jan = moment([m.year(), 0, 1]);
  let jul = moment([m.year(), 6, 1]);
  return Math.max(-jan.utcOffset(), -jul.utcOffset());
}

// determine if we're in day light saving zone
function isDst(time: moment.Moment) {
  return (-time.utcOffset()) < stdTimezoneOffset(time);
}

// calculate the offset from UTC to Pacific Standard Time
// and take date light saving into consideration
function pstOff() {
  let dst = moment.utc().utcOffset(-420).local().isDST();
  // convert to pacific time (since this is where the sensor is)
  let mPstOffset = dst ? -7 : -8;
  return mPstOffset * 60;
}

export function getDateBoundary(unixTime: number) : number {
  return moment.unix(unixTime).utc().utcOffset(pstOff()).startOf('day').unix();
}



