var express = require("express");
var app = express();

var awsInfo = require( "./awsInfo.json" );

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

var finance_qurl = awsInfo.finance_qurl;
var k12_qurl = awsInfo.k12_qurl;

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

		sendToSqs(finance_qurl, finance_params);

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

        sendToSqs(finance_qurl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})
// schoolName : body.schoolName,
//                                 studentName : body.studentName,
//                                 tuition : body.tuition,
//                                 loan : body.loan,
//                                 insurance : body.insurance,
//                                 equipmentFee : body.equipmentFee,
//                                 awards : body.awards});
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
            body:{cid : cid, studentId : req.query.fu_stu_id, schoolId : req.query.fu_sch_id,
                  studentName: req.query.fu_stu_name, schoolName: req.query.fu_sch_name,
                  tuition: req.query.fu_tuition, loan: req.query.fu_tuition,
                  insurance: req.query.fu_insurance, equipmentFee: req.query.fu_equip,
                  awards: req.query.fu_awards},
            action: "updateFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(finance_qurl, finance_params);

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

        sendToSqs(finance_qurl, finance_params);

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
            body:{cid : cid, studentId : req.query.fc_stu_id, schoolId : req.query.fc_sch_id,
                  studentName: req.query.fc_stu_name, schoolName: req.query.fc_sch_name,
                  tuition: req.query.fc_tuition, loan: req.query.fc_tuition,
                  insurance: req.query.fc_insurance, equipmentFee: req.query.fc_equip,
                  awards: req.query.fc_awards},
            action: "createFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(finance_params));

        sendToSqs(finance_qurl, finance_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

app.get('/getK12Records', function (req, res) {
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

        var k12_params = {
            body:{cid : cid},
            action: "getK12Records",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(k12_params));

        sendToSqs(k12_qurl, k12_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });
    });
    
})

app.get('/getK12Record', function (req, res) {
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

        var k12_params = {
            body:{cid : cid, studentId : parseInt(req.query.kr_stu_id), schoolId : parseInt(req.query.kr_sch_id)},
            action: "getK12Record",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(k12_params));

        sendToSqs(k12_qurl, k12_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})


app.get('/deleteK12Record', function (req, res) {
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

        var k12_params = {
            body:{cid : cid, studentId : parseInt(req.query.kd_stu_id), schoolId : parseInt(req.query.kd_sch_id)},
            action: "deleteK12Record",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(k12_params));

        sendToSqs(k12_qurl, k12_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

//":newschoolname": body.schoolName,
          // ":newstudentname": body.studentName,
          // ":newsyear": body.startYear,
          // ":neweyear": body.endYear,
          // ":newgrad": body.graduated,
          // ":newdegree": body.degree
          //
app.get('/updateK12Record', function (req, res) {
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

        var k12_params = {
            body:{cid : cid, studentId : parseInt(req.query.ku_stu_id), schoolId : parseInt(req.query.ku_sch_id),
                    schoolName: req.query.ku_sch_name, studentName: req.query.ku_stu_name,
                    startYear: parseInt(req.query.ku_startYear), endYear: parseInt(req.query.ku_endYear),
                    graduated: req.query.ku_graduated, degree: req.query.ku_degree},
            action: "updateFinanceRecord",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(k12_params));

        sendToSqs(k12_qurl, k12_params);

        getFromSqs(cid_qurl, function(response){
            res.send(response);
        });

    });
})

app.get('/createK12Record', function (req, res) {
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

        var k12_params = {
            body:{cid : cid, studentId : parseInt(req.query.kc_stu_id), schoolId : parseInt(req.query.kc_sch_id),
                    schoolName: req.query.kc_sch_name, studentName: req.query.kc_stu_name,
                    startYear: parseInt(req.query.kc_startYear), endYear: parseInt(req.query.kc_endYear),
                    graduated: req.query.kc_graduated, degree: req.query.kc_degree},
            action: "createK12Record",
            responseQURL: cid_qurl,
            responseQTopicARN: ""
        };
        console.log(JSON.stringify(k12_params));

        sendToSqs(k12_qurl, k12_params);

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