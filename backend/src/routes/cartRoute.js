const express = require('express');

const router = express.Router();

const cartController = require('../controllers/cartController');
const customerMiddleware = require('../middleware/customerMiddleware');


router.post('/add', customerMiddleware.checkToken, cartController.addToCart);
router.get('/mycart', customerMiddleware.checkToken, cartController.getMyCart);
router.put('/update-quantity', customerMiddleware.checkToken, cartController.updateCartQuantity);
router.delete('/remove-item', customerMiddleware.checkToken, cartController.removeFromCart);
    

module.exports = router;