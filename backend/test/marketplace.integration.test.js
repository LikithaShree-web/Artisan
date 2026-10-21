const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { after, before, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const databaseName = `artisan_marketplace_test_${process.pid}_${Date.now()}`;
const adminEmail = 'integration-admin@example.test';
const adminPassword = 'integration-only-admin-password';
const testJwtSecret = 'integration-only-jwt-secret-do-not-use-outside-tests';
const uploadPaths = new Set();
let mongoServer;
let httpServer;
let apiBase;

const api = async (route, { method = 'GET', token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const options = { method, headers };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBase}${route}`, options);
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Token login routes return plain JSON strings.
  }
  return { status: response.status, data };
};

const createProduct = async (token, name, stock) => {
  const form = new FormData();
  form.set('name', name);
  form.set('description', `${name} description`);
  form.set('category', 'Basket');
  form.set('price', '50');
  form.set('stock', String(stock));
  form.set('productionCost', '25');
  form.set('image', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0x00])], { type: 'image/jpeg' }), `${name}.jpg`);

  const result = await api('/api/products/create', { method: 'POST', token, body: form });
  if (result.data?.image) {
    uploadPaths.add(path.join(__dirname, '../uploads', result.data.image));
  }
  return result;
};

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: databaseName, ip: '127.0.0.1' }
  });
  const isolatedUri = mongoServer.getUri(databaseName);
  const parsedUri = new URL(isolatedUri);
  const host = parsedUri.hostname.toLowerCase();
  const isolatedDatabase = decodeURIComponent(parsedUri.pathname.slice(1));

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(host), 'Integration tests must use loopback MongoDB only');
  assert.match(isolatedDatabase, /^artisan_marketplace_test_/);
  assert.notEqual(isolatedDatabase, 'artisan_marketplace');

  process.env.MONGO_URL = isolatedUri;
  process.env.JWT_SECRET_PASSWORD = testJwtSecret;
  process.env.ADMIN_EMAIL = adminEmail;
  process.env.ADMIN_PASSWORD = adminPassword;

  await mongoose.connect(isolatedUri);
  assert.equal(mongoose.connection.host, host);
  assert.equal(mongoose.connection.name, isolatedDatabase);

  const { ensureBootstrapAdmin } = require('../src/services/adminService');
  await ensureBootstrapAdmin();

  const { app } = require('../server');
  httpServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    httpServer.once('listening', resolve);
    httpServer.once('error', reject);
  });
  apiBase = `http://127.0.0.1:${httpServer.address().port}`;
});

after(async () => {
  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => error ? reject(error) : resolve());
    });
  }
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  await Promise.all([...uploadPaths].map((filePath) => fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  })));
});

test('isolated marketplace registration, moderation, checkout, fulfillment, reviews, and authorization', async () => {
  assert.equal((await api('/api/cart/mycart')).status, 401);
  assert.equal((await api('/api/admin/dashboard')).status, 401);

  const customerRegistration = await api('/api/customers/register', {
    method: 'POST',
    body: { name: 'Test Customer', email: 'CUSTOMER@example.test', phone: '1111111111', password: 'customer-pass', role: 'admin' }
  });
  assert.equal(customerRegistration.status, 201);
  assert.equal(customerRegistration.data.customer.role, 'customer');
  assert.equal('password' in customerRegistration.data.customer, false);
  const Customer = require('../src/models/Customer');
  const storedCustomer = await Customer.findOne({ email: 'customer@example.test' });
  assert.ok(storedCustomer.password);
  assert.notEqual(storedCustomer.password, 'customer-pass');

  const duplicateRegistration = await api('/api/customers/register', {
    method: 'POST',
    body: { name: 'Duplicate', email: 'customer@example.test', phone: '2222222222', password: 'customer-pass' }
  });
  assert.equal(duplicateRegistration.status, 400);
  const customerLogin = await api('/api/customers/login', {
    method: 'POST',
    body: { email: ' CUSTOMER@example.test ', password: 'customer-pass' }
  });
  assert.equal(customerLogin.status, 200);
  const customerToken = customerLogin.data;
  assert.equal((await api('/api/customers/check', { token: customerToken })).status, 200);
  assert.equal((await api('/api/customers/login', { method: 'POST', body: { email: 'customer@example.test', password: 'wrong-pass' } })).status, 401);

  const secondCustomerRegistration = await api('/api/customers/register', {
    method: 'POST',
    body: { name: 'Second Customer', email: 'second@example.test', phone: '3333333333', password: 'customer-pass' }
  });
  assert.equal(secondCustomerRegistration.status, 201);
  const secondCustomerLogin = await api('/api/customers/login', {
    method: 'POST',
    body: { email: 'second@example.test', password: 'customer-pass' }
  });
  const secondCustomerToken = secondCustomerLogin.data;

  const artisanRegistration = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test Artisan', phone: '4444444444', email: 'ARTISAN@example.test', password: 'artisan-pass', role: 'admin' }
  });
  assert.equal(artisanRegistration.status, 200);
  assert.equal(artisanRegistration.data.artisan.role, 'artisan');
  assert.equal('password' in artisanRegistration.data.artisan, false);
  const Artisan = require('../src/models/Artisan');
  const storedArtisan = await Artisan.findOne({ email: 'artisan@example.test' });
  assert.equal(storedArtisan.role, 'artisan');
  assert.notEqual(storedArtisan.password, 'artisan-pass');
  const artisanLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'artisan@example.test', password: 'artisan-pass' }
  });
  assert.equal(artisanLogin.status, 200);
  const artisanToken = artisanLogin.data;
  assert.equal((await api('/api/auth/check', { method: 'POST', token: artisanToken })).status, 200);
  assert.equal((await api('/api/cart/mycart', { token: artisanToken })).status, 403);
  assert.equal((await api('/api/products/mine', { token: customerToken })).status, 403);

  const secondArtisanRegistration = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Other Artisan', phone: '5555555555', email: 'other-artisan@example.test', password: 'artisan-pass' }
  });
  assert.equal(secondArtisanRegistration.status, 200);
  const secondArtisanLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'other-artisan@example.test', password: 'artisan-pass' }
  });
  const secondArtisanToken = secondArtisanLogin.data;

  const adminLogin = await api('/api/admin/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword }
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.data;

  const pendingProduct = await createProduct(artisanToken, 'Test basket', 3);
  assert.equal(pendingProduct.status, 201);
  const productId = pendingProduct.data._id;
  assert.equal((await api(`/api/products/${productId}`, {
    method: 'PUT',
    token: secondArtisanToken,
    body: { name: 'Not your product' }
  })).status, 403);
  assert.equal((await api(`/api/products/${productId}`, {
    method: 'DELETE',
    token: secondArtisanToken
  })).status, 403);
  const pendingCatalog = await api('/api/products');
  assert.equal(pendingCatalog.status, 200);
  assert.equal(pendingCatalog.data.some((product) => product._id === productId), false);
  const artisanProducts = await api('/api/products/mine', { token: artisanToken });
  assert.equal(artisanProducts.status, 200);
  assert.equal(artisanProducts.data.find((product) => product._id === productId).status, 'pending');

  const productToReject = await createProduct(artisanToken, 'Rejected test listing', 5);
  assert.equal(productToReject.status, 201);
  const rejection = await api(`/api/admin/products/${productToReject.data._id}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'rejected', feedback: 'Needs clearer product details.' }
  });
  assert.equal(rejection.status, 200);
  const rejectedArtisanProducts = await api('/api/products/mine', { token: artisanToken });
  assert.equal(rejectedArtisanProducts.data.find((product) => product._id === productToReject.data._id).reviewFeedback, 'Needs clearer product details.');

  const approval = await api(`/api/admin/products/${productId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'available' }
  });
  assert.equal(approval.status, 200);
  const visibleCatalog = await api('/api/products');
  assert.deepEqual(visibleCatalog.data.map((product) => product.name), ['Test basket']);
  assert.equal('productionCost' in visibleCatalog.data[0], false);
  assert.equal((await api('/api/admin/dashboard')).status, 401);

  assert.equal((await api('/api/cart/add', {
    method: 'POST',
    token: customerToken,
    body: { productId, quantity: 1 }
  })).status, 200);
  assert.equal((await api('/api/cart/update-quantity', {
    method: 'PUT',
    token: customerToken,
    body: { productId, quantity: 2 }
  })).status, 200);
  const updatedCart = await api('/api/cart/mycart', { token: customerToken });
  assert.equal(updatedCart.data.products[0].quantity, 2);
  assert.equal((await api('/api/cart/remove-item', {
    method: 'DELETE',
    token: customerToken,
    body: { productId }
  })).status, 200);
  assert.equal((await api('/api/cart/add', {
    method: 'POST',
    token: customerToken,
    body: { productId, quantity: 2 }
  })).status, 200);
  assert.equal((await api('/api/cart/add', {
    method: 'POST',
    token: secondCustomerToken,
    body: { productId, quantity: 4 }
  })).status, 409);
  const customerCart = await api('/api/cart/mycart', { token: customerToken });
  assert.equal(customerCart.status, 200);
  assert.equal('productionCost' in customerCart.data.products[0].product, false);

  const checkout = await api('/api/orders/checkout', {
    method: 'POST',
    token: customerToken,
    body: { deliveryAddress: '12 Test Street, Example City' }
  });
  assert.equal(checkout.status, 201);
  const firstOrderId = checkout.data.order._id;
  const firstItemId = checkout.data.order.items[0]._id;
  const Product = require('../src/models/Product');
  assert.equal((await Product.findById(productId)).stock, 1);

  const customerOrders = await api('/api/orders/myorders', { token: customerToken });
  assert.equal(customerOrders.status, 200);
  assert.equal(customerOrders.data.length, 1);
  assert.equal('productionCost' in customerOrders.data[0].items[0].product, false);
  assert.equal((await api(`/api/orders/myorders/${firstOrderId}`, { token: secondCustomerToken })).status, 404);
  const secondCustomerOrders = await api('/api/orders/myorders', { token: secondCustomerToken });
  assert.equal(secondCustomerOrders.data.length, 0);

  const prematureReview = await api(`/api/reviews/product/${productId}`, {
    method: 'POST',
    token: customerToken,
    body: { orderId: firstOrderId, rating: 5, comment: 'Delivered later' }
  });
  assert.equal(prematureReview.status, 403);
  const otherCustomerReview = await api(`/api/reviews/product/${productId}`, {
    method: 'POST',
    token: secondCustomerToken,
    body: { orderId: firstOrderId, rating: 5 }
  });
  assert.equal(otherCustomerReview.status, 403);

  const skipTransition = await api(`/api/orders/artisan/${firstOrderId}/items/${firstItemId}/status`, {
    method: 'PATCH',
    token: artisanToken,
    body: { status: 'processing' }
  });
  assert.equal(skipTransition.status, 400);
  const wrongArtisanUpdate = await api(`/api/orders/artisan/${firstOrderId}/items/${firstItemId}/status`, {
    method: 'PATCH',
    token: secondArtisanToken,
    body: { status: 'accepted' }
  });
  assert.equal(wrongArtisanUpdate.status, 400);

  for (const status of ['accepted', 'processing', 'shipped', 'delivered']) {
    const transition = await api(`/api/orders/artisan/${firstOrderId}/items/${firstItemId}/status`, {
      method: 'PATCH',
      token: artisanToken,
      body: { status }
    });
    assert.equal(transition.status, 200, `Expected transition to ${status}`);
  }

  const validReview = await api(`/api/reviews/product/${productId}`, {
    method: 'POST',
    token: customerToken,
    body: { orderId: firstOrderId, rating: 5, comment: 'Beautiful basket.' }
  });
  assert.equal(validReview.status, 201);
  const duplicateReview = await api(`/api/reviews/product/${productId}`, {
    method: 'POST',
    token: customerToken,
    body: { orderId: firstOrderId, rating: 4 }
  });
  assert.equal(duplicateReview.status, 409);
  const ratedProduct = await api(`/api/products/${productId}`);
  assert.equal(ratedProduct.data.averageRating, 5);
  assert.equal(ratedProduct.data.reviewCount, 1);

  assert.equal((await api('/api/cart/add', {
    method: 'POST',
    token: secondCustomerToken,
    body: { productId, quantity: 1 }
  })).status, 200);
  const secondCheckout = await api('/api/orders/checkout', {
    method: 'POST',
    token: secondCustomerToken,
    body: { deliveryAddress: '34 Test Avenue, Example City' }
  });
  assert.equal(secondCheckout.status, 201);
  assert.equal((await Product.findById(productId)).stock, 0);
  assert.equal((await api('/api/products')).data.length, 0);

  const cancelledOrderId = secondCheckout.data.order._id;
  const cancelledItemId = secondCheckout.data.order.items[0]._id;
  const cancellation = await api(`/api/orders/artisan/${cancelledOrderId}/items/${cancelledItemId}/status`, {
    method: 'PATCH',
    token: artisanToken,
    body: { status: 'cancelled' }
  });
  assert.equal(cancellation.status, 200);
  assert.equal((await Product.findById(productId)).stock, 1);
  assert.equal((await api('/api/products')).data.length, 1);
});
