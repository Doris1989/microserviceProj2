'use strict';

var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
var AWS = require('aws-sdk');
var http = require('http');
var bodyParser = require('body-parser');
var awsInfo = require('./config/awsinfo');
var events = require('events');
var util = require('util');
var SwaggerUi = require('swagger-tools/middleware/swagger-ui');




var config = {
    appRoot: __dirname // required config
};

AWS.config.update({
	'region' : awsInfo.region,
	'accessKeyId' : awsInfo.accessKey,
	'secretAccessKey': awsInfo.secretKey
});

require('events').EventEmitter.prototype._maxListeners = 10000; //events listener..?

var sqsParams = {
	QueueUrl : awsInfo.queueUrl,
	Attributes: {
		'Policy' : JSON.stringify({})
	}
};

var sqs = new AWS.SQS();
sqs.setQueueAttributes(sqsParams, function(err, result) {
	if (err !== null) {
		console.log(util.inspect(err));
		return;
	}
});

var sqsSendParams = {
    MessageBody: "",
    QueueUrl: awsInfo.queueUrl
};

var sqsGetParams = {
    QueueUrl: awsInfo.queueUrl,
    MaxNumberOfMessages: 1,
    VisibilityTimeout: 60,
    WaitTimeSeconds: 10
};

app.use(bodyParser.json());
app.get('/', function (req, res) {
   // --
   console.log("hehe");
});

//test use, should be in gateway, push req into queue
var sendMessageToSQS = function(req) {
    sqsSendParams.MessageBody = JSON.stringify(req);

        sqs.sendMessage(sqsSendParams, function(err, data){
            if(err) console.log(err);
        });
};


SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }
  // install middleware
    swaggerExpress.register(app);
    app.use(SwaggerUi(swaggerExpress.runner.swagger));

    
    app.use(function(err, req, res, next) {
        console.log("hahahahh");
        //console.log(req.body);
        //send req to sqs
        sendMessageToSQS(req);

        //pull req from sqs
        // SQSListenEmitter.on('NotEmpty', getMessageFromSQS);
        //setInterval(function(){SQSListenEmitter.emit('NotEmpty');},1000);
        
        //test
        //cosole.log(req.body);

        res.status(err.status || 500);
        res.render('error', {
            message : err.message,
            error : {}
        });
    });
    var port = process.env.PORT || 10010;
    
    app.listen(port);

});


module.exports = app; // for testing
