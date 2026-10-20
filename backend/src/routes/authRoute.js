const express=require('express');
const pushDetails = require('../controllers/authController');
const checkToken=require('../middleware/artisanMiddleware');
const route=express.Router();

route.post('/register',pushDetails.pushDetails);

route.post('/login',pushDetails.login)

route.post('/check',checkToken,pushDetails.checkProfile);


module.exports=route;
