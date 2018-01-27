module.exports = function ($logger, $projectData, $usbLiveSyncService, $platformsData, hookArgs) {
    var path = require("path");
    var platformName = hookArgs.platform.toLowerCase();
    
    //appDestinationDir is the platform specific app folder. For Android, this will be YOUR_PROJECT_ROOT/platforms/android/src/main/assets/
    var appDestinationDir = $platformsData.getPlatformData(platformName).appDestinationDirectoryPath;
    var patchNpmPackageDir = path.join(appDestinationDir, "app", "tns_modules", "nativescript-nodeify", "patch-npm-packages.js");
    
    //Calling patch-npm-packages.js under platforms to patch the node_modules in the platforms folder.
    //This will leave the source code folder YOUR_PROJECT_ROOT/node_modules untouched.
    var patchNpmPackage = require(patchNpmPackageDir);
    patchNpmPackage($logger, $projectData, $usbLiveSyncService);
}
