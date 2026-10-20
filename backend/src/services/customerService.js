const model=require('../models/Customer');
const bcryptjs=require('bcryptjs')
const jsonwebtoken=require('jsonwebtoken');

const registerCustomer=async(name,email,phone,password)=>{
     if(await model.findOne({email:email})){
        return "Already Registered";
    }
    else{
            const hashedPassword=await bcryptjs.hash(password,10);
      const customer= await model.create({
        name:name,
        email:email,
        phone:phone,
        password:hashedPassword});
        return customer;
    }
};

const loginCustomer=async(email,password)=>{
    const customer=await model.findOne({email:email});
if( customer){
    if(await bcryptjs.compare(password,customer.password)){
    const jsonWebToken=jsonwebtoken.sign({customerId:customer._id},
        process.env.JWT_SECRET_PASSWORD);
    return jsonWebToken;
    }
    else{
        return "Wrong Password";
    }
}
else{
    return "User not found";
}
};

module.exports={registerCustomer, loginCustomer};
 