const express=require('express');
const dotenv=require('dotenv');
const cors=require('cors');
const db=require('./src/config/db');
const authRoute=require('./src/routes/authRoute');
const productRoute=require('./src/routes/productRoute');
const customerRoute=require('./src/routes/customerRoute');
const cartRoute=require('./src/routes/cartRoute');
const orderRoute = require('./src/routes/orderRoute');

dotenv.config();
const app=express();
    
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.get('/',(req,res)=>{
    res.send('Server is running on 5000');
});

db();

app.use('/api/auth',authRoute);
app.use('/api/products',productRoute);
app.use('/api/customers',customerRoute);
app.use('/api/cart',cartRoute);
app.use('/api/orders', orderRoute);


const PORT=process.env.PORT||5000;

app.listen(PORT,()=>{
    console.log('Server connected');
});