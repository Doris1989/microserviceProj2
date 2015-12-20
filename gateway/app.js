var express = require("express");
var app = express();

var awsInfo = require( "../../test/awsInfo.json" );

// Require libraries.
var aws = require( "aws-sdk" );
var Q = require( "q" );
var chalk = require( "chalk" );

// Create an instance of our SQS Client.
var sqs = new aws.SQS({
    region: awsInfo.region,
    accessKeyId: awsInfo.accessKey,
    secretAccessKey: awsInfo.secretKey,
});

// Proxy the appropriate SQS methods to ensure that they "unwrap" the common node.js
// error / callback pattern and return Promises. Promises are good and make it easier to
// handle sequential asynchronous data.
var sendMessage = Q.nbind( sqs.sendMessage, sqs );
var receiveMessage = Q.nbind( sqs.receiveMessage, sqs );
var deleteMessage = Q.nbind( sqs.deleteMessage, sqs );


sendToSqs = function(qurl, sqs_params){
	sendMessage({
	    MessageBody: JSON.stringify(sqs_params),
	    QueueUrl: qurl
	})
	.then(
	    function handleSendResolve( data ) {

	        console.log( chalk.green( "Message sent:", data.MessageId ) );

	    }
	)

	// Catch any error (or rejection) that took place during processing.
	.catch(
	    function handleReject( error ) {

	        console.log( chalk.red( "Unexpected Error:", error.message ) );

	    }
	);
}

function workflowError( type, error ) {

    error.type = type;

    return( error );

}

getFromSqs = function(qurl, callback) {

    console.log( chalk.yellow( "Starting long-poll operation." ) );

    receiveMessage({
        WaitTimeSeconds: 3, 
        VisibilityTimeout: 10,
        QueueUrl: qurl
    })
    .then(
        function handleMessageResolve( data ) {

            if ( ! data.Messages ) {
            	getFromSqs(qurl, callback);
                throw(
                    workflowError(
                        "EmptyQueue",
                        new Error( "There are no messages to process." )
                    )
                );

            }

            // ---
            // TODO: Actually process the message in some way :P
            // ---
            var response = data.Messages[0].Body;
            console.log(response);
            console.log( chalk.green( "Deleting:", data.Messages[ 0 ].MessageId ) );
            callback(response);

            return(
                deleteMessage({
                    ReceiptHandle: data.Messages[ 0 ].ReceiptHandle,
                    QueueUrl: qurl
                })
            );

        }
    )
    .then(
        function handleDeleteResolve( data ) {

            console.log( chalk.green( "Message Deleted!" ) );

        }
    )

    .catch(
        function handleError( error ) {

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

    .finally();

};

app.use(express.static('public'));

app.get('/', function (req, res) {
   res.sendFile( __dirname + "/" + "index.html" );
})

app.get('/getFinanceRecords', function (req, res) {
	var cid = req.query.cid;
	var cid_qurl;
	sqs.createQueue({
	    	QueueName: 'Client_'+cid
		}, function(err, data) {
    	if (err) {
        	console.log(err, err.stack);
        	return;
    	}
    	cid_qurl=data.QueueUrl;

    	console.log( chalk.blue( "Queue Created ", cid_qurl ) );

    	var finance_params = {
	        body:{cid : cid},
	        action: "getFinanceRecords",
	        responseQURL: cid_qurl,
	        responseQTopicARN: ""
	    };
	    console.log(JSON.stringify(finance_params));

		sendToSqs(awsInfo.queueUrl, finance_params);

	    getFromSqs(cid_qurl, function(response){
	    	res.send(response);
	    });
	});
	
})

app.get('/getFinanceRecord', function (req, res) {
	var cid = req.query.cid;
    var cid_qurl;
    sqs.createQueue({
            QueueName: 'Client_'+cid
        }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            return;
        }
        cid_qurl=data.QueueUrl;

        console.log( chalk.blue( "Queue Created ", cid_qurl ) );

        var finance_params = {
            body:{cid : cid, studentId : req.query.fr_stu_id, schoolId : req.query.fr_sch_id},
            action: "getFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(awsInfo.queueUrl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

app.get('/updateFinanceRecord', function (req, res) {
	var cid = req.query.cid;
    var cid_qurl;
    sqs.createQueue({
            QueueName: 'Client_'+cid
        }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            return;
        }
        cid_qurl=data.QueueUrl;

        console.log( chalk.blue( "Queue Created ", cid_qurl ) );

        var finance_params = {
            body:{cid : cid, studentId : req.query.fu_stu_id, schoolId : req.query.fu_sch_id},
            action: "updateFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(awsInfo.queueUrl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

app.get('/deleteFinanceRecord', function (req, res) {
	var cid = req.query.cid;
    var cid_qurl;
    sqs.createQueue({
            QueueName: 'Client_'+cid
        }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            return;
        }
        cid_qurl=data.QueueUrl;

        console.log( chalk.blue( "Queue Created ", cid_qurl ) );

        var finance_params = {
            body:{cid : cid, studentId : req.query.fd_stu_id, schoolId : req.query.fd_stu_id},
            action: "deleteFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(awsInfo.queueUrl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

app.get('/createFinanceRecord', function (req, res) {
	var cid = req.query.cid;
    var cid_qurl;
    sqs.createQueue({
            QueueName: 'Client_'+cid
        }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            return;
        }
        cid_qurl=data.QueueUrl;

        console.log( chalk.blue( "Queue Created ", cid_qurl ) );

        var finance_params = {
            body:{cid : cid, studentId : req.query.fc_stu_id, schoolId : req.query.fc_stu_id},
            action: "createFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(awsInfo.queueUrl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

var server = app.listen(9999, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})