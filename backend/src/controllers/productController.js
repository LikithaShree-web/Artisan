const productService=require('../services/productService');

const createProduct=async(req,res)=>{
      console.log(req.file);
      const name=req.body.name;
      const image=req.file.filename;
      const stock=req.body.stock;
      const price=req.body.price;
      const description=req.body.description;
      const productionCost=req.body.productionCost;
      const status=req.body.status;
      const artisan=req.artisanId;
      const category=req.body.category;
     const product=await productService.createProduct(name, category, description, price, stock, image, productionCost, status, artisan);
     res.send(product);
};

const getAllProducts=async(req,res)=>{
      const products=await productService.getAllProducts();
      res.send(products);
};


const getOneProduct=async(req,res)=>{
      const id=req.params.id;
      const product=await productService.getOneProduct(id);
      res.send(product);
};

const updateProduct=async(req,res)=>{
      const id=req.params.id;
      const name=req.body.name;
      const stock=req.body.stock;
      const description=req.body.description;
      const status=req.body.status;
      const price=req.body.price;
      const category=req.body.category;
      const productionCost=req.body.productionCost;
      const update=await productService.updateProduct(id,name,description,category,price,stock,productionCost,status);
      res.send(update);
};

const deleteProduct=async(req,res)=>{
      const id=req.params.id;
      const del=await productService.deleteProduct(id);
      res.send(del);
};


module.exports={createProduct,
      getAllProducts,getOneProduct,
updateProduct, deleteProduct};