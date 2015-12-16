//Import the Data Models
var Finance = require('../../model/financemodel');
var AWS = require('aws-sdk');
var awsInfo = require('../../config/awsinfo');
var request = {};
var events = require('events');
var util = require('util');


require('events').EventEmitter.prototype._maxListeners = 10000; //events listener..?

//config aws service
AWS.config.update({
    'region': awsInfo.region,
    'accessKeyId': awsInfo.accessKey,
    'secretAccessKey': awsInfo.secretKey
});

//config sqs to get finance request
var sqs = new AWS.SQS();

var sqsParams = {
  QueueUrl : awsInfo.queueUrl,
  Attributes: {
    'Policy' : JSON.stringify({})
  }
};

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

//create an event emitter to get message from SQS if it's not empty

var SQSListenEmitter = new events.EventEmitter();
var getMessageFromSQS = function(){
    var sqsGetAttributesParams = {
        QueueUrl: awsInfo.queueUrl,
        AttributeNames: [
            'ApproximateNumberOfMessages'
        ]
    };

    sqs.getQueueAttributes(sqsGetAttributesParams, function(err,data){
        if(data.Attributes.ApproximateNumberOfMessages>5){
            sqs.receiveMessage(sqsGetParams, function(err, data){

                if(data.Messages){
                    var message = data.Messages[0],
                    request = JSON.parse(message.Body); //request to process
                    //body = JSON.parse(message.Body);
                    //workerPool.exec('sentimentAnalysis',[JSON.stringify(body)]);
                    removeFromQueue(message);

                }
            });
        }
    });
};


//remove after get the message from queue
var removeFromQueue = function(message) {
    sqs.deleteMessage({
        QueueUrl: awsInfo.queueUrl,
        ReceiptHandle: message.ReceiptHandle
    }, function(err, data) {
        // If we errored, tell us that we did
        err && console.log(err);
    });
};



module.exports = {
  getFinanceRecords: getFinanceRecords,
  getFinanceRecord: getFinanceRecord,
  updateFinanceRecord: updateFinanceRecord,
  deleteFinanceRecord: deleteFinanceRecord,
  createFinanceRecord: createFinanceRecord,
};



function getFinanceRecords(request, res, next) {
  //console.log(request);
  console.log("get records.");
  Finance.find({}, function(err, data) {
    if(err) return next(err);
    res.json(data);
  });
}


function getFinanceRecord(request, res, next) { //get finance record by student id and school id
  var stuId = req.swagger.params.studentId.value;
  var schId = req.swagger.params.schoolId.value;
  Finance.find({_id : stuId, schoolId : schId}, function(err, data) {
    if(err) return next(err);
    else if(!data || data.length == 0) {
      var error = new Error('No finance record found. Bad Request.');
      error.statusCode = 400;
      return next(error);
    }
    res.status(200);
    res.json(data);
  });
}


function createFinanceRecord(request, res, next) {
  var body = req.swagger.params.financerecord.value;
  var newRecord = new Finance({ _id : body.studentId,
                                schoolId : body.schoolId,
                                schoolName : body.schoolName,
                                studentName : body.studentName,
                                tuition : body.tuition,
                                loan : body.loan,
                                insurance : body.insurance,
                                equipmentFee : body.equipmentFee,
                                awards : body.awards});
  Finance.find({_id : body.studentId, schoolId : body.schoolId}, function(err, data) {
    if(err) return next(err);
    else if(data.length != 0) {
      var error = new Error("Duplicate record found. Bad Request.");
      error.statusCode = 400;
      return next(error);
    }
    else {
      newRecord.save(function(err, newRecord, data) {
        res.setHeader('Content-Type', 'application/json');
        res.status(201);
        res.json("Successfully created new finance record.");
      });
    }
  });
}

function updateFinanceRecord(request, res, next) {
  var body = req.swagger.params.financerecord.value;
  Finance.update({_id : body.studentId, schoolId : body.schoolId}, 
                              { schoolName : body.schoolName,
                                studentName : body.studentName,
                                tuition : body.tuition,
                                loan : body.loan,
                                insurance : body.insurance,
                                equipmentFee : body.equipmentFee,
                                awards : body.awards}, function(err, data) {
                                  if(data['nModified'] == 0) {
                                    var error = new Error("No finance record found. Cannot do update. Bad Request.");
                                    error.statusCode = 400;
                                    return next(error);
                                  }
                                  if(err) return next(err);
                                  res.status(204); //put
                                  res.setHeader('Content-Type', 'application/json');
                                  res.json("Successfully update finance record.");
  });
}


function deleteFinanceRecord(request, res, next) {
  Finance.find({_id : req.swaggers.params.studentId.value});
}

function deleteStudent(req, res, next) {
    Student.find({_id : req.swagger.params.sid.value},function(err, data) {
          if(err) return next(err);

          else if(!data || data.length == 0) {
                var error = new Error ('Duplicate student found. Bad Request.');
                error.statusCode = 400;
                return next(error);
            }
            else {
                  Student.remove({_id: req.swagger.params.sid.value}, function(err,data) {

                
                //!
                res.setHeader('Content-Type', 'application/json');
                // var response = JSON.stringify(data, null, 2);
                // if(response['ok'] == 1) return res.end(JSON.stringify("OK"));
                // else return res.end(JSON.stringify(data, null, 2));
                res.status(204);
                res.json("Successfully delete student.");
              });
            }
  });

}