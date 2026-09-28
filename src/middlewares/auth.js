const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Requires a valid `Authorization: Bearer <token>` header and attaches `req.user`. */
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('No token provided');

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
}

/** Restricts a route to the given roles. Must run after `authenticate`. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
  next();
};

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

module.exports = { authenticate, authorize, signToken };
