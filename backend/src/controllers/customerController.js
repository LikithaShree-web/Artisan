const customerService=require('../services/customerService');
 
const registerCustomer=async(req,res)=>{
    const name=req.body.name;
    const email=req.body.email;
    const phone=req.body.phone;
    const password=req.body.password;
    const customer = await customerService.registerCustomer(name,email,phone,password);
    res.send(customer);
};

const loginCustomer=async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
   const customer=  await customerService.loginCustomer(email,password);
    res.send(customer);
}

const checkCustomer=(req,res)=>{
    const customerId=req.customerId;
    res.send(customerId);
}

module.exports={registerCustomer,
    loginCustomer,
    checkCustomer
};