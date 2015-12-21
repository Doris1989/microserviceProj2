var DynamoDBModel = require('dynamodb-model');

//connect to database
var AWS = require('aws-sdk');
var awsInfo = require('../config/awsinfo');

// setup region and credentials
AWS.config.update({
	'region' : awsInfo.region,
	'accessKeyId' : awsInfo.accessKey,
	'secretAccessKey': awsInfo.secretKey
});


AWS.config.update({
  endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "K12",
    KeySchema: [
        { AttributeName: "studentId", KeyType: "HASH"},  //Partition key
        { AttributeName: "schoolId", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "studentId", AttributeType: "N" },
        { AttributeName: "schoolId", AttributeType: "N" }
				// { AttributeName: "studentName", AttributeType: "S"  },
				// { AttributeName: "schoolName", AttributeType: "S"  },
				// { AttributeName: "startYear", AttributeType: "N"  },
				// { AttributeName: "endYear", AttributeType: "N"  },
				// { AttributeName: "degree", AttributeType: "S"  }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

// already created
// dynamodb.createTable(params, function(err, data) {
//     if (err) {
//         console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
//     } else {
//         console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
//     }
// });
