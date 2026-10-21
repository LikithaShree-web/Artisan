const express = require('express');
const route = express.Router();

const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');

route.post('/login', adminController.loginAdmin);
route.get('/dashboard', adminMiddleware.checkToken, adminController.getDashboard);
route.get('/products', adminMiddleware.checkToken, adminController.getProducts);
route.patch('/products/:id/status', adminMiddleware.checkToken, adminController.updateProductStatus);

module.exports = route;
