
var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');
var multiparty = require('multiparty');

var port = process.env.PORT || 8080;


/**
 * Create directory for the uploaded files

 * @param file path ./
 * @returns the file path addressable by web request 
 */
var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

/**
 * Convert file to URI

 * @param file path is local file 
 * @returns the file path addressable by web request 
 */
function fileUrl(str) {
    if (typeof str !== 'string') {
        throw new Error('Expected a string');
    }

    var pathName = str.replace(/\\/g, '/');

    // Windows drive letter must be prefixed with a slash
    if (pathName[0] !== '/') {
        pathName = '/' + pathName;
    }
    return encodeURI(pathName);
    // return encodeURI('file://'+pathName);
};

/**
 * Handle file uploading from using multipart forms object
 * Renames (moves) the file which gets created in the temp directory to 
 * a directory of the application  
 * 
 * @param file object. files comes from parsing using multiparty
 * @returns the file path addressable by web request 
 */
function handleUploadedFile(file, folder) {
    
    var filename  = file.originalFilename;
    var tmp_path = file.path;
    
    // creatw the directory structure
    mkdirSync("upload");
    var webPath = path.join('upload', folder);
    mkdirSync(webPath);   
    webPath = path.join(webPath, filename);
    var target_path = path.join(__dirname, webPath); 
    
    fs.readFile(tmp_path, function (err, data) {
        fs.writeFile(target_path, data, function (err) {
            fs.exists(tmp_path,  function (exists) {
                if(exists) {
                    fs.unlink(tmp_path, function(err) { if (err) throw err; });
                }
             });   
        });
    });
   
    return fileUrl(webPath);
}

 
/**
 * Very simple node.js webserver
 * Handles simple static routes as well POST for uploading files 
 * The default page is simple form which allows for multi file upload
 * 
 * @param 
 * @returns  
 */
http.createServer(function(req, res) {
  // parse url
  var request = url.parse(req.url, true);
  var action = request.pathname;
  console.log(req.url);
  
  // disallow non get requests
  if (req.method === 'POST') {
    if (req.url === '/api/motion') {
        // parse a file upload
        var form = new multiparty.Form();
        form.request = req;

        form.parse(req, function(err, fields, files) {
        
            res.writeHead(200, {'content-type': 'text/html'});
            res.write('<html><body>');
            
            var logStream = fs.createWriteStream('log.txt', {'flags': 'a'});
            
            var len = files.upload.length;
            for(var i = 0; i < len; i++)
            { 
                var href = handleUploadedFile(files.upload[i], fields.date[0]);
                logStream.write(fields.time + ", " + href + "\n");
                var ext = path.extname(href);
                if (ext === '.png' || ext === '.gif' || ext === '.jpg') {
                    res.write('<img src="'+href+'"><br>');
                }
                else {
                    res.write('<a href="'+href+'">'+files.upload[i].originalFilename+'</a><br>');
                }
            }
            res.end('</body></html>');
            logStream.end();

        });
        return;
    }
    res.writeHead(405, {'Content-Type': 'text/plain' });
    res.end('404 API Call Not Allowed');
    return;
  }
  
  if (req.method === 'GET') {
    // GET routes
    if (action === '/') {
       // show the upload form
        res.writeHead(200, {'content-type': 'text/html'});
        res.end(
            '<form action="/api/motion" enctype="multipart/form-data" method="post">'+
            '<input type="text" name="time"><br>'+
            '<input type="text" name="date"><br>'+
            '<input type="file" name="upload" multiple="multiple"><br>'+
            '<input type="submit" value="Upload">'+
            '</form>'
        );
        return;
    }
    
    // static (note not safe, use a module for anything serious!!)
    var filePath = path.join(__dirname, action);
    fs.exists(filePath, function (exists) {
        if (!exists) {
            // 404 missing files
            res.writeHead(404, {'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        // set the content type
        var ext = path.extname(action);
        var contentType = 'text/plain';
        if (ext === '.html') {
            contentType = 'text/html'
        }
        if (ext === '.png') {
            contentType = 'image/png'
        }
        else if (ext === '.gif') {
            contentType = 'image/gif'
        }
        else if (ext === '.jpg') {
            contentType = 'image/jpg'
        }
        else if (ext === '.ico') {
            contentType = 'image/ico'
        }
            
        res.writeHead(200, {'Content-Type': contentType });
        // stream the file
        fs.createReadStream(filePath, 'utf-8').pipe(res);
        });
  }
  else {
     res.writeHead(405, {'Content-Type': 'text/plain' });
     res.end('405 Method Not Allowed');
    return;
  }
}).listen(port);

console.log('server on listening ' + port);
 
 
 
