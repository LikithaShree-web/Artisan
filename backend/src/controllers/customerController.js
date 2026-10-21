const customerService = require('../services/customerService');

const registerCustomer = async (req, res) => {
    try {
        const customer = await customerService.registerCustomer(req.body.name, req.body.email, req.body.phone, req.body.password);
        return res.status(201).json(customer);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const loginCustomer = async (req, res) => {
    try {
        const customer = await customerService.loginCustomer(req.body.email, req.body.password);
        return res.status(200).json(customer);
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
};

const checkCustomer = (req, res) => {
    return res.status(200).json({ customerId: req.customerId });
};

module.exports = {
    registerCustomer,
    loginCustomer,
    checkCustomer
};
