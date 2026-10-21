const assert = require('node:assert/strict');
const test = require('node:test');
const { configureStagingEnvironment, databaseFromUri, validateStagingConfig } = require('../start-staging');

const normalConfig = {
  MONGO_URL: 'mongodb://127.0.0.1:27017/artisan_marketplace',
  JWT_SECRET_PASSWORD: 'normal-only-secret-with-enough-characters'
};
const validStagingConfig = {
  MONGO_URL: 'mongodb://127.0.0.1:27017/artisan_marketplace_staging',
  JWT_SECRET_PASSWORD: 'unique-staging-secret-with-at-least-32-characters'
};

test('MongoDB URI parser uses the explicit database and handles the URI default', () => {
  assert.equal(databaseFromUri(normalConfig.MONGO_URL, 'normal').databaseName, 'artisan_marketplace');
  assert.equal(databaseFromUri('mongodb://localhost:27017', 'normal').databaseName, 'test');
});

test('staging configuration allows only local MongoDB and its dedicated database', () => {
  assert.doesNotThrow(() => validateStagingConfig(normalConfig, validStagingConfig));
  assert.throws(
    () => validateStagingConfig(
      { ...normalConfig, MONGO_URL: validStagingConfig.MONGO_URL },
      validStagingConfig
    ),
    /different MongoDB databases/
  );
  assert.throws(
    () => validateStagingConfig(normalConfig, {
      ...validStagingConfig,
      MONGO_URL: 'mongodb://example.invalid:27017/artisan_marketplace_staging'
    }),
    /loopback MongoDB host/
  );
  assert.throws(
    () => validateStagingConfig(normalConfig, {
      ...validStagingConfig,
      MONGO_URL: 'mongodb://127.0.0.1:27017/other_database'
    }),
    /must use the artisan_marketplace_staging database/
  );
});

test('staging requires an independent strong JWT secret and known normal database', () => {
  assert.throws(
    () => validateStagingConfig(normalConfig, {
      ...validStagingConfig,
      JWT_SECRET_PASSWORD: normalConfig.JWT_SECRET_PASSWORD
    }),
    /must differ from the normal backend secret/
  );
  assert.throws(
    () => validateStagingConfig({ JWT_SECRET_PASSWORD: normalConfig.JWT_SECRET_PASSWORD }, validStagingConfig),
    /Normal backend configuration must define MONGO_URL/
  );
  assert.throws(
    () => validateStagingConfig(normalConfig, {
      ...validStagingConfig,
      ADMIN_EMAIL: 'admin@example.test'
    }),
    /Admin bootstrap is disabled for staging/
  );
});

test('staging environment clears inherited and file-based admin bootstrap settings', (t) => {
  const keys = [...Object.keys(validStagingConfig), 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'APP_ENV'];
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  process.env.ADMIN_EMAIL = 'inherited-admin@example.test';
  process.env.ADMIN_PASSWORD = 'inherited-password';
  configureStagingEnvironment(validStagingConfig);

  assert.equal(process.env.ADMIN_EMAIL, '');
  assert.equal(process.env.ADMIN_PASSWORD, '');
  assert.equal(process.env.APP_ENV, 'staging');
  assert.equal(process.env.MONGO_URL, validStagingConfig.MONGO_URL);
});
