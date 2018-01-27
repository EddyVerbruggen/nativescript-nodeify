module.exports = function ($logger, $projectData, $usbLiveSyncService) {
  var liveSync = $usbLiveSyncService.isInitialized;

  if (liveSync) {
    return;
  }

  var fs = require('fs'),
      path = require('path'),
      replaceInFile = require('replace-in-file');

  function log(what) {
    // enable this line to see what the nodeify plugin is up to
    // console.log(what);
  }

  var shims = require('./shims.json');

// any shims that are installed in nativescript-nodeify/node_modules need an update
  var nodeFolder = path.join(__dirname, "node_modules");
  if (fs.existsSync(nodeFolder)) {
    var files = fs.readdirSync(nodeFolder);
    for (var i = 0; i < files.length; i++) {
      var filename = files[i];
      shims[filename] = "nativescript-nodeify/node_modules/" + filename;
    }
  }

// never touch these
  var blacklist = [
    "nativescript-nodeify",
    "nativescript-node",
    "tns-core-modules",
    "typescript",
    "form-data",
    "replace-in-file",
    "glob",
    "fs.realpath",
    ".bin"
  ];

  function changeFiles(files, replace, by) {
    return replaceInFile.sync({
      files: files,
      from: replace,
      to: by,
      allowEmptyPaths: true
    });
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
    for (nodeValue in patchMe) {
      if (patchMe.hasOwnProperty(nodeValue)) {

        var browserReplacement = patchMe[nodeValue];

        if (nodeValue.endsWith(".js")) {
          nodeValue = nodeValue.substring(0, nodeValue.indexOf(".js"));
        }
        if (browserReplacement && browserReplacement.endsWith(".js")) {
          browserReplacement = browserReplacement.substring(0, browserReplacement.indexOf(".js"));
        }

        if (!nodeValue.startsWith(".") && (!browserReplacement || !browserReplacement.startsWith("."))) {
          // these don't use relative paths, so let's use a quick search-replace algorithm here
          transformed.push([nodeValue, browserReplacement]);
        } else {
          var transformedPartially = [];
          if (nodeValue.startsWith("./")) {
            transformedPartially.push(["\\.\\" + nodeValue, "__REPLACE__REAL__PATH__" + "." + nodeValue]);
          }
          transformedPartially.push([nodeValue, "__REPLACE__REAL__PATH__" + nodeValue]); // this one traverses into node_modules, but the fixer below doesnt
          var changedPartialFiles = transformFiles(packagepath, transformedPartially);
          var nrOfPatchedFiles = 0;
          if (changedPartialFiles.length > 0) {
            log("%%%%%%%% changed " + changedPartialFiles.length + " files partially for packagepath " + packagepath + " with nodeValue " + nodeValue + ":\n " + changedPartialFiles.join('\n '));
            // beware: don't traverse into the node_modules folder of this pkg!
            // SO: open all of those files
            changedPartialFiles.forEach(function (partiallyChangedFile) {
              var packagelessFilename = partiallyChangedFile.substring(packagepath.length + 1);
              if (packagelessFilename.indexOf("node_modules/") === -1) {
                var pathDepth = packagelessFilename.split("/").length - 1;
                var prefixPath = "";
                for (var i = 0; i < pathDepth; i++) {
                  prefixPath += "../";
                }
                if (prefixPath === "") {
                  prefixPath = "./"
                }

                if (prefixPath === "./") {
                  if (!browserReplacement) {
                    log("--------- no browserReplacement for " + nodeValue + " in " + packagepath);
                  }
                  var patchMeWithoutPrefix = nodeValue.indexOf("/") === -1 ? nodeValue : nodeValue.substring(nodeValue.indexOf("/") + 1); // "lib/node_loader"; // TODO dynamic
                  var patchMeValueWithoutPrefix = browserReplacement.indexOf("/") === -1 ? browserReplacement : browserReplacement.substring(browserReplacement.indexOf("/") + 1); // "lib/browser_loader" ; // browserReplacement; // TODO dynamic

                  var where = [partiallyChangedFile],
                      what = new RegExp("__REPLACE__REAL__PATH__(.*)" + patchMeWithoutPrefix, "g"),
                      by = prefixPath + patchMeValueWithoutPrefix;

                  var changedFiles = changeFiles(where, what, by);
                  if (changedFiles.length > 0) {
                    log("------------------ changed " + partiallyChangedFile + ", " + what + " --> " + by);
                    nrOfPatchedFiles += changedFiles.length;
                  }
                }
              }
            });
          }
        }
      }
    }

    var where = [path.join(packagepath, "**", "*.js")],
        what = new RegExp("__REPLACE__REAL__PATH__", "g"),
        by = "";

    var changedFiles = changeFiles(where, what, by);
    if (changedFiles.length > 0) {
      log("--- changed files back: " + changedFiles.join("\n ----- "));
    }

    transformFiles(packagepath, transformed);
  }

  function transformFiles(packagepath, transformations) {
    var allChangedFiles = [];
    for (var i in transformations) {
      var nodeValue = transformations[i][0];
      var browserReplacement = transformations[i][1];
      var where = [path.join(packagepath, "**", "*.js")],
          what = new RegExp("require\\(['\"]" + nodeValue + "['\"]\\)", "g"),
          by = browserReplacement ? "require('" + browserReplacement + "')" : "{}";
      var changedFiles = changeFiles(where, what, by);
      if (changedFiles.length > 0) {
        allChangedFiles = allChangedFiles.concat(changedFiles);
      }
    }
    return allChangedFiles;
  }

  try {
    var packages = [];

    function getPackageJsons(folderStr) {
      var folder = fs.readdirSync(folderStr);
      for (var j = 0; j < folder.length; j++) {
        var folderName = folder[j];
        if (/*appDependencies.hasOwnProperty(folderName) &&*/ blacklist.indexOf(folderName) === -1 && !folderName.startsWith("@") && (folderName === "nativescript-nodeify" || !folderName.startsWith("nativescript"))) {
          var f = path.join(folderStr, folderName);
          findFilesByName(f, "package.json", packages);
        }
      }
    }

    // fills the packages array with local and global dependencies
    getPackageJsons(path.join(__dirname, ".."));
    if (fs.existsSync(path.join(__dirname, "node_modules"))) {
      getPackageJsons(path.join(__dirname, "node_modules"));
    }

    // patch global dependencies
    var appPackageJson = require($projectData.projectFilePath);
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
              log("locally patching at " + where);
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
};
