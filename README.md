# NativeScript Nodeify
Makes most npm packages compatible with NativeScript

## Q & A
#### Q. WTF?
A. Good question, glad you asked! You can't just use any npm package with NativeScript as they may depend
on built-in Node modules (`fs`, `path`, `crypto` to name but a few).
Those modules aren't plain old JavaScript files so they can't be executed in the {N} runtimes.

#### Q. So how does this plugin overcome that situation?
A. You can install dependencies as normal, and this plugin as well, then at build time a hook installed by this plugin will scan and modify
your npm modules ([in the platforms folder](https://github.com/EddyVerbruggen/nativescript-nodeify/pull/31)) as it sees fit to make them {N}-compatible.

#### Q. Lol. Wut? Modify my precious modules!?
A. Yes. The hook looks at the packages installed in `<app>/platforms/<ios|android>/.../tns_modules` and for each dependency it does a few things:
* Look for a `browser` node in their `package.json` and find-replaces any matching `require()` calls in that package and its dependencies.
* If there's a `main` replacement in the `browser` node it also takes care of that.
* If any of the dependencies (and this can go deeeeeeeeeeep - remember `left-pad`?) contains something we need to shim, we will based on [this list](https://github.com/EddyVerbruggen/nativescript-nodeify/blob/master/shims.json).
* There's more trickery and there may be more needed, so this list is a bit evolving atm..

#### Q. But doesn't browserify / Webpack solve this for us?
A. Not in this case, at least not without further modifications. Think modules that don't have a `browser` node in their `package.json`, or modules that do but shim their node dependency with something that needs a real browser..
Feel free to submit a PR for a nicer implementation, but this is the best I could think of.

#### Q. Not bad actually, but doesn't come with a performance hit?
A. Thanks. And good question. Most importantly, at runtime this should make no difference as you're not 'requiring'
more that you were already, just different implementations (that actually work, I hope).
A build time you will see a few seconds added to your build (but it shouldn't affect livesync).
The hook skips checking `tns-core-modules` and anything starting with `nativescript`.

## Installation
From the command prompt go to your app's root folder and execute:

```sh
tns plugin add nativescript-nodeify
```
## Usage
Include this in your code before requiring the problematic npm module.

```js
require("nativescript-nodeify");
```

## Demo app
[The demo](https://github.com/EddyVerbruggen/nativescript-nodeify) tests a few popular
libraries that depend on Node built-in modules which would normally not work in a NativeScript runtime environment.

Run the demo app from the root of the project: `npm run demo.ios` or `npm run demo.android`.

## Know issues
This plugin isn't perfect, but it tried to solve issues for as many of the gazillion npm packages out there. A few issues are known, if yours is not in this list please [create an issue](https://github.com/EddyVerbruggen/nativescript-nodeify/issues/new).

* Like Browserify we're using shims to fill the gaps between Node and the browser, but unlike Browserify shims we're not running in a browser, so some API's may not be available. Anything that touches the DOM for instance.  
* The http shim isn't perfect (like [usage of `global.location.protocol.search`](https://github.com/jhiesey/stream-http/blob/master/index.js#L17)), so may need to do what [RN did](https://github.com/tradle/react-native-http) and roll our own (if anyone needs it).

## Recipies
To get you started with a few popular npm modules, here's some recipies. Please share your own by sending a PR to this repo! 

All recipies assume you've already done:

```bash
$ tns create awssdk
$ cd awssdk
$ tns platform add ios
$ tns platform add android
$ tns plugin add nativescript-nodeify
```

### `node-uuid`
```bash
$ npm install node-uuid --save
```
Boom! Done.

### `jsonwebtoken`
```bash
$ npm install jsonwebtoken --save
```
Boom! Done. Again.

### `aws-sdk` or `amazon-cognito-identity-js` (which includes `aws-sdk`)
This one requires a bit more setup, but it's not too bad:

> Never check in your AWS keys! Bots scan public repos and will create server instances you'll get billed for.

Depending on what you need:

```bash
$ npm install aws-sdk --save
```

or

```bash
$ npm install amazon-cognito-identity-js --save
```

To parse XML returned from AWS correctly (fi. when listing S3 bucket contents) we need
to patch an additional library because the browser shim expects an.. ehm.. browser.

So open you app's `package.json` and add this `nodeify` node to the existing `nativescript` node:
```json
{
  "nativescript": {
    "nodeify": {
      "package-dependencies": {
        "aws-sdk": [
          {
            "xml/browser_parser": "xml/node_parser",
            "lib/node_loader": "lib/browser_loader"
          }
        ]
      }
    }
  }
}
```

Then in your code for `amazon-cognito-identity-js`:
```js
// require this to fix an issue with xhr event states
require('nativescript-nodeify');

// register a user (here's a bit, but see the demo and https://github.com/aws/amazon-cognito-identity-js for details)
var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
var userPool = new CognitoUserPool({UserPoolId: 'foo', ClientId: 'bar'});
```

Now just use AWS as usual:
```js
// then require AWS and interact with s3, dynamo, whatnot
var AWS = require('aws');
```
