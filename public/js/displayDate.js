var DateUtils = (function() {

/**
 * Returns an array with date / time information
 * Starts with year at index 0 up to index 6 for milliseconds
 * 
 * @param {Date} date   date object. If falsy, will take current time.
 * @returns {[]}
 */

var exports = {};

exports.getDateArray = function(date) {
    date = date || new Date();
    return [
        date.getFullYear(),
        exports.pad(date.getMonth()+1, 2),
        exports.pad(date.getDate(), 2),
        exports.pad(date.getHours(), 2),
        exports.pad(date.getMinutes(), 2),
        exports.pad(date.getSeconds(), 2),
        exports.pad(date.getMilliseconds(), 2)
    ];
};

 /**
 * Pad a number with n digits
 *
 * @param {number} number   number to pad
 * @param {number} digits   number of total digits
 * @returns {string}
 */
exports.pad = function pad(number, digits) {
    return new Array(Math.max(digits - String(number).length + 1, 0)).join("0") + number;
};

/**
 * Returns nicely formatted date-time
 * @example 2015-02-10 16:01:12
 *
 * @param {object} date
 * @returns {string}
 */
exports.niceDate = function(date) {
    var d = exports.getDateArray(date);
    return d[0] + '-' + d[1] + '-' + d[2] + ' ' + d[3] + ':' + d[4] + ':' + d[5];
};

/**
 * Returns nicely formatted calendar date
 * @example 02-10-2015
 *
 * @param {object} date
 * @returns {string}
 */
exports.mmddyyyy = function(date) {
    var d = exports.getDateArray(date);
    return d[1] + '-' + d[2] + '-' + d[0]; 
}

/**
 * Returns nicely formatted calendar date
 * @example 02-10-2015
 *
 * @param {object} date
 * @returns {string}
 */
exports.yyyymmdd = function(date) {
    var d = exports.getDateArray(date);
    return d[0] + '-' + d[1] + '-' + d[2]; 
}

/**
 * Returns nicely formatted calendar date
 * @example 02-10-2015
 *
 * @param {object} date
 * @returns {string}
 */
exports.HHMMSS = function(date) {
    var d = exports.getDateArray(date);
    return d[3] + ':' + d[4] + ':' + d[5]; 
}

/**
 * Returns a formatted date-time, optimized for machines
 * @example 2015-02-10_16-00-08
 *
 * @param {object} date
 * @returns {string}
 */
exports.roboDate = function(date) {
    var d = exports.getDateArray(date);
    return d[0] + '-' + d[1] + '-' + d[2] + '_' + d[3] + '-' + d[4] + '-' + d[5];
};

 return exports;

})();