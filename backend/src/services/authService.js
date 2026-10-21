const model = require('../models/Artisan');
const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const details = async (name, phone, email, password) => {
    if (!name || !phone || !email || !password) {
        throw new Error('Name, phone, email and password are required');
    }
    if (String(password).length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
    }

    const cleanEmail = normalizeEmail(email);
    const existingArtisan = await model.findOne({ email: cleanEmail });
    if (existingArtisan) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const artisan = await model.create({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: 'artisan'
    });

    return {
        message: 'Registration successful',
        artisan: {
            id: artisan._id,
            name: artisan.name,
            email: artisan.email,
            phone: artisan.phone,
            role: artisan.role
        }
    };
};

const login = async (email, password) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const existingArtisan = await model.findOne({ email: normalizeEmail(email) });
    if (!existingArtisan) {
        throw new Error('User not found');
    }

    const match = await bcryptjs.compare(password, existingArtisan.password);
    if (!match) {
        throw new Error('Wrong password');
    }

    return jsonwebtoken.sign({ artisanId: existingArtisan._id, role: 'artisan' }, process.env.JWT_SECRET_PASSWORD, { expiresIn: '7d' });
};

module.exports = {
    details,
    login
};