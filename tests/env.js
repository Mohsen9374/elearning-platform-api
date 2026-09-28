const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/elearning_test';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'elearning-test-uploads');
