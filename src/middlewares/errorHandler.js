const mongoose = require('mongoose');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const config = require('../config');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Central error handler. Express 5 forwards rejected promises from async
 * handlers here automatically, so controllers never crash the process.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for ${err.path}`);
  } else if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = new ApiError(422, 'Validation failed', errors);
  } else if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate value for ${field}`);
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message);
  } else if (err && err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500 && config.env !== 'test') console.error(err);

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : error.message,
    ...(error.errors && { errors: error.errors }),
  });
}

module.exports = { notFound, errorHandler };
