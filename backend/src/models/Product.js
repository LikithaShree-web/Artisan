const mongoose = require('mongoose');

const data = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    image: {
        type: String,
        required: true
    },
    artisan: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Artisan'
    },
    status: {
        type: String,
        enum: ['pending', 'available', 'rejected'],
        default: 'pending',
        required: true
    },
    reviewFeedback: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    productionCost: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
}, { timestamps: true });

const model = mongoose.model('Product', data);

module.exports = model;
