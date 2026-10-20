const model=require('../models/Product');

const createProduct=async (name,category,description,price,stock,image,productionCost,status,artisan)=>{
 const product=   await model.create({name:name,
        category:category,
        image:image, 
        description:description,
        price:price,
        stock:stock,
        productionCost:productionCost,
        status:status,
        artisan:artisan
    });
    return product;
};

const getAllProducts=async()=>{
const products=await model.find();
return products;
};

const getOneProduct=async(id)=>{
    const product=await model.findById(id);
    return product;
}

const updateProduct = async (id, name, description, category, price, stock, productionCost, status) => {

    const product = await model.findByIdAndUpdate(
        id,
        {
            name: name,
            description: description,
            category: category,
            price: price,
            stock: stock,
            productionCost: productionCost,
            status: status
        },
        { new: true }
    );

    return product;
};

const deleteProduct=async(id)=>{
    await model.findByIdAndDelete(id);
    return "Deleted successfully";
}

module.exports={createProduct,getAllProducts,
    getOneProduct, updateProduct,deleteProduct
};

