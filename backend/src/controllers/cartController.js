const cartService=require('../services/cartService');

const addToCart=async(req,res)=>{
const customerId=req.customerId;
const productId=req.body.productId;
const quantity=req.body.quantity;
try{
 const cart=await cartService.addToCart(customerId,productId,quantity);
 res.status(200).send(cart);
}
catch(error){
res.status(500).send({ error: error.message });
}
};

const getMyCart=async(req,res)=>{
    const customerId=req.customerId;
    try{
        const cart=await cartService.getMyCart(customerId);
        if(!cart){
            res.status(404).send({message:"Cart not found"});
        }
        else{
        res.status(200).send(cart);
        }

    }
    catch(error){
        res.status(500).send({ error: error.message     });
    }
};

const updateCartQuantity=async(req,res)=>{
    const customerId=req.customerId;
    const productId=req.body.productId;
    const quantity=req.body.quantity;
    try{
        const cart=await cartService.updateCartQuantity(customerId,productId,quantity);
        res.status(200).send(cart);
    }
    catch(error){
        res.status(500).send({ error: error.message });
    }
};

const removeFromCart=async(req,res)=>{
    const customerId=req.customerId;
    const productId=req.body.productId;
    try{
        const cart=await cartService.removeFromCart(customerId,productId);
        res.status(200).send(cart);
    }
    catch(error){
        res.status(500).send({ error: error.message });
    }
};  

module.exports={addToCart,
    getMyCart,
    updateCartQuantity,
    removeFromCart
};