/************************************************************************
 * (c) 2015, Master Technology
 * Licensed under the MIT license
 * Any questions please feel free to email me or put a issue up on github
 * Version 0.0.1
 ************************************************************************/

var FileSystemAccess = require("file-system/file-system-access").FileSystemAccess;
var FSN = require('./fs-native');

"use strict";

var fs = {
    // Node 0.12 Mode Constants
    F_OK: 0,
    X_OK: 1,
    W_OK: 2,
    R_OK: 4,

    rename: function (oldPath, newPath, callback) {
        var fa = new FileSystemAccess();
        fa.rename(oldPath, newPath, callback, callback );
    },
    renameSync: function(oldPath, newPath) {
        fs.rename(oldPath, newPath, null);
    },
    exists: function(path, callback) {
        if (fs.existsSync(path)) {
            callback(true);
        } else {
            callback(false);
        }
    },
    existsSync: function(path) {
        var fa = new FileSystemAccess();
        return fa.exists(path);
    },
    access: function(path, mode, callback) {
        if (typeof mode === 'function') {
            callback = mode;
            mode = fs.F_OK;
        }

        if (!fs._accessSync(path, mode)) {
            callback("No Access");
        } else {
            callback();
        }
    },
    accessSync: function(path, mode) {
        if (!fs._accessSync(path, mode)) {
            throw new Error("No Access");
        }
    },
    _accessSync: function(path, mode) {
        var result = FSN.access(path);

        // F_OK
        if (result === -1) return false;

        // Check the other access modes
        return ((result & mode) == mode);
    },
    unlink: function(path, callback) {
        try {
            FSN.unlink(path);
        } catch (err) {
            return callback(err);
        }
        callback();
    },
    unlinkSync: function(path) {
        try {
            FSN.unlink(path);
        }
        catch (err) {
            return false;
        }
        return true;
    },


    truncate: function(path, len, callback) {
       throw new Error("Not Implemented");
    },
    truncateSync: function(path, len) {
        fs.truncate(path, len);
    },
    chown: function(path, uid, gid, callback) {
        throw new Error("Not Implemented");
    },
    chownSync: function(path, uid, gid) {
        fs.chown(path, uid, gid);
    },
    chmod: function(path, mode, callback) {
        throw new Error("Not Implemeted");
    },
    chmodSync: function(path, mode) {
        fs.chmod(path, mode, null);
    },
    stat: function(path, callback) {
        throw new Error("Not Implemented");
    },
    statSync: function(path) {
        fs.stat(path);
    },
    openSync: function(path, options) {
      console.log("openSync not implemented, called with params: " + path + ", " + options);
      // return FSN.getFile(path);
      return null;
    },
    closeSync: function(fd) {
      console.log("closeSync not implemented, called with param: " + fd);
      // return FSN.getFile(path);
    },
    futimesSync: function(fd, atime, mtime) {
      console.log("futimesSync not implemented, called with params: " + fd + ", " + atime + ", " + mtime);
    },
    readFileSync: function(file, options) {
      console.log("readFileSync not implemented, called with params: " + file + ", " + options);
      return null;
    },
    writeFile: function(file, data) {
      console.log("writeFile not implemented, called with params: " + file + ", " + data);
      throw new Error("Not Implemeted");
    }
};

module.exports = fs;