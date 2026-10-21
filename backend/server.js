const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const db = require('./src/config/db');
const authRoute = require('./src/routes/authRoute');
const productRoute = require('./src/routes/productRoute');
const customerRoute = require('./src/routes/customerRoute');
const cartRoute = require('./src/routes/cartRoute');
const orderRoute = require('./src/routes/orderRoute');
const adminRoute = require('./src/routes/adminRoute');
const reviewRoute = require('./src/routes/reviewRoute');

dotenv.config();
const app = express();
const allowedOrigins = (process.env.API_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Server is running on 5000');
});

app.use('/api/auth', authRoute);
app.use('/api/admin', adminRoute);
app.use('/api/products', productRoute);
app.use('/api/customers', customerRoute);
app.use('/api/cart', cartRoute);
app.use('/api/orders', orderRoute);
app.use('/api/reviews', reviewRoute);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  return res.status(status).json({ message: error.message || 'Request could not be processed.' });
});

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  await db();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Backend startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
