
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const fail = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
};

// 1. Add a product to the cart
const addToCart = async (customerId, productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        fail('Quantity must be a positive integer');
    }

    const product = await Product.findById(productId);

    if (!product) {
        fail('Product not found', 404);
    }

    if (product.status !== 'available') {
        fail('Product is not available', 409);
    }

    const cart = await Cart.findOne({ customer: customerId });

    const existingProduct = cart?.products.find(
        item => item.product.toString() === productId
    );

    const totalQuantity = existingProduct
        ? existingProduct.quantity + quantity
        : quantity;

    if (totalQuantity > product.stock) {
        fail('Requested quantity exceeds available stock', 409);
    }

    if (!cart) {
        return await Cart.create({
            customer: customerId,
            products: [{ product: productId, quantity }]
        });
    }

    if (existingProduct) {
        existingProduct.quantity = totalQuantity;
    } else {
        cart.products.push({ product: productId, quantity });
    }

    await cart.save();
    return cart;
};

// 2. Get the customer's cart
const getMyCart = async (customerId) => {
    return Cart.findOne({ customer: customerId })
        .populate({
            path: 'products.product',
            select: '-productionCost -reviewFeedback -__v'
        })
        .exec();
};

// 3. Update product quantity
const updateCartQuantity = async (customerId, productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
    }

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
        fail('Cart not found', 404);
    }

    const productIndex = cart.products.findIndex(
        item => item.product.toString() === productId
    );

    if (productIndex === -1) {
        fail('Product not found in cart', 404);
    }

    const product = await Product.findById(productId);

    if (!product) {
        fail('Product not found', 404);
    }

    if (product.status !== 'available') {
        fail('Product is not available', 409);
    }

    if (quantity > product.stock) {
        fail('Requested quantity exceeds available stock', 409);
    }

    cart.products[productIndex].quantity = quantity;

    await cart.save();
    return cart;
};

// 4. Remove a product from the cart
const removeFromCart = async (customerId, productId) => {
    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
        fail('Cart not found', 404);
    }

    const productIndex = cart.products.findIndex(
        item => item.product.toString() === productId
    );

    if (productIndex === -1) {
        fail('Product not found in cart', 404);
    }

    cart.products.splice(productIndex, 1);

    await cart.save();
    return cart;
};

module.exports = {
    addToCart,
    getMyCart,
    updateCartQuantity,
    removeFromCart
};
