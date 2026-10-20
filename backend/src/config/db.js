const mongoose=require('mongoose');

const data=async()=>{
     await mongoose.connect(process.env.MONGO_URL)
     console.log("Database connected");
};



module.exports=data;