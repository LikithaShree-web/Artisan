const mongoose=require('mongoose');

const data=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true 
    },
    category:{
        type:String,
        required:true 
    },
    price:{
        type:Number,
        required:true 
    },
    stock:{
        type:Number,
        required:true 
    },
    image:{
        type:String,
        required:true 
    },
     artisan:{
        type:mongoose.Schema.Types.ObjectId,
        required:true ,
        ref:"Artisan"
    },
     status: {
    type: String,
    enum: ['pending', 'available', 'rejected'],
    default: 'pending',
    required: true
},
     productionCost:{
        type:Number,
        required:true 
    },
});

const model=mongoose.model("Product",data);

module.exports=model;