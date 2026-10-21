const details = require('../services/authService');

const pushDetails = async (req, res) => {
    try {
        const result = await details.details(req.body.name, req.body.phone, req.body.email, req.body.password);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const result = await details.login(req.body.email, req.body.password);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
};

const checkProfile = (req, res) => {
    return res.status(200).json({ artisanId: req.artisanId });
};

module.exports = {
    pushDetails,
    login,
    checkProfile
};
