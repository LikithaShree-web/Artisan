const model = require('../models/Product');
const Review = require('../models/Review');

const withRatingSummaries = async (products) => {
    if (products.length === 0) return products;

    const summaries = await Review.aggregate([
        { $match: { product: { $in: products.map((product) => product._id) } } },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);
    const totalReviews = summaries.reduce((sum, item) => sum + item.reviewCount, 0);
    const globalAverage = totalReviews
        ? summaries.reduce((sum, item) => sum + item.averageRating * item.reviewCount, 0) / totalReviews
        : null;
    const byProduct = new Map(summaries.map((item) => [String(item._id), item]));

    return products.map((product) => {
        const summary = byProduct.get(String(product._id));
        const averageRating = summary ? Number(summary.averageRating.toFixed(1)) : null;
        const reviewCount = summary?.reviewCount || 0;
        const ratingRankScore = reviewCount && globalAverage !== null
            ? Number(((reviewCount / (reviewCount + 5)) * averageRating + (5 / (reviewCount + 5)) * globalAverage).toFixed(3))
            : null;
        return { ...product.toObject(), averageRating, reviewCount, ratingRankScore };
    });
};

const createProduct = async ({ name, category, description, price, stock, image, productionCost, artisan }) => {
    const product = await model.create({
        name: String(name).trim(),
        category: String(category).trim(),
        description: String(description).trim(),
        price: Number(price),
        stock: Number(stock),
        image,
        productionCost: Number(productionCost),
        artisan,
        status: 'pending'
    });

    return product;
};

const getAllProducts = async () => {
    const products = await model.find({ status: 'available', stock: { $gt: 0 } })
        .select('-productionCost -reviewFeedback -__v')
        .populate('artisan', 'name')
        .sort({ createdAt: -1 });
    return withRatingSummaries(products);
};

const getArtisanProducts = async (artisanId) => {
    return model.find({ artisan: artisanId })
        .populate('artisan', 'name')
        .sort({ createdAt: -1 });
};

const getOneProduct = async (id) => {
    const product = await model.findOne({ _id: id, status: 'available' })
        .select('-productionCost -reviewFeedback -__v')
        .populate('artisan', 'name');
    if (!product) return null;
    const [withRating] = await withRatingSummaries([product]);
    return withRating;
};

const updateProduct = async (id, artisanId, updates) => {
    const product = await model.findById(id);
    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }
    if (String(product.artisan) !== String(artisanId)) {
        const error = new Error('You can only update your own products');
        error.statusCode = 403;
        throw error;
    }

    Object.assign(product, {
        name: updates.name ?? product.name,
        description: updates.description ?? product.description,
        category: updates.category ?? product.category,
        price: updates.price ?? product.price,
        stock: updates.stock ?? product.stock,
        productionCost: updates.productionCost ?? product.productionCost,
        status: 'pending',
        reviewFeedback: '',
    });

    await product.save();
    return product;
};

const deleteProduct = async (id, artisanId) => {
    const product = await model.findById(id);
    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }
    if (String(product.artisan) !== String(artisanId)) {
        const error = new Error('You can only delete your own products');
        error.statusCode = 403;
        throw error;
    }

    await model.findByIdAndDelete(id);
    return { message: 'Product deleted successfully' };
};

module.exports = {
    createProduct,
    getAllProducts,
    getArtisanProducts,
    getOneProduct,
    updateProduct,
    deleteProduct
};
