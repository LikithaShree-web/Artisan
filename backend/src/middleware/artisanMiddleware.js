const jsonwebtoken=require('jsonwebtoken');

const checkToken=(req,res,next)=>{
const authHeader=req.headers.authorization;
if(authHeader){
const token=authHeader.split(' ')[1];
try{
const decoded=jsonwebtoken.verify(token,process.env.JWT_SECRET_PASSWORD);
req.artisanId=decoded.artisanId;
next();
}
catch(error){
    res.status(401).send(error.message);
}
}
else{
    res.status(401).send("Error found");
}
};

module.exports=checkToken;