//Import the Data Models
var K12 = require('../../model/k-12model')
var awsInfo = require( "../../config/awsinfo.json" );
var AWS = require("aws-sdk");

var Q = require( "q" );
var chalk = require( "chalk" );

AWS.config.update({
  region: "us-east-1",
  endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var table = "K12";

// Create an instance of our SQS Client.
var sqs = new AWS.SQS({
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
  getK12Records: getK12Records,
  getK12Record: getK12Record,
  updateK12Record: updateK12Record,
  deleteK12Record: deleteK12Record,
  createK12Record: createK12Record,
  swaggergetK12Records: swaggergetK12Records,
  swaggergetK12Record: swaggergetK12Record,
  swaggercreateK12Record: swaggercreateK12Record,
  swaggerupdateK12Record: swaggerupdateK12Record,
  swaggerdeleteK12Record: swaggerdeleteK12Record
};


function getK12Records(msg) {
    var body = msg.body;
    var res = {"message" : "", "status" : 500, "data" : {}};
    var params = {
      TableName: table
    };
    console.log("Scanning table.");
    dynamodbDoc.scan(params, onScan);
    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            res.message = err.message;
            res.status = err.statusCode;
            sendToSqs(msg.responseQURL, res);
        } else {
            console.log("Scan succeeded.");
            console.log(data);
            console.log(typeof(data));
            res.message = "Scan succeeded."
            res.status = 200;
            res.data = JSON.stringify(data);
            sendToSqs(msg.responseQURL, res);
        }

        //To do:  res to queue
        console.log(res);

    }
}



function getK12Record(msg) { //get finance record by student id and school id
  var body = msg.body;
  var stuId = body.studentId;
  var schId = body.schoolId;
  var res = {"message" : "", "status" : 500, "data" : {}};
  var params = {
    TableName: table,
    ProjectionExpression: "#cid, #sid",
    FilterExpression: "#cid = :findcid and #sid = :findsid",
    ExpressionAttributeNames: {
        "#cid": "studentId",
        "#sid": "schoolId"
    },
    ExpressionAttributeValues: {
         ":findcid": stuId,
         ":findsid": schId
    }
  };

  console.log("Scanning table.");
  dynamodbDoc.scan(params, onScan);

  function onScan(err, data) {
      if (err) {
          console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
          res.message = err.message;
          res.status = err.statusCode;
          sendToSqs(msg.responseQURL, res);
      } else {
          // print all the movies
          console.log("Scan succeeded.");
          console.log(data);
          if(data.Count==0){
            res.status=404;
            res.data = JSON.stringify(data);
          }
          else{
            res.status = 200;
            res.data = JSON.stringify(data);
          }
          sendToSqs(msg.responseQURL, res);
      }

      //To do:  res to queue
      console.log(res);
      //sendToSqs(msg.responseQURL, res);
  }
}


function createK12Record(msg) {
  var body = msg.body;
  var res = {"message" : "", "status" : 500, "data" : {}};
  var params={
    TableName:table,
    Item: body
  };
  console.log("Adding a new item...");
  dynamodbDoc.put(params, function(err, data) {
      if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
          res.message = err.message;
          res.status = err.statusCode;
      } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          res.data = JSON.stringify(data);
          res.status = 201;
      }
        //To do:  res to queue
      console.log(res);
      sendToSqs(msg.responseQURL, res);
  });


}




function updateK12Record(msg) {
  var body = msg.body;
  var res = {"message" : "", "status" : 500, "data" : {}};
  var params = {
      TableName:table,
      Key:{
          "studentId": body.studentId,
          "schoolId": body.schoolId
      },
      UpdateExpression: "SET schoolName=:newschoolname, studentName=:newstudentname, startYear=:newsyear, endYear=:neweyear, graduated=:newgrad, degree=:newdegree",
      ExpressionAttributeValues:{
          ":newschoolname": body.schoolName,
          ":newstudentname": body.studentName,
          ":newsyear": body.startYear,
          ":neweyear": body.endYear,
          ":newgrad": body.graduated,
          ":newdegree": body.degree
      },
      // ReturnValues:"UPDATED_NEW"
  };

  console.log("Attempting a conditional update...");
  dynamodbDoc.update(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.message = err.message;
          res.status = err.statusCode;
      } else {
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          res.status=204;
          res.data = JSON.stringify(data);
      }
      console.log(res);
      sendToSqs(msg.responseQURL, res);
  });
}


function deleteK12Record(msg) {
  var body = msg.body;
  var res = {"message" : "", "status" : 500, "data" : {}};
  var stuId = body.studentId;
  var schId = body.schoolId;

  var params = {
    TableName: table,
    Key:{
        "studentId":stuId,
        "schoolId":schId
    }
  };
  console.log("Attempting a conditional delete...");
  dynamodbDoc.delete(params, function(err, data) {
      if (err) {
          console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
          res.message = err.message;
          res.status = err.statusCode;
      } else {
          console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
          res.status=204;
          res.data = JSON.stringify(data);
      }
      //To do:  res to queue
      console.log(res);
      sendToSqs(msg.responseQURL, res);
  });

}


function swaggergetK12Records(req, res, next) {

  var params = {
    TableName: table
  };

  console.log("Scanning table.");
  dynamodbDoc.scan(params, onScan);

  function onScan(err, data) {
      if (err) {
          console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
          var error = new Error('No k12 record found. Bad Request.');
          error.statusCode = 400;
          return next(error);
      } else {
          // print all the movies
          console.log("Scan succeeded.");
          console.log(data);
      }
      res.setHeader('Content-Type', 'application/json');
      res.status(200);
      res.end(JSON.stringify(data));
  }
}


function swaggergetK12Record(req, res, next) { //get finance record by student id and school id
  var stuId = req.swagger.params.studentId.value;
  var schId = req.swagger.params.schoolId.value;

  var params = {
    TableName: table,
    ProjectionExpression: "#cid, #sid",
    FilterExpression: "#cid = :findcid and #sid = :findsid",
    ExpressionAttributeNames: {
        "#cid": "studentId",
        "#sid": "schoolId"
    },
    ExpressionAttributeValues: {
         ":findcid": stuId,
         ":findsid": schId
    }
  };

  console.log("Scanning table.");
  dynamodbDoc.scan(params, onScan);

  function onScan(err, data) {
      if (err) {
          console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
          var error = new Error('No k12 record found. Bad Request.');
          error.statusCode = 400;
          return next(error);
      } else {
          // print all the movies
          console.log("Scan succeeded.");
          console.log(data);
      }
      res.setHeader('Content-Type', 'application/json');
      res.status(200);
      res.end(JSON.stringify(data));
  }

}


function swaggercreateK12Record(req, res, next) {
  var body = req.swagger.params.K12record.value;
  var params={
    TableName:table,
    Item: body
  };
  console.log("Adding a new item...");
  dynamodbDoc.put(params, function(err, data) {
      if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
          res.setHeader('Content-Type', 'application/json');
          res.status(400);
          res.json("Error creating new k12 record.");
          return next(error);
      } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
      }
  });
  res.setHeader('Content-Type', 'application/json');
  res.status(201);
  res.json("Successfully created new k12 record.");
}



function swaggerupdateK12Record(req, res, next) {
  var body = req.swagger.params.K12record.value;
  var params = {
      TableName:table,
      Key:{
          "studentId": body.studentId,
          "schoolId": body.schoolId
      },
      UpdateExpression: "SET schoolName=:newschoolname, studentName=:newstudentname, startYear=:newsyear, endYear=:neweyear, graduated=:newgrad, degree=:newdegree",
      ExpressionAttributeValues:{
          ":newschoolname": body.schoolName,
          ":newstudentname": body.studentName,
          ":newsyear": body.startYear,
          ":neweyear": body.endYear,
          ":newgrad": body.graduated,
          ":newdegree": body.degree
      },
      // ReturnValues:"UPDATED_NEW"
  };

  console.log("Attempting a conditional update...");
  dynamodbDoc.update(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.setHeader('Content-Type', 'application/json');
          res.status(400);
          res.json("Error updating new k12 record.");
          return next(error);
      } else {
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          res.status(204); //put
          res.setHeader('Content-Type', 'application/json');
          res.json("Successfully update k12 record.");
      }
  });
}



function swaggerdeleteK12Record(req, res, next) {
  var stuId = req.swagger.params.studentId.value;
  var schId = req.swagger.params.schoolId.value;

  var params = {
    TableName: table,
    Key:{
        "studentId":stuId,
        "schoolId":schId
    }
  };
  console.log("Attempting a conditional delete...");
  dynamodbDoc.delete(params, function(err, data) {
      if (err) {
          console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
          res.setHeader('Content-Type', 'application/json');
          res.status(400);
          res.json("Error deleting new k12 record.");
          return next(error);
      } else {
          console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
          res.status(204);
          res.json("Successfully deleted k12 record.");
      }
  });
}
