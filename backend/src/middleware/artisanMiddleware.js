const jsonwebtoken = require('jsonwebtoken');

const checkToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET_PASSWORD);
        if (decoded.role !== 'artisan' || !decoded.artisanId) {
            return res.status(403).json({ message: 'Artisan access required' });
        }
        req.artisanId = decoded.artisanId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = checkToken;