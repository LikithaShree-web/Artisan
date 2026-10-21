const Review = require('../models/Review');
const Order = require('../models/Order');
const mongoose = require('mongoose');

const getProductReviews = async (productId) => {
  return Review.find({ product: productId }).populate('customer', 'name').sort({ createdAt: -1 });
};

const submitReview = async ({ customerId, productId, orderId, rating, comment }) => {
  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new Error('Rating must be an integer between 1 and 5');
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    throw new Error('Review comment must be text');
  }
  const cleanComment = typeof comment === 'string' ? comment.trim() : '';
  if (cleanComment.length > 1000) {
    throw new Error('Review comments must be 1000 characters or fewer');
  }

  const order = await Order.findOne({
    _id: orderId,
    customer: customerId,
    items: { $elemMatch: { product: productId, status: 'delivered' } }
  });

  if (!order) {
    const error = new Error('You can only review delivered products you purchased');
    error.statusCode = 403;
    throw error;
  }

  const existing = await Review.findOne({ customer: customerId, product: productId, order: orderId });
  if (existing) {
    const error = new Error('You have already reviewed this product');
    error.statusCode = 409;
    throw error;
  }

  const created = await Review.create({
    customer: customerId,
    product: productId,
    order: orderId,
    rating: parsedRating,
    comment: cleanComment
  });

  return created;
};

const getProductSummary = async (productId) => {
  const [reviews, aggregate] = await Promise.all([
    Review.find({ product: productId }).populate('customer', 'name').sort({ createdAt: -1 }),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } }
    ])
  ]);
  const count = aggregate[0]?.count || 0;
  const average = aggregate[0]?.average || 0;

  return {
    rating: count ? Number(average.toFixed(1)) : 0,
    reviewCount: count,
    reviews
  };
};

module.exports = { getProductReviews, submitReview, getProductSummary };
