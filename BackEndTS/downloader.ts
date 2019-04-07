// -------------------------------------------------------------
// Very simple content downloader, which works with Promises
// and had no additional dependencies.
// Usage:
// var options {url: yourUrl, path: yourPath, headers: { 'User-Agent': 'Mozilla/5.0' }}
// urlGet(options)
//  .then(page=>{console.log(page);})
//  .catch(err=>{console.error(err);});
// -------------------------------------------------------------
export async function urlGet (options) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = options.host.startsWith('https') ? require('https') : require('http');
    const request = lib.get(options, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
};