//Import the Data Models
var Finance = require('../../model/financemodel');
var awsInfo = require( "../../config/awsinfo.json" );

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

var sendMessage = Q.nbind( sqs.sendMessage, sqs );


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

module.exports = {
  getFinanceRecords: getFinanceRecords,
  getFinanceRecord: getFinanceRecord,
  updateFinanceRecord: updateFinanceRecord,
  deleteFinanceRecord: deleteFinanceRecord,
  createFinanceRecord: createFinanceRecord,
  swaggergetFinanceRecords: swaggergetFinanceRecords,
  swaggergetFinanceRecord: swaggergetFinanceRecord,
  swaggercreateFinanceRecord: swaggercreateFinanceRecord,
  swaggerupdateFinanceRecord: swaggerupdateFinanceRecord,
  swaggerdeleteFinanceRecord: swaggerdeleteFinanceRecord 
};


//response {"message" : "", "status" : 500, "data" : ""}
//To do: design request
//request {"body":{}, "action": "getFinanceRecords", "responseQURL": "", "responseQTopicARN": ""}
// request example:
//  {"body" : {"studentId":1, "schoolId":1, "schoolName":"Columbia University", "studentName": "Chencheng Du",
//              "tuition": 50000, "loan" : 10000, "insurance":5000, "equipmentFee":2000, "awards": 50000}, 
//   "action": "getFinanceRecord", "responseQURL": "", "responseQTopicARN": ""}
//

function getFinanceRecords(msg) {
  //To do: need to get response queue info from msg
  Finance.find({}, function (err, data) {
    var res = {"message" : "", "status" : 500, "data" : ""};
    if(err) {
      res.message = err.message;
      res.status = err.statusCode;
    }
    //successful
    else {
      res.status = 200;
      res.message = "Successfully get finance records.";
      res.data = data;
    }
    //To do: send res to queue
    console.log(res);
    sendToSqs(msg.responseQURL, res);
  });
}



function getFinanceRecord(msg) { //get finance record by student id and school id
  var body = msg.body;
  var stuId = body.studentId;
  var schId = body.schoolId;
  var res = {"message" : "", "status" : 500, "data" : {}};
  

  Finance.find({_id : stuId, schoolId : schId}, function (err, data) {
    if(err) {
      res.message = err.message;
      res.status = err.statusCode;
    }
    else if(!data || data.length == 0) {
      res.status = 400;
      res.message = 'No finance record found. Bad Request.';
    }
    else {
      res.status = 200;
      res.message = "Successful";
      res.data = data;
    }
    //To do: send res to queue
    console.log(res);
    sendToSqs(msg.responseQURL, res);
  });
}


function createFinanceRecord(msg) {
  var body = msg.body;
  var res = {"message" : "", "status" : 500, "data" : {}};
  var newRecord = new Finance({ _id : body.studentId,
                                schoolId : body.schoolId,
                                schoolName : body.schoolName,
                                studentName : body.studentName,
                                tuition : body.tuition,
                                loan : body.loan,
                                insurance : body.insurance,
                                equipmentFee : body.equipmentFee,
                                awards : body.awards});
  Finance.find({_id : body.studentId, schoolId : body.schoolId}, function (err, data) {
    if(err) {
      res.message = err.message;
      res.status = err.statusCode;
      //To do: send res to queue
      sendToSqs(msg.responseQURL, res);
    }
    else if(data.length != 0) {
      res.status = 400;
      res.message = 'Duplicate record found. Bad Request.';
      //To do: send res to queue
      sendToSqs(msg.responseQURL, res);
    }
    else {
      newRecord.save(function (err, newRecord, data) {
        if(err) {
          res.status = err.statusCode;
          res.message = err.message;
        }
        else {
          res.status = 201;
          res.message = "Successfully created new finance record.";
          res.data = data;
          //To do: send res to queue
          console.log(res);
          sendToSqs(msg.responseQURL, res);
        }
      });
    }
  });
}




function updateFinanceRecord(msg) {
  var body = msg.body;
  var res = {"message" : "", "status" : 500, "data" : {}};
  Finance.update({_id : body.studentId, schoolId : body.schoolId}, 
                              { schoolName : body.schoolName,
                                studentName : body.studentName,
                                tuition : body.tuition,
                                loan : body.loan,
                                insurance : body.insurance,
                                equipmentFee : body.equipmentFee,
                                awards : body.awards}, function (err, data) {
                                  if(data['nModified'] == 0) {
                                    res.message = "No finance record found. Cannot do update. Bad Request.";
                                    res.status = 400;
                                  }
                                  if(err) {
                                    res.message = err.message;
                                    res.status = err.statusCode;
                                  }
                                  else {
                                    res.status = 204; //put
                                    res.message = "Successfully update finance record.";
                                    res.data = data;
                                    console.log(res);
                                  }
                                  //To do: send res to queue
                                  sendToSqs(msg.responseQURL, res);
  });
}


function deleteFinanceRecord(msg) {
  var body = msg.body;
  var stuId = body.studentId;
  var schId = body.schoolId;
  var res = {"message" : "", "status" : 500, "data" : {}};

  Finance.find({_id : stuId, schoolId : schId}, function (err, data) {
    if(err) {
      res.status = err.statusCode;
      res.message = err.message;
      //To do: send res to queue
      sendToSqs(msg.responseQURL, res);
    }
    else if(!data || data.length == 0) {
      res.message = "No finance record found. Bad Request.";
      res.status = 400;
      //To do: send res to queue
      sendToSqs(msg.responseQURL, res);
    }
    else {
      Finance.remove({_id : stuId, schoolId : schId}, function (err, data) {
        if(err) {
          res.status = err.statusCode;
          res.message = err.message;
        }
        else {
          res.status = 204;
          res.message = "Successfully delete finance record.";
          res.data = data;
        }
        //To do: send res to queue
        sendToSqs(msg.responseQURL, res);
        console.log(res);
      });
    }  
  });
}


function swaggergetFinanceRecords(req, res, next) {
  //console.log(request);
  Finance.find({}, function(err, data) {
    if(err) return next(err);
    res.json(data);
  });
}


function swaggergetFinanceRecord(req, res, next) { //get finance record by student id and school id
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


function swaggercreateFinanceRecord(req, res, next) {
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



function swaggerupdateFinanceRecord(req, res, next) {
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



function swaggerdeleteFinanceRecord(req, res, next) {
  Finance.find({_id : req.swagger.params.studentId.value, schoolId: req.swagger.params.schoolId.value}, function (err, data) {
    if(err) return next(err);
    else if(!data || data.length == 0) {
      var error = new Error ("Duplicate finance record found. Bad Request.");
      error.statusCode = 400;
      return next(error);
    }
    else {
      Finance.remove({_id: req.swagger.params.studentId.value, schoolId : req.swagger.params.schoolId.value}, function (err, data) {
        if(err) return next(err);
        else {
          res.status(204);
          res.json("Successfully delete finance record.");
        }
      });
    }
  });
}
