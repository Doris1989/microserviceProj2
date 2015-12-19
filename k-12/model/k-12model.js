var DynamoDBModel = require('dynamodb-model');

//connect to database
var AWS = require('aws-sdk');
var awsInfo = require('./config/awsinfo');

// setup region and credentials
AWS.config.update({
	'region' : awsInfo.region,
	'accessKeyId' : awsInfo.accessKey,
	'secretAccessKey': awsInfo.secretKey
});


//use studentId and schoolId as primary key
var k12Schema = new DynamoDBModel.Schema({
	studentId : {
		type: Number,
		key: 'hash'
	},
	schoolId : {
		type: Number,
		key: 'range'
	},
	studentName : String,
	schoolName : String,
	startYear : Number,
	endYear : Number, //0 if not graduated yet
	isGraduated : Boolean,
	currentEnroll : Boolean,
	degree : String
});

//module.exports=mongoose.model('finance',finance);
var k12 = new DynamoDBModel.Model('k12', k12Schema);

// the model provides methods for all DynamoDB operations
// no need to check for table status, we can start using it right away
// productTable.putItem(/* ... */);
// productTable.getItem(/* ... */);
// productTable.updateItem(/* ... */);
// productTable.deleteItem(/* ... */);