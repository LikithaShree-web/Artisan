const jsonwebtoken = require('jsonwebtoken');

const checkToken = (req, res, next) => {
    const customerHeader = req.headers.authorization;
    if (!customerHeader) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const token = customerHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET_PASSWORD);
        if (decoded.role !== 'customer' || !decoded.customerId) {
            return res.status(403).json({ message: 'Customer access required' });
        }
        req.customerId = decoded.customerId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = { checkToken };