const productService = require('../services/productService');
const upload = require('../middleware/uploadMiddleware');
const fs = require('fs/promises');

const createProduct = async (req, res) => {
    let savedImage;
    try {
        const name = String(req.body.name || '').trim();
        const description = String(req.body.description || '').trim();
        const category = String(req.body.category || '').trim();
        const price = Number(req.body.price);
        const stock = Number(req.body.stock);
        const productionCost = Number(req.body.productionCost);
        if (!name || !description || !category || !req.file) {
            return res.status(400).json({ message: 'Name, description, category, and image are required' });
        }
        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({ message: 'Price must be greater than zero' });
        }
        if (!Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'Stock must be a whole number of zero or greater' });
        }
        if (!Number.isFinite(productionCost) || productionCost < 0) {
            return res.status(400).json({ message: 'Production cost is required and must be zero or greater' });
        }

        savedImage = await upload.saveProductImage(req.file);
        const product = await productService.createProduct({
            name,
            category,
            description,
            price,
            stock,
            image: savedImage.filename,
            productionCost,
            artisan: req.artisanId
        });

        return res.status(201).json(product);
    } catch (error) {
        if (savedImage) {
            await fs.unlink(savedImage.imagePath).catch((cleanupError) => {
                console.error('Failed to remove an unreferenced product image:', cleanupError.message);
            });
        }
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await productService.getAllProducts();
        return res.status(200).json(products);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getMyProducts = async (req, res) => {
    try {
        const products = await productService.getArtisanProducts(req.artisanId);
        return res.status(200).json(products);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getOneProduct = async (req, res) => {
    try {
        const product = await productService.getOneProduct(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json(product);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const updated = await productService.updateProduct(req.params.id, req.artisanId, {
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            price: req.body.price,
            stock: req.body.stock,
            productionCost: req.body.productionCost
        });
        return res.status(200).json(updated);
    } catch (error) {
        return res.status(error.statusCode || 400).json({ message: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const result = await productService.deleteProduct(req.params.id, req.artisanId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 400).json({ message: error.message });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getMyProducts,
    getOneProduct,
    updateProduct,
    deleteProduct
};
