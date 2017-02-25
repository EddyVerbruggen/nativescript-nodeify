var observable = require("data/observable");
var dialogs = require("ui/dialogs");

var DemoAppModel = (function (_super) {
  __extends(DemoAppModel, _super);
  function DemoAppModel() {
    _super.call(this);
  }

  require("nativescript-nodeify");

  DemoAppModel.prototype.authUser = function () {
    // see https://github.com/aws/amazon-cognito-identity-js
    var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
    var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
    var CognitoUser = AmazonCognitoIdentity.CognitoUser;

    var authenticationData = {
      Username: 'EddyVerbruggen3',
      Password: 'password123'
    };
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    // var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    // var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(authenticationData);
    // attributeList.push(attributeEmail);

    // app: nativescript-awstest
    var poolData = {
      UserPoolId: 'us-east-1_N509f1jYm',
      ClientId: '<your-client-id>'
    };

    var userPool = new CognitoUserPool(poolData);
    var userData = {
      Username: 'EddyVerbruggen3',
      Pool: userPool
    };
    var user = new CognitoUser(userData);

    user.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        console.log('access token + ' + result.getAccessToken().getJwtToken());

        var AWS = require('aws-sdk');
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
          IdentityPoolId: 'us-east-1_N509f1jYm', // your identity pool id here
          Logins: {
            // Change the key below according to the specific region your user pool is in.
            'cognito-idp.us-east-1.amazonaws.com/my-userpool': result.getIdToken().getJwtToken()
          }
        });

        // Instantiate aws sdk service objects now that the credentials have been updated.
        // example: var s3 = new AWS.S3();
      },

      onFailure: function (err) {
        console.log("authUser error: " + authUser);
      }
    });
  };

  DemoAppModel.prototype.listS3Buckets = function () {
    var AWS = require('aws-sdk');

    AWS.config.update({
        region: "eu-central-1",
        credentials: {
          accessKeyId: "<your-access-key>",
          secretAccessKey: "<your-secret-access-key>"
        }
    });

    var s3 = new AWS.S3({
        apiVersion: "2006-03-01"
    });

    s3.listObjects({Bucket: "telerikdemoapp"}, function (err, data) {
        if (err) {
            consoe.log(JSON.stringify(err));
        } else {
            console.log("S3 bucket contents: " + JSON.stringify(data.Contents));
        }
    });
  };

  DemoAppModel.prototype.signUpUser = function () {
    // see https://github.com/aws/amazon-cognito-identity-js
    var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
    var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;

    // app: nativescript-awstest
    var poolData = {
      UserPoolId: 'us-east-1_N509f1jYm',
      ClientId: '<your-client-id>'
    };

    var userPool = new CognitoUserPool(poolData);

    var attributeList = [];
    // var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    var dataEmail = {
      Name: 'email2',
      Value: 'email2@myawesomedomain.com'
    };
    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
    attributeList.push(attributeEmail);

    userPool.signUp('EddyVerbruggen4', 'password123', attributeList, null, function (err, result) {
      if (err) {
        console.log(err);
        return;
      }
      console.log('user is ' + result.user);
      console.log('user name is ' + result.user.getUsername());
    });
  };

  DemoAppModel.prototype.listDynamoTables = function () {
    var AWS = require('aws-sdk');
    AWS.config.update({
      region: "eu-central-1",
      credentials: {
        accessKeyId: "<your-access-key>",
        secretAccessKey: "<your-secret-access-key>"
      }
    });

    var db = new AWS.DynamoDB();
    db.listTables(function (err, data) {
      if (err) {
        console.log("dynamo list error: " + err);
      } else {
        dialogs.alert({
          title: "Dynamo tables",
          message: "" + data.TableNames,
          okButtonText: "OK"
        });
      }
    });
  };

  DemoAppModel.prototype.updateDynamoTable = function () {
    var AWS = require('aws-sdk');
    AWS.config.update({
      region: "my-region",
      credentials: {
        accessKeyId: "<your-access-key>",
        secretAccessKey: "<your-secret-access-key>"
      }
    });

    new AWS.DynamoDB().putItem({
      TableName: "html5frameworks",
      Item: {
        "Framework ID": {S: "Kendo UI"},
        data: {
          S: "Last update: " + new Date().toString()
        }
      }
    }, function (err, data) {
      if (err) {
        dialogs.alert({
          title: "Error",
          message: JSON.stringify(err),
          okButtonText: "OK"
        })
      } else {
        dialogs.alert({
          title: "",
          message: "Record updated",
          okButtonText: "OK"
        });
      }
    });
  };

  DemoAppModel.prototype.jwt = function () {
    // Note that this will crash on Android due to https://github.com/NativeScript/android-runtime/issues/666

    var jwt = require('jsonwebtoken');
    var token = jwt.sign({foo: 'bar'}, 'shhhhh');
    console.log("-- token: " + token);

    var older_token = jwt.sign({foo: 'bar', iat: Math.floor(Date.now() / 1000) - 30}, 'shhhhh');
    console.log("-- older_token: " + older_token);

    var signed = jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      data: "foobar"
    }, 'secret');
    console.log("signed: " + signed);
  };

  DemoAppModel.prototype.nodeUUID = function () {
    // Note that this will crash on Android due to https://github.com/NativeScript/android-runtime/issues/666
    var uuid = require('node-uuid');
    console.log("uuid.v1: " + uuid.v1());
  };

  return DemoAppModel;
})(observable.Observable);
exports.DemoAppModel = DemoAppModel;
exports.mainViewModel = new DemoAppModel();