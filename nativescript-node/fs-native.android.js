

/**
 * Deletes a folder and sub-folders
 * @param javaPath
 * @returns {boolean} - succeeded or failed
 */
function unlinkFolder(javaPath) {
    var list = javaPath.listFiles(), javaFile, working = true;

    for (var i = 0; i < list.length && working; i++) {
        javaFile = list[i];
        if (javaFile.getCanonicalFile().isDirectory()) {
            working = unlinkFolder(javaFile);
            if (!working) break;
        }
        working = javaFile.delete();
    }
    return working;
}



var fs = {
    // Node 0.12 Constants
    F_OK: 0,
    X_OK: 1,
    W_OK: 2,
    R_OK: 4,

    canRead: function (file) {
        var javaFile = new java.io.File(path);
        return javaFile.canRead();
    },
    canWrite: function (file) {
        var javaFile = new java.io.File(path);
        return javaFile.canWrite();
    },
    canExecute: function (file) {
        var javaFile = new java.io.File(path);
        return javaFile.canExecute();
    },
    exists: function (file) {
        var javaFile = new java.io.File(path);
        return javaFile.exists();
    },
    access: function (file) {
        var javaFile = new java.io.File(path);
        if (!javaFile.exists()) return -1;

        var results = 0;
        if (javaFile.canRead()) results |= fs.R_OK;
        if (javaFile.canWrite()) results |= fs.W_OK;
        if (javaFile.canExecute()) results |= fs.X_OK;

        return results;
    },
    unlink: function(path) {
        var javaFile = new java.io.File(path);
        if (!javaFile.getCanonicalFile().isDirectory()) {
            return javaFile.delete();
        } else {
          return unlinkFolder(javaFile);
        }
    }

};

module.exports = fs;