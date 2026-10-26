const mongoose = require('mongoose');
const { ensureBootstrapAdmin } = require('../services/adminService');

const data = async () => {
    if (!process.env.MONGO_URL) {
        throw new Error('MONGO_URL must be configured before starting the API.');
    }
    if (!process.env.JWT_SECRET_PASSWORD) {
        throw new Error('JWT_SECRET_PASSWORD must be configured before starting the API.');
    }
    if (process.env.JWT_SECRET_PASSWORD.length < 32) {
        console.warn('JWT_SECRET_PASSWORD is shorter than the recommended 32 characters; rotate it before production use.');
    }
   await mongoose.connect(process.env.MONGO_URL);
console.log('Connected database:', mongoose.connection.name);
await ensureBootstrapAdmin();
console.log('Database connected');
};

module.exports = data;
