const model = require('../models/Customer');
const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const registerCustomer = async (name, email, phone, password) => {
    if (!name || !email || !phone || !password) {
        throw new Error('Name, email, phone and password are required');
    }
    if (String(password).length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
    }

    const cleanEmail = normalizeEmail(email);
    if (await model.findOne({ email: cleanEmail })) {
        throw new Error('Already Registered');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const customer = await model.create({
        name: String(name).trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        password: hashedPassword,
        role: 'customer'
    });

    return {
        message: 'Registration successful',
        customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            role: customer.role
        }
    };
};

const loginCustomer = async (email, password) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const customer = await model.findOne({ email: normalizeEmail(email) });
    if (!customer) {
        throw new Error('User not found');
    }

    if (!(await bcryptjs.compare(password, customer.password))) {
        throw new Error('Wrong Password');
    }

    return jsonwebtoken.sign({ customerId: customer._id, role: 'customer' }, process.env.JWT_SECRET_PASSWORD, { expiresIn: '7d' });
};

module.exports = { registerCustomer, loginCustomer };
 