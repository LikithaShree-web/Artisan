const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const customerMiddleware = require('../middleware/customerMiddleware');

router.get('/product/:productId', reviewController.getProductReviews);
router.post('/product/:productId', customerMiddleware.checkToken, reviewController.submitReview);

module.exports = router;
