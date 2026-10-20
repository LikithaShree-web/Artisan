const model=require('../models/Artisan');
const bcryptjs=require('bcryptjs');
const jsonwebtoken=require('jsonwebtoken');

const details=async(name,phone,email,password)=>{
    const existingArtisan=await model.findOne({email:email});
    if(existingArtisan){
        return "User already exists";
    }
    else{
        const hashedPassword=await bcryptjs.hash(password,10);
   await model.create({name:name 
        ,phone:phone, 
        email:email, 
        password: hashedPassword});
    return "User created";
    }
};

const login=async(email,password)=>{
    const existingArtisan=await model.findOne({email:email});
    if(existingArtisan){
        if(await bcryptjs.compare(password, existingArtisan.password )){
           const token= jsonwebtoken.sign({artisanId:existingArtisan._id}, process.env.JWT_SECRET_PASSWORD);
           return token;

        }
        else{
            return "wrong password";
        }
    }
    else{
        return "User not found";
    }
};

module.exports={
    details,
    login}
    ;