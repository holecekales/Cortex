var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');
var express = require('express');
var multiparty = require('multiparty');

// create router
var router = express.Router();

// create database
var Datastore = require('nedb');
var db = new Datastore({ filename: 'datafile.db', autoload: true });

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

// routes
router.post('/', function(req, res, next) {
     var form = new multiparty.Form();
    form.request = req;
    form.parse(req, function(err, fields, files) {
        
        var len = files.upload.length;
        
        for(var i = 0; i < len; i++) { 
            var href = handleUploadedFile(files.upload[i], fields.date[0]);
            var rec = { 
                name: files.upload[i].originalFilename,
                date: fields.date[0],
                time: fields.time[0],
                path: href
            };
            
            db.insert(rec, function (err, newDoc) { }); // emptry callback - manip the doc
        }
        res.sendStatus(200);
    });
 });
 

// this just for testing 
router.use('/test', express.static(__dirname + '/public/test.html'));

router.get('/fetch/:id?', function (req, res) {
    
    if(req.params.id === undefined) {
         // return to the client which dates we have available - (and trim??)
        db.find({}).sort({ date: -1 }).exec(function(err, docs) {
            var hist = {};
            docs.forEach(function(item) {
                hist[item.date] = hist[item.date]+1 || 1;
            });
            var ok = Object.keys(hist);
            res.json(ok);
            res.end();
        });
    }
    else {
        db.find({date: req.params.id}).skip(0).exec(function (err, docs) {
            res.json(docs);
            res.end();
        }); 
    }
});

router.get('/', function(req, res) {
    // i need to deal with the query here    
    var t = req.query.time || -1;
    var d = req.query.date || new Date();
    
    // db.find({}).skip(0).limit(10).exec(function (err, docs) {
    db.find({}).skip(0).exec(function (err, docs) {    
      res.json(docs);
      res.end();
    });
});


module.exports = router;