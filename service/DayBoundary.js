"use strict";
var moment = require('moment');
// calc the timezone offset without the day light saving 
function stdTimezoneOffset(m) {
    var jan = moment([m.year(), 0, 1]);
    var jul = moment([m.year(), 6, 1]);
    return Math.max(-jan.utcOffset(), -jul.utcOffset());
}
// determine if we're in day light saving zone
function isDst(time) {
    return -time.utcOffset() < stdTimezoneOffset(time);
}
// calculate the offset from UTC to Pacific Standard Time
// and take date light saving into consideration
function pstOff(time) {
    var mPstOffset = isDst(time) ? -7 : -8;
    return mPstOffset * 60;
}
function getDateBoundary(unixTime) {
    var m = moment.unix(unixTime);
    return moment.unix(unixTime).utc().utcOffset(pstOff(m)).startOf('day').unix();
}
exports.getDateBoundary = getDateBoundary;
