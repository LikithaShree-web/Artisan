const details=require('../services/authService');


const pushDetails=async(req ,res)=>{
    const name=req.body.name;
    const email=req.body.email;
    const phone=req.body.phone;
    const password=req.body.password;
   const result= await details.details(name,phone,email,password);
   res.send(result);
   
};

const login=async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const result=await details.login(email,password);
    res.send(result);
}

const checkProfile=(req,res)=>{
    res.send(req.artisanId);
};

module.exports={
    pushDetails,
    login,
checkProfile
};