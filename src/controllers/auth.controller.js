const { matchedData } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../middlewares/auth');
const { userTransformer } = require('../transformers');

async function register(req, res) {
  const { name, email, password } = matchedData(req);

  if (await User.exists({ email })) throw ApiError.conflict('Email is already registered');

  // `role` is never taken from the request body: new accounts are always regular users.
  const user = await User.create({ name, email, password });

  res.status(201).json({
    success: true,
    data: { user: userTransformer(user), token: signToken(user) },
  });
}

async function login(req, res) {
  const { email, password } = matchedData(req);

  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password to avoid user enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json({
    success: true,
    data: { user: userTransformer(user), token: signToken(user) },
  });
}

module.exports = { register, login };
