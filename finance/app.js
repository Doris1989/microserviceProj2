'use strict';

var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
var AWS = require('aws-sdk');
var http = require('http');
var bodyParser = require('body-parser');
var awsInfo = require('./config/awsinfo');
var events = require('events');
var util = require('util');
var Q = require('q');
var chalk = require( "chalk" );
var SwaggerUi = require('swagger-tools/middleware/swagger-ui');
var msg = {};
var controller = require('./api/controllers/finance_controller');
exports.msg = msg;




var config = {
    appRoot: __dirname // required config
};

AWS.config.update({
	'region' : awsInfo.region,
	'accessKeyId' : awsInfo.accessKey,
	'secretAccessKey': awsInfo.secretKey
});

require('events').EventEmitter.prototype._maxListeners = 10000; //events listener..?

// var sqsParams = {
// 	QueueUrl : awsInfo.queueUrl,
// 	Attributes: {
// 		'Policy' : JSON.stringify({})
// 	}
// };

//var sqs = new AWS.SQS();
// sqs.setQueueAttributes(sqsParams, function(err, result) {
// 	if (err !== null) {
// 		console.log(util.inspect(err));
// 		return;
// 	}
// });



// var sqsGetParams = {
//     QueueUrl: awsInfo.queueUrl,
//     MaxNumberOfMessages: 1,
//     VisibilityTimeout: 60,
//     WaitTimeSeconds: 10
// };

app.use(bodyParser.json());

var sqsSendParams = {
    MessageBody: "default",
    QueueUrl: awsInfo.queueUrl
};

// Create an instance of our SQS Client.
var sqs = new AWS.SQS({
    region: awsInfo.region,
    accessKeyId: awsInfo.accessKey,
    secretAccessKey: awsInfo.secretKey,

    // For every request in this demo, I'm going to be using the same QueueUrl; so,
    // rather than explicitly defining it on every request, I can set it here as the
    // default QueueUrl to be automatically appended to every request.
    params: {
        QueueUrl: awsInfo.queueUrl
    }
});


var receiveMessage = Q.nbind( sqs.receiveMessage, sqs );
var deleteMessage = Q.nbind( sqs.deleteMessage, sqs );


// ---------------------------------------------------------- //
// continuously poll from queue
// ---------------------------------------------------------- //


// When pulling messages from Amazon SQS, we can open up a long-poll which will hold open
// until a message is available, for up to 20-seconds. If no message is returned in that
// time period, the request will end "successfully", but without any Messages. At that
// time, we'll want to re-open the long-poll request to listen for more messages. To
// kick off this cycle, we can create a self-executing function that starts to invoke
// itself, recursively.
(function pollQueueForMessages() {

    console.log( chalk.yellow( "Starting long-poll operation." ) );

    // Pull a message - we're going to keep the long-polling timeout short so as to
    // keep the demo a little bit more interesting.
    receiveMessage({
        WaitTimeSeconds: 3, // Enable long-polling (3-seconds).
        VisibilityTimeout: 10
    })
    .then(
        function handleMessageResolve( data ) {

            // If there are no message, throw an error so that we can bypass the
            // subsequent resolution handler that is expecting to have a message
            // delete confirmation.
            if (! data.Messages ) {
                pollQueueForMessages(); 
                throw(
                    workflowError(
                        "EmptyQueue",
                        new Error( "There are no messages to process." )
                    )
                );

            }
            else {
                var message = data.Messages[0].Body;
                msg = JSON.parse(message);
                console.log(msg);
                if(msg.action == "getFinanceRecords") {
                    console.log("Call getFinanceRecords function:");
                    controller.getFinanceRecords(msg);
                }
                else if(msg.action == "getFinanceRecord") {
                    console.log("Call getFinanceRecord function:");
                    controller.getFinanceRecord(msg);
                }
                else if(msg.action == "updateFinanceRecord") {
                    console.log("Call updateFinanceRecord function:");
                    controller.updateFinanceRecord(msg);
                }
                else if(msg.action == "createFinanceRecord") {
                    console.log("Call createFinanceRecord function : ");
                    controller.createFinanceRecord(msg);
                }
                else {//msg.action == "deleteFinanceRecord"
                    console.log("Call deleteFinanceRecord function:");
                    controller.deleteFinanceRecord(msg);
                }
            }

            // ---
            // TODO: Actually process the message in some way :P
            // ---
            console.log( chalk.green( "Deleting:", data.Messages[ 0 ].MessageId ) );

            // Now that we've processed the message, we need to tell SQS to delete the
            // message. Right now, the message is still in the queue, but it is marked
            // as "invisible". If we don't tell SQS to delete the message, SQS will
            // "re-queue" the message when the "VisibilityTimeout" expires such that it
            // can be handled by another receiver.
            return(
                deleteMessage({
                    ReceiptHandle: data.Messages[0].ReceiptHandle
                })
            );

        }
    )
    .then(
        function handleDeleteResolve( data ) {

            console.log( chalk.green( "Message Deleted!" ) );

        }
    )

    // Catch any error (or rejection) that took place during processing.
    .catch(
        function handleError( error ) {

            // The error could have occurred for both known (ex, business logic) and
            // unknown reasons (ex, HTTP error, AWS error). As such, we can treat these
            // errors differently based on their type (since I'm setting a custom type
            // for my business logic errors).
            switch ( error.type ) {
                case "EmptyQueue":
                    console.log( chalk.cyan( "Expected Error:", error.message ) );
                break;
                default:
                    console.log( chalk.red( "Unexpected Error:", error.message ) );
                break;
            }

        }
    )

    // When the promise chain completes, either in success of in error, let's kick the
    // long-poll operation back up and look for moar messages.
    .finally( pollQueueForMessages );
    //.finally();

})();

// Proxy the appropriate SQS methods to ensure that they "unwrap" the common node.js
// error / callback pattern and return Promises. Promises are good and make it easier to
// handle sequential asynchronous data.


//test use, should be in gateway, push req into queue
var sendMessageToSQS = function(req) {
    sqsSendParams.MessageBody = req;

    sqs.sendMessage(sqsSendParams, function(err, data){
        if (err) console.log(err);
    }, function (err, data) {
            if (err) {
                console.log(err, err.stack);
                return;
            }
            console.log('SQS sent.');
            console.log(data);
    });
};


SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }
  // install middleware
    swaggerExpress.register(app);
    app.use(SwaggerUi(swaggerExpress.runner.swagger));

// a middleware with no mount path; gets executed for every request to the app

    // app.use('/Finance', function (req, res, next) {
    // //     //sendMessageToSQS(JSON.stringify({}));
    //     console.log("got the request here.");
    //     pollQueueForMessages(res);
    //     console.log("msg is : ");
    //     console.log(msg);
    //     res.end('Hello World\n');
    //     next();
    // });

    //error handle
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message : err.message,
            error : {}
        });
    });
    var port = 10010;

    app.listen(port);

});


module.exports = app; // for testing
