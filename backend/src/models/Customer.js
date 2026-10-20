const mongoose=require('mongoose');
 
const customer=mongoose.Schema({
name:{
    type:String,
    required:true
},
email:{
    type:String,
    required:true 
},
phone:{
    type:String,
    required:true 
},
password:{
    type:String,
    required:true 
}
});

const model=mongoose.model('Customer', customer);

module.exports=model;