// this xhr patch may move to {N} core some day and can be removed
require("xhr");

var xhrAddEventListenerOrig = XMLHttpRequest.prototype.addEventListener;
XMLHttpRequest.prototype.addEventListener = function(eventName, callback) {
  if (eventName === "readystatechange") {
    this.onreadystatechange = callback;
  } else if (eventName === "progress") {
    this.onprogress = callback;
  } else if (eventName === "timeout") {
    this.ontimeout = callback;
  } else {
    xhrAddEventListenerOrig.call(this, eventName, callback);
  }
};
if (!XMLHttpRequest.prototype.upload) {
  XMLHttpRequest.prototype['upload'] = {
    addEventListener: function() {}
  };
}

// a few global properties node modules may rely on
global.process = require("process/browser");
global.Buffer = require("buffer").Buffer;