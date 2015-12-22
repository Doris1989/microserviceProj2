
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/microservice');

var finance = new mongoose.Schema({
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
