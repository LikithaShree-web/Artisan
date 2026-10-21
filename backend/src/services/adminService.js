const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getDashboard = async () => {
  const [totalArtisans, totalCustomers, totalProducts, pendingProducts, approvedProducts, rejectedProducts, totalOrders, pendingOrders, deliveredOrders] = await Promise.all([
    Artisan.countDocuments(),
    Customer.countDocuments(),
    Product.countDocuments(),
    Product.countDocuments({ status: 'pending' }),
    Product.countDocuments({ status: 'available' }),
    Product.countDocuments({ status: 'rejected' }),
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['placed', 'accepted', 'processing', 'shipped'] } }),
    Order.countDocuments({ status: 'delivered' }),
  ]);

  const [sales, ordersByStatus, inventory] = await Promise.all([
    Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.status': 'delivered' } },
      { $group: { _id: null, totalSales: { $sum: '$items.subtotal' } } }
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Product.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: null, availableInventory: { $sum: '$stock' } } }
    ])
  ]);

  return {
    totalArtisans,
    totalCustomers,
    totalProducts,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    deliveredSales: sales[0]?.totalSales || 0,
    ordersByStatus: Object.fromEntries(ordersByStatus.map(({ _id, count }) => [_id, count])),
    availableInventory: inventory[0]?.availableInventory || 0,
  };
};

const getProducts = async (status) => {
  const filters = status ? { status } : {};
  return Product.find(filters).populate('artisan', 'name email phone').sort({ createdAt: -1 });
};

const updateProductStatus = async (productId, status, feedback = '') => {
  const allowed = ['available', 'rejected'];
  if (!allowed.includes(status)) {
    const error = new Error('Status must be available or rejected');
    error.statusCode = 400;
    throw error;
  }
  if (typeof feedback !== 'string' || feedback.trim().length > 500) {
    const error = new Error('Rejection feedback must be 500 characters or fewer');
    error.statusCode = 400;
    throw error;
  }

  const currentStatus = status === 'available' ? 'pending' : { $in: ['pending', 'available'] };
  const product = await Product.findOneAndUpdate(
    { _id: productId, status: currentStatus },
    {
      $set: {
        status,
        reviewFeedback: status === 'rejected' ? feedback.trim() : '',
      }
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!product) {
    const exists = await Product.exists({ _id: productId });
    if (!exists) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    const error = new Error('Product status changed or this decision is no longer allowed');
    error.statusCode = 409;
    throw error;
  }

  return product;
};

const loginAdmin = async (email, password) => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new Error('Email and password are required');
  }
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) {
    throw new Error('Invalid email or password');
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    throw new Error('Invalid email or password');
  }

  return jwt.sign({ adminId: admin._id, role: 'admin' }, process.env.JWT_SECRET_PASSWORD, { expiresIn: '7d' });
};

const ensureBootstrapAdmin = async () => {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!configuredEmail && !password) return null;
  if (typeof configuredEmail !== 'string' || !configuredEmail.trim() || typeof password !== 'string' || password.length < 12) {
    throw new Error('Initial admin bootstrap requires ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  }
  const email = configuredEmail.toLowerCase().trim();

  const existing = await Admin.findOne({ email });
  if (existing) {
    return existing;
  }

  const hashed = await bcrypt.hash(password, 10);
  return Admin.create({ name: 'Marketplace Admin', email, password: hashed, role: 'admin' });
};

module.exports = {
  getDashboard,
  getProducts,
  updateProductStatus,
  loginAdmin,
  ensureBootstrapAdmin,
};
