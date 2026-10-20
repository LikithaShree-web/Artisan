const jsonwebtoken=require('jsonwebtoken');

const checkToken=(req,res,next)=>{
   const customerHeader=req.headers.authorization;
   if(customerHeader){
    const token=customerHeader.split(' ')[1];
    try{
        const decoded=jsonwebtoken.verify(token,process.env.JWT_SECRET_PASSWORD);
        req.customerId=decoded.customerId;
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

module.exports={checkToken};