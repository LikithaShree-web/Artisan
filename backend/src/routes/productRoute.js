const express=require('express');

const route=express.Router();

const productController=require('../controllers/productController');

const artisan=require('../middleware/artisanMiddleware');

const product=require('../middleware/uploadMiddleware');

route.post('/create', artisan, product.single('image'), productController.createProduct);

route.get('/', productController.getAllProducts);

route.get('/:id',productController.getOneProduct);

route.put('/:id',artisan,productController.updateProduct);

route.delete('/:id',artisan,productController.deleteProduct);

module.exports=route;