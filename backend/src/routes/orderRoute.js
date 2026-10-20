
const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const customerMiddleware = require('../middleware/customerMiddleware');
const artisanCheckToken = require('../middleware/artisanMiddleware');

// Customer routes
router.post(
    '/checkout',
    customerMiddleware.checkToken,
    orderController.placeOrder
);

router.get(
    '/myorders',
    customerMiddleware.checkToken,
    orderController.getMyOrders
);

router.get(
    '/myorders/:orderId',
    customerMiddleware.checkToken,
    orderController.getMyOrderById
);

// Artisan routes
router.get(
    '/artisan',
    artisanCheckToken,
    orderController.getArtisanOrders
);

router.patch(
    '/artisan/:orderId/items/:itemId/status',
    artisanCheckToken,
    orderController.updateArtisanItemStatus
);
module.exports = router;
