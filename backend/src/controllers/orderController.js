
const orderService = require('../services/orderService');

const placeOrder = async (req, res) => {
    try {
        const order = await orderService.placeOrder(
            req.customerId,
            req.body.deliveryAddress
        );

        return res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await orderService.getCustomerOrders(
            req.customerId
        );

        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getMyOrderById = async (req, res) => {
    try {
        const order = await orderService.getCustomerOrderById(
            req.customerId,
            req.params.orderId
        );

        if (!order) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }

        return res.status(200).json(order);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid order ID'
            });
        }

        return res.status(500).json({
            message: error.message
        });
    }
};

const getArtisanOrders = async (req, res) => {
    try {
        const orders = await orderService.getArtisanOrders(
            req.artisanId
        );

        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const updateArtisanItemStatus = async (req, res) => {
    try {
        const order = await orderService.updateArtisanItemStatus(
            req.artisanId,
            req.params.orderId,
            req.params.itemId,
            req.body.status
        );

        return res.status(200).json({
            message: 'Order item status updated',
            order
        });
    } catch (error) {
        const statusCode = error.name === 'CastError' ? 400 : 400;

        return res.status(statusCode).json({
            message: error.message
        });
    }
};

module.exports = {
    placeOrder,
    getMyOrders,
    getMyOrderById,
    getArtisanOrders,
    updateArtisanItemStatus
};
