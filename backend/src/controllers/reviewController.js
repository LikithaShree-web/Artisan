const reviewService = require('../services/reviewService');

const submitReview = async (req, res) => {
  try {
    const review = await reviewService.submitReview({
      customerId: req.customerId,
      productId: req.params.productId,
      orderId: req.body.orderId,
      rating: req.body.rating,
      comment: req.body.comment
    });
    return res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : error.statusCode || 400).json({ message: error.code === 11000 ? 'You have already reviewed this product for this order' : error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const summary = await reviewService.getProductSummary(req.params.productId);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = { submitReview, getProductReviews };
