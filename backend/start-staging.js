const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendDirectory = __dirname;
const normalEnvPath = path.join(backendDirectory, '.env');
const stagingEnvPath = path.join(backendDirectory, '.env.staging');
const stagingDatabaseName = 'artisan_marketplace_staging';

const readEnvFile = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing. Copy the matching .env example and configure it first.`);
  }
  return dotenv.parse(fs.readFileSync(filePath));
};

const databaseFromUri = (uri, label) => {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error(`${label} must define MONGO_URL.`);
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(`${label} MONGO_URL must be a valid MongoDB URI.`);
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error(`${label} MONGO_URL must use mongodb:// or mongodb+srv://.`);
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, '')) || 'test';
  return { databaseName, hostname: parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase() };
};

const validateStagingConfig = (normalConfig, stagingConfig) => {
  const normalDatabase = databaseFromUri(normalConfig.MONGO_URL, 'Normal backend configuration');
  const stagingDatabase = databaseFromUri(stagingConfig.MONGO_URL, 'Staging configuration');

  if (stagingDatabase.databaseName !== stagingDatabaseName) {
    throw new Error(`Staging MONGO_URL must use the ${stagingDatabaseName} database.`);
  }
  if (stagingDatabase.databaseName === normalDatabase.databaseName) {
    throw new Error('Staging and normal backend configurations must use different MongoDB databases.');
  }
  if (typeof stagingConfig.JWT_SECRET_PASSWORD !== 'string' || stagingConfig.JWT_SECRET_PASSWORD.length < 32) {
    throw new Error('Staging JWT_SECRET_PASSWORD must be a unique secret with at least 32 characters.');
  }
  if (stagingConfig.JWT_SECRET_PASSWORD === normalConfig.JWT_SECRET_PASSWORD) {
    throw new Error('Staging JWT_SECRET_PASSWORD must differ from the normal backend secret.');
  }
  if (stagingConfig.ADMIN_EMAIL || stagingConfig.ADMIN_PASSWORD) {
    throw new Error('Admin bootstrap is disabled for staging; remove ADMIN_EMAIL and ADMIN_PASSWORD.');
  }
};

const configureStagingEnvironment = (stagingConfig) => {
  for (const [key, value] of Object.entries(stagingConfig)) {
    process.env[key] = value;
  }
  process.env.ADMIN_EMAIL = '';
  process.env.ADMIN_PASSWORD = '';
  process.env.APP_ENV = 'staging';
};

const startStaging = () => {
  const normalConfig = {
    ...readEnvFile(normalEnvPath, 'Normal backend .env'),
    ...process.env
  };
  const stagingConfig = readEnvFile(stagingEnvPath, 'Staging .env.staging');
  validateStagingConfig(normalConfig, stagingConfig);

  configureStagingEnvironment(stagingConfig);

const { start } = require('./server');

start().catch((error) => {
  console.error('Staging backend startup failed:', error.message);
  process.exitCode = 1;
});
};

if (require.main === module) {
  try {
    startStaging();
  } catch (error) {
    console.error(`Staging startup refused: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { configureStagingEnvironment, databaseFromUri, validateStagingConfig };
