import * as moment from 'moment-timezone';


// calc the timezone offset without the day light saving 
function stdTimezoneOffset(m) {
  let jan = moment([m.year(), 0, 1]);
  let jul = moment([m.year(), 6, 1]);
  return Math.max(-jan.utcOffset(), -jul.utcOffset());
}

// determine if we're in day light saving zone
// function isDst(time: moment.Moment) {
//   return (-time.utcOffset()) < stdTimezoneOffset(time);
// }

function isDst(unixTime: number) {
  var _date = new Date();
  _date.setTime(unixTime * 1000);

  var _year = _date.getUTCFullYear();

  // Return false, if DST rules have been different than nowadays:
  if (_year<=1998 && _year>2099) 
    return false;

  // Calculate DST start day, it is the last sunday of March
  // >>> !!! Last Sunday is not true for US <<<
  var start_day = (31 - ((((5 * _year) / 4) + 4) % 7));
  var SUMMER_start = new Date(Date.UTC(_year, 2, start_day, 1, 0, 0));

  // Calculate DST end day, it is the last sunday of October
  var end_day = (31 - ((((5 * _year) / 4) + 1) % 7))
  var SUMMER_end = new Date(Date.UTC(_year, 9, end_day, 1, 0, 0));

  // Check if the time is between SUMMER_start and SUMMER_end
  return (_date > SUMMER_start && _date < SUMMER_end);
}



// calculate the offset from UTC to Pacific Standard Time
// and take date light saving into consideration
function pstOff(unixTime) {
  // let dst = moment.utc().utcOffset(-420).local().isDST();
  // convert to pacific time (since this is where the sensor is)
  let dst = isDst(unixTime);
  let mPstOffset = dst ? -7 : -8;
  return mPstOffset * 60;
}

export function getDateBoundary(unixTime: number) : number {
  //return moment.unix(unixTime).utcOffset(pstOff(unixTime)).startOf('day').unix();
  return moment.unix(unixTime).tz('America/Los_Angeles').startOf('day').unix();
}



