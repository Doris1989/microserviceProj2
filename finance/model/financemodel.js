
var mongoose = require('mongoose');

//connect to database
mongoose.connect('mongodb://localhost/microservice');

// var Schema=mongoose.Schema;
// var Course_Schema = new Schema({},{strict:false});

var Schema = mongoose.Schema

 
var finance = new Schema({
   	_id	: Number //_id is studentId
  , schoolId : Number
  , schoolName : String
  , studentName : String
  , tuition : Number  
  , loan	: Number
  , insurance	: Number
  , equipmentFee : Number
  , awards : Number
  , strict	  : false
},
{
	versionKey : false
});



module.exports=mongoose.model('finance',finance);