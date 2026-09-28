const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Runs after express-validator chains and turns failures into a 422 response. */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((err) => ({ field: err.path, message: err.msg }));
  const error = new ApiError(422, 'Validation failed', errors);
  next(error);
}

module.exports = validate;
