const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET_PASSWORD = 'test-secret-that-is-long-enough-for-hmac-validation';

const artisanMiddleware = require('../src/middleware/artisanMiddleware');
const { checkToken: checkCustomerToken } = require('../src/middleware/customerMiddleware');
const { checkToken: checkAdminToken } = require('../src/middleware/adminMiddleware');
const upload = require('../src/middleware/uploadMiddleware');
const { updateProductStatus } = require('../src/services/adminService');
const { submitReview } = require('../src/services/reviewService');
const Product = require('../src/models/Product');

const invokeMiddleware = (middleware, token) => {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const result = { statusCode: null, body: null, continued: false };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };

  middleware(req, res, () => {
    result.continued = true;
  });
  return { req, result };
};

test('role middleware accepts matching claims and rejects wrong or missing identities', () => {
  const cases = [
    [artisanMiddleware, { role: 'artisan', artisanId: 'artisan-1' }, 'artisanId'],
    [checkCustomerToken, { role: 'customer', customerId: 'customer-1' }, 'customerId'],
    [checkAdminToken, { role: 'admin', adminId: 'admin-1' }, 'adminId']
  ];

  for (const [middleware, claims, identity] of cases) {
    const valid = invokeMiddleware(middleware, jwt.sign(claims, process.env.JWT_SECRET_PASSWORD));
    assert.equal(valid.result.continued, true);
    assert.equal(valid.req[identity], claims[identity]);

    const wrongRoleName = claims.role === 'customer' ? 'artisan' : 'customer';
    const wrongRole = invokeMiddleware(middleware, jwt.sign({ ...claims, role: wrongRoleName }, process.env.JWT_SECRET_PASSWORD));
    assert.equal(wrongRole.result.statusCode, 403);

    const missingIdentity = { ...claims };
    delete missingIdentity[identity];
    const invalid = invokeMiddleware(middleware, jwt.sign(missingIdentity, process.env.JWT_SECRET_PASSWORD));
    assert.equal(invalid.result.statusCode, 403);
  }
});

test('role middleware rejects absent and expired tokens', () => {
  assert.equal(invokeMiddleware(artisanMiddleware).result.statusCode, 401);
  const expired = jwt.sign({ role: 'artisan', artisanId: 'artisan-1' }, process.env.JWT_SECRET_PASSWORD, { expiresIn: -1 });
  assert.equal(invokeMiddleware(artisanMiddleware, expired).result.statusCode, 401);
});

test('product upload validates image signatures and saves opaque filenames', async () => {
  await assert.rejects(
      upload.saveProductImage({ mimetype: 'image/png', buffer: Buffer.from('not an image') }),
      (error) => error.statusCode === 415 && error.message === 'The uploaded file is not a valid JPEG, PNG, or WebP image.'
    );

  const image = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const saved = await upload.saveProductImage({ mimetype: 'image/jpeg', buffer: image });
  try {
    assert.match(saved.filename, /^[0-9a-f-]{36}\.jpg$/);
    assert.equal(path.basename(saved.imagePath), saved.filename);
    assert.deepEqual(await fs.readFile(saved.imagePath), image);
  } finally {
    await fs.unlink(saved.imagePath);
  }
});

test('admin product decisions reject invalid input without issuing a database update', async (t) => {
  t.mock.method(Product, 'findOneAndUpdate', () => {
    assert.fail('Database update should not run for invalid input');
  });

  await assert.rejects(updateProductStatus('product-1', 'pending'), { statusCode: 400 });
  await assert.rejects(updateProductStatus('product-1', 'rejected', 'x'.repeat(501)), { statusCode: 400 });
});

test('review submission validates rating and comment before accessing order data', async (t) => {
  const Order = require('../src/models/Order');
  t.mock.method(Order, 'findOne', () => {
    assert.fail('Order lookup should not run for invalid input');
  });

  await assert.rejects(
    submitReview({ customerId: 'customer-1', productId: 'product-1', orderId: 'order-1', rating: 4.5 }),
    /Rating must be an integer/
  );
  await assert.rejects(
    submitReview({ customerId: 'customer-1', productId: 'product-1', orderId: 'order-1', rating: 5, comment: 'x'.repeat(1001) }),
    /1000 characters or fewer/
  );
});
