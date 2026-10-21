const adminService = require('../services/adminService');

const loginAdmin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const token = await adminService.loginAdmin(email, password);
    if (typeof token === 'string' && token.startsWith('eyJ')) {
      return res.status(200).json(token);
    }
    return res.status(401).json({ message: token });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const stats = await adminService.getDashboard();
    return res.status(200).json(stats);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const status = req.query.status;
    const products = await adminService.getProducts(status);
    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const product = await adminService.updateProductStatus(req.params.id, req.body.status, req.body.feedback);
    return res.status(200).json({ message: 'Product status updated', product });
  } catch (error) {
    return res.status(error.statusCode || (error.name === 'CastError' ? 400 : 500)).json({ message: error.message });
  }
};

module.exports = {
  loginAdmin,
  getDashboard,
  getProducts,
  updateProductStatus,
};
