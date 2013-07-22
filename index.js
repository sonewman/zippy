/* jshint laxcomma: true */
module.exports = Zippy;

  //  Core
var fs = require('fs')
	, path = require('path')
	, stream = require('stream')

  //  Userland
  , Zip = require('node-zip')
  , colors = require('colors')

  //  Local
	, root = process.cwd()
  , stripEndSlash = /\/$/
  , nameFromFolder = /\/([^\/]+)\/?/
;


function Zippy (folder, zipName, options) {
  var folderCount = 0;
	if (!(this instanceof Zippy)) return new Zippy(folder, options);
  if (typeof zipName === 'object') {
    options = zipName;
  } else {
    options = options || {};
  }

  if (!zipName) {
    zipName = folder.match(nameFromFolder);
    this.name = zipName ? zipName[1] : 'untitled';
  }

	this.root = folder;
  this.throwErrors = options.throwErrors || false;

  //  create new zip object
  this._zip = Zip();

  //  initialise count variables
  this._fileCount = 0;
  this._filesScanned = 0;
  this._filesToLoad = [];
  this._folderCount = 0;

  this._preCheck = isFunc(options.preCheck) && options.preCheck;

  //  if folder passed in then walk
  if (isStr(folder)) {

    this._walk(folder, this._startLoading);

  } else if (Array.isArray(folder)) {

    this._walk(folder, function () {
      this._startLoading
    });

  }
}

Zippy.prototype._walk = function (folder, done) {
  var pending, self = this;

	fs.readdir(folder, function (err, list) {
    var files = [];

    //   if error or list is not an array
    if (err) {
      if (err && this.throwErrors) throw new Error(err);
      done.call(self, err);
      return;
    }

    //  set total pending based on length
    pending = list.length;

    //  add to folder count
    self._folderCount += 1;

    //  if length is zero
    if (!pending) {
      done.call(this);
      return;
    }

		list.forEach(function (item, i) {
      item = path.join(folder, item);

      fs.stat(item, function (err, stats) {
        // if (!stats) return console.log(item)

        if (err) {
          if (this.displayErrors) throw new Error(err);
          if (!--pending) done.call(this, err);
          return;
        }

        //  PreCheck
        if (self._preCheck && !self._preCheck(item)) return;

        //  item is file
        if (!stats || stats.isFile()) {

          self._filesScanned++;
          
          //  add file to loading queue so they can be loaded
          //  async (to avoid using too much memory)
          files.push(item);
          
          if (self.logScanned) console.log('Scanned file: '.blue, item.blue);

          // console.log(folder, item, ':', pending, '/', list.length)
          if (!--pending) done.call(self, null, files);

        //  item is a directory
        } else if (stats.isDirectory) {

          if (self.logScanned) console.log('fldr: '.yellow, item.yellow);

          //  recursively walk
          self._walk.call(self, item, function (err, dirFiles) {
            //  done callback for all recursive
            //  adds inner folders to file name array
            files = files.concat(dirFiles || []);
            if (!--pending) done.call(self, null, files);
          });
        }
      });
    });
	});
};

Zippy.prototype._startLoading = function (err, files) {
  if (err) throw new Error(err);
  if (files.length === 0) return;
  filesReversed = files.reverse();

  loadOneByOne.call(this, filesReversed, this._finished);
};

function loadOneByOne (files, done) {
  var file;
  if (file = files.pop()) {
    loadFile.call(this, file, function oneByOneCb (err) {
      // if (err) do stuff...
      if (files.length === 0) {
        done.call(this);
        return;
      }
      loadOneByOne.call(this, files, oneByOneCb);
    });
  }
}

//  loadFile state mutator
function loadFile (filePath, cb, ctx) {
  var file, self = ctx || this, buffer = [];
  if (!filePath) return;

  //  create file and stream locally, so
  //  it will be garbage collected.
  file = fs.createReadStream(filePath);

  //  on readable
  file.on('readable', function () {
    //  read file
    // console.log(self._zip.file)
    buffer.push(this.read());

    console.log('added file: '.green, filePath.green);
    self._fileCount += 1;
  });

  file.on('error', function (err) {
    console.error(filePath, ' cannot be parsed');
    cb.call(self,  err);
  });

  file.on('end', function () {
    self._zip.file(filePath, buffer.join(''));
    cb.call(self,  null);
  });

};

Zippy.prototype._finished = function () {
  var data = this._zip.generate({base64:false,compression:'DEFLATE'})
  fs.writeFile(this.name, data, 'binary', function (err) {
    if (err) throw new Error(err);
    console.log()
    console.log('Zip: ', this.name, ' complete !');
  });
};

function isFunc (func) {
  return typeof func === 'function';
}

function isStr (str) {
  return typeof str === 'string';
}