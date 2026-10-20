
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    artisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artisan',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['placed', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'placed'
    }
});

const orderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    items: {
        type: [orderItemSchema],
        validate: {
            validator: items => items.length > 0,
            message: 'An order must contain at least one item'
        }
    },
    deliveryAddress: {
        type: String,
        required: true,
        trim: true
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash_on_delivery'],
        default: 'cash_on_delivery'
    },
    status: {
        type: String,
        enum: ['placed', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'placed'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
