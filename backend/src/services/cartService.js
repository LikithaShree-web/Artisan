
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// 1. Add a product to the cart
const addToCart = async (customerId, productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new Error('Product not found');
    }

    if (product.status !== 'available') {
        throw new Error('Product is not available');
    }

    const cart = await Cart.findOne({ customer: customerId });

    const existingProduct = cart?.products.find(
        item => item.product.toString() === productId
    );

    const totalQuantity = existingProduct
        ? existingProduct.quantity + quantity
        : quantity;

    if (totalQuantity > product.stock) {
        throw new Error('Requested quantity exceeds available stock');
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
        .populate('products.product')
        .exec();
};

// 3. Update product quantity
const updateCartQuantity = async (customerId, productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
    }

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
        throw new Error('Cart not found');
    }

    const productIndex = cart.products.findIndex(
        item => item.product.toString() === productId
    );

    if (productIndex === -1) {
        throw new Error('Product not found in cart');
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new Error('Product not found');
    }

    if (product.status !== 'available') {
        throw new Error('Product is not available');
    }

    if (quantity > product.stock) {
        throw new Error('Requested quantity exceeds available stock');
    }

    cart.products[productIndex].quantity = quantity;

    await cart.save();
    return cart;
};

// 4. Remove a product from the cart
const removeFromCart = async (customerId, productId) => {
    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
        throw new Error('Cart not found');
    }

    const productIndex = cart.products.findIndex(
        item => item.product.toString() === productId
    );

    if (productIndex === -1) {
        throw new Error('Product not found in cart');
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
