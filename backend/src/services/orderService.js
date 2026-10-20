
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// 1. Place an order from the customer's cart
const placeOrder = async (customerId, deliveryAddress) => {
    if (
        typeof deliveryAddress !== 'string' ||
        deliveryAddress.trim().length < 5
    ) {
        throw new Error('Please provide a valid delivery address');
    }

    const cart = await Cart.findOne({ customer: customerId })
        .populate('products.product');

    if (!cart || cart.products.length === 0) {
        throw new Error('Your cart is empty');
    }

    const orderItems = [];
    const deductedStock = [];
    let createdOrder = null;

    try {
        for (const cartItem of cart.products) {
            const product = cartItem.product;

            if (!product) {
                throw new Error('A product in your cart no longer exists');
            }

            if (product.status !== 'available') {
                throw new Error(
                    `${product.name} is not available for purchase`
                );
            }

            if (cartItem.quantity > product.stock) {
                throw new Error(
                    `Insufficient stock for ${product.name}`
                );
            }

            // Atomically deduct stock only if enough stock remains.
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: product._id,
                    status: 'available',
                    stock: { $gte: cartItem.quantity }
                },
                {
                    $inc: { stock: -cartItem.quantity }
                },
                { new: true }
            );

            if (!updatedProduct) {
                throw new Error(
                    `Stock changed or product unavailable: ${product.name}`
                );
            }

            deductedStock.push({
                productId: product._id,
                quantity: cartItem.quantity
            });

            orderItems.push({
                product: product._id,
                artisan: product.artisan,
                productName: product.name,
                quantity: cartItem.quantity,
                unitPrice: product.price,
                subtotal: product.price * cartItem.quantity
            });
        }

        const totalAmount = orderItems.reduce(
            (total, item) => total + item.subtotal,
            0
        );

        createdOrder = await Order.create({
            customer: customerId,
            items: orderItems,
            deliveryAddress: deliveryAddress.trim(),
            totalAmount,
            paymentMethod: 'cash_on_delivery',
            status: 'placed'
        });

        // Clear the cart only after creating the order.
        cart.products = [];
        await cart.save();

        return createdOrder;
    } catch (error) {
        // If checkout fails, attempt to restore deducted stock.
        if (!createdOrder) {
            for (const item of deductedStock) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: item.quantity } }
                );
            }
        }

        throw error;
    }
};

// 2. Get all orders belonging to a customer
const getCustomerOrders = async (customerId) => {
    return Order.find({ customer: customerId })
        .populate('items.product')
        .sort({ createdAt: -1 });
};

// 3. Get one order belonging to a customer
const getCustomerOrderById = async (customerId, orderId) => {
    return Order.findOne({
        _id: orderId,
        customer: customerId
    }).populate('items.product');
};

// 4. Get orders that contain products belonging to an artisan
const getArtisanOrders = async (artisanId) => {
    return Order.find({
        'items.artisan': artisanId
    })
        .populate('customer', 'name email phone')
        .populate('items.product')
        .sort({ createdAt: -1 });
};

// 5. Update the status of one item belonging to an artisan
const updateArtisanItemStatus = async (
    artisanId,
    orderId,
    itemId,
    newStatus
) => {
    const allowedStatuses = [
        'accepted',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
    ];

    if (!allowedStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
    }

    const order = await Order.findOne({
        _id: orderId,
        'items._id': itemId,
        'items.artisan': artisanId
    });

    if (!order) {
        throw new Error('Order item not found for this artisan');
    }

    const item = order.items.id(itemId);

    if (!item) {
        throw new Error('Order item not found');
    }

    if (item.status === 'delivered' || item.status === 'cancelled') {
        throw new Error('This order item can no longer be updated');
    }

    // If an artisan cancels before dispatch, return stock.
    if (newStatus === 'cancelled') {
        if (['shipped', 'delivered'].includes(item.status)) {
            throw new Error('A shipped or delivered item cannot be cancelled');
        }

        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
        );
    }

    item.status = newStatus;

    const itemStatuses = order.items.map(item => item.status);

    if (itemStatuses.every(status => status === 'delivered')) {
        order.status = 'delivered';
    } else if (itemStatuses.every(status => status === 'cancelled')) {
        order.status = 'cancelled';
    } else if (itemStatuses.some(status => status === 'shipped')) {
        order.status = 'shipped';
    } else if (itemStatuses.some(status => status === 'processing')) {
        order.status = 'processing';
    } else if (itemStatuses.some(status => status === 'accepted')) {
        order.status = 'accepted';
    } else {
        order.status = 'placed';
    }

    await order.save();
    return order;
};

module.exports = {
    placeOrder,
    getCustomerOrders,
    getCustomerOrderById,
    getArtisanOrders,
    updateArtisanItemStatus
};
