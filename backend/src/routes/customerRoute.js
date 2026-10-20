const express=require('express');
const route=express.Router();

const customerController=require('../controllers/customerController');
const customerMiddleware=require('../middleware/customerMiddleware');


route.post('/register',customerController.registerCustomer);
route.get('/check',customerMiddleware.checkToken,customerController.checkCustomer);
route.post('/login',customerController.loginCustomer);


module.exports=route;