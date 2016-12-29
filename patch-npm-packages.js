function log(what) {
  // console.log(what);
}

var shims = require('./shims.json');

// never touch these, for performance reasons
var blacklist = [
  "tns-core-modules",
  "nativescript-nodeify/node_modules/replace-in-file"
];

// and don't touch these as their browser implementation is actually less {N} compatible than the default
blacklist.push("form-data");

var fs = require('fs'),
    path = require('path'),
    replaceInFile = require('replace-in-file');

function changeFiles(files, replace, by) {
  var changedFiles = replaceInFile.sync({
    files: files,
    replace: replace,
    with: by,
    allowEmptyPaths: true
  });
  if (changedFiles.length > 0) {
    log("\nReplaced '" + replace + "' by '" + by + "' in:\n " + changedFiles.join('\n '));
  }
}

function findFilesByName(startPath, filter, result) {
  if (fs.existsSync(startPath)) {
    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
      var filename = files[i];
      var filepath = path.join(startPath, filename);
      var stat = fs.lstatSync(filepath);
      if (stat.isDirectory() && filename !== "test" && filename !== "example") {
        findFilesByName(filepath, filter, result);
      } else if (filename === filter) {
        result.push(startPath);
      }
    }
  }
  return result;
}

function patchPackageJsonAndFetchBrowserNode(fileName, file, nodeCompatPatchNode) {
  var main = file.main;
  var browser = file.browser;
  var patched = false;
  if (main && browser) {
    var mainReplacement = typeof browser === "object" ? browser[main] : browser;
    if (mainReplacement) {
      log("\n" + fileName + "'s main ('" + main + "') was replaced by its browser version ('" + mainReplacement + "')");
      file.main = mainReplacement;
      patched = true;
    }
  }
  if (file.dependencies && nodeCompatPatchNode != {}) {
    for (var dep in file.dependencies) {
      if (file.dependencies.hasOwnProperty(dep) && nodeCompatPatchNode.hasOwnProperty(dep)) {
        file.dependencies[nodeCompatPatchNode[dep]] = "*";
        delete file.dependencies[dep];
        patched = true;
      }
    }
  }

  if (patched) {
    fs.writeFileSync(fileName, JSON.stringify(file, null, 2));
  }
  return browser;
}

function patchPackage(packagepath, nodeCompatPatchNode) {
  var patchInPackageJson = Object.assign({}, shims);
  patchInPackageJson = Object.assign(patchInPackageJson, nodeCompatPatchNode);

  var fileName = packagepath + "/package.json";
  var file = require(fileName);
  if (blacklist.indexOf(file.name) > -1) {
    return;
  }

  var browserNode = patchPackageJsonAndFetchBrowserNode(fileName, file, patchInPackageJson) || {};
  var patchMe = Object.assign({}, shims);
  if (typeof browserNode === "object") {
    patchMe = Object.assign(patchMe, browserNode);
  }
  patchMe = Object.assign(patchMe, nodeCompatPatchNode);

  var transformed = [];
  var nodeValue;
  // duplicate all modules starting with './' to '../' as modules may be referenced in either way
  for (nodeValue in patchMe) {
    if (patchMe.hasOwnProperty(nodeValue)) {
      if (patchMe[nodeValue]) {
        if (nodeValue.startsWith("./")) {
          transformed.push(["\\.\\" + nodeValue, "." + patchMe[nodeValue]]);
        }
        transformed.push([nodeValue, patchMe[nodeValue]]);
      } else {
        if (nodeValue.startsWith("./")) {
          transformed.push(["\\.\\" + nodeValue, false]);
        }
        transformed.push([nodeValue, false]);
      }
    }
  }

  for (var i in transformed) {
    nodeValue = transformed[i][0];
    var browserReplacement = transformed[i][1];
    if (nodeValue.endsWith(".js")) {
      nodeValue = nodeValue.substring(0, nodeValue.indexOf(".js"));
    }
    if (browserReplacement && browserReplacement.endsWith(".js")) {
      browserReplacement = browserReplacement.substring(0, browserReplacement.indexOf(".js"));
    }
    var where = [path.join(packagepath, "**", "*.js")],
        what = new RegExp("require\\(['\"]" + nodeValue + "['\"]\\)", "g"),
        // to be safe, adding a space after require so it won't match repeatedly
        by = browserReplacement ? "require ('" + browserReplacement + "')" : "{}";
    changeFiles(where, what, by);
  }
}


try {
  // read the app package.json's dependencies node
  var appPackageJson = require(path.join(__dirname, "..", "..", "package.json"));
  var appDependencies = appPackageJson.dependencies;

  // scan those nodes (and its children)
  var packages = [];
  for (var nodeValue in appDependencies) {
    if (appDependencies.hasOwnProperty(nodeValue) && blacklist.indexOf(nodeValue) === -1 && (nodeValue === "nativescript-nodeify" || !nodeValue.startsWith("nativescript"))) {
      findFilesByName(path.join(__dirname, "..", nodeValue), "package.json", packages);
    }
  }
  log("\npackage.jsons found in:\n " + packages.join("\n "));

  // patch global dependencies
  var customGlobalPatches = appPackageJson.nativescript["nodeify"] ? appPackageJson.nativescript["nodeify"]["global-dependencies"] || {} : {};
  for (var p in packages) {
    patchPackage(packages[p], customGlobalPatches);
  }

  // replace any inner dependencies (should hardly ever be required btw)
  var customLocalPatches = appPackageJson.nativescript["nodeify"] ? appPackageJson.nativescript["nodeify"]["package-dependencies"] : undefined;
  if (customLocalPatches) {
    for (var patchMe in customLocalPatches) {
      if (customLocalPatches.hasOwnProperty(patchMe)) {
        var toPatchArray = customLocalPatches[patchMe];
        for (var tpa in toPatchArray) {
          var toPatch = toPatchArray[tpa];
          for (var tp in toPatch) {
            var where = path.join(__dirname, "..", patchMe, "**", "*.js");
            // TODO (no rush) should try to make these proper require regex strings.. try leveraging patchPackage()
            changeFiles([where], tp, toPatch[tp]);
          }
        }
      }
    }
  }
} catch (error) {
  console.error('Error occurred:', error);
}