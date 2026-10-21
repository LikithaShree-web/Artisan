
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
                { returnDocument: 'after' }
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
        .populate({
            path: 'items.product',
            select: '-productionCost -reviewFeedback -__v'
        })
        .sort({ createdAt: -1 });
};

// 3. Get one order belonging to a customer
const getCustomerOrderById = async (customerId, orderId) => {
    return Order.findOne({
        _id: orderId,
        customer: customerId
    }).populate({
        path: 'items.product',
        select: '-productionCost -reviewFeedback -__v'
    });
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
    const transitions = {
        placed: ['accepted', 'cancelled'],
        accepted: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: []
    };
    if (!Object.hasOwn(transitions, newStatus)) {
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

    if (!transitions[item.status]?.includes(newStatus)) {
        throw new Error(`Cannot move an order item from ${item.status} to ${newStatus}`);
    }

    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            items: { $elemMatch: { _id: itemId, artisan: artisanId, status: item.status } }
        },
        { $set: { 'items.$.status': newStatus } },
        { returnDocument: 'after' }
    );
    if (!updatedOrder) {
        throw new Error('Order item status changed; reload the order and try again');
    }

    if (newStatus === 'cancelled') {
        const restored = await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
        );
        if (!restored) {
            throw new Error('Order was cancelled but product stock could not be restored; contact support');
        }
    }

    const itemStatuses = updatedOrder.items.map((orderItem) => orderItem.status);

    if (itemStatuses.every(status => status === 'delivered')) {
        updatedOrder.status = 'delivered';
    } else if (itemStatuses.every(status => status === 'cancelled')) {
        updatedOrder.status = 'cancelled';
    } else if (itemStatuses.some(status => status === 'shipped')) {
        updatedOrder.status = 'shipped';
    } else if (itemStatuses.some(status => status === 'processing')) {
        updatedOrder.status = 'processing';
    } else if (itemStatuses.some(status => status === 'accepted')) {
        updatedOrder.status = 'accepted';
    } else {
        updatedOrder.status = 'placed';
    }

    await updatedOrder.save();
    return updatedOrder;
};

module.exports = {
    placeOrder,
    getCustomerOrders,
    getCustomerOrderById,
    getArtisanOrders,
    updateArtisanItemStatus
};
