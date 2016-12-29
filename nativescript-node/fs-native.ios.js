var fs = {
    // Node 0.12 Constants
    F_OK: 0,
    X_OK: 1,
    W_OK: 2,
    R_OK: 4,

  canRead: function (file) {
    throw new Error("Not Implemeted");
  },
  canWrite: function (file) {
    throw new Error("Not Implemeted");
  },
  canExecute: function (file) {
    throw new Error("Not Implemeted");
  },
  exists: function (file) {
    throw new Error("Not Implemeted");
  },
  access: function (file) {
    throw new Error("Not Implemeted");
  },
  unlink: function(path) {
    throw new Error("Not Implemeted");
  }
};

module.exports = fs;