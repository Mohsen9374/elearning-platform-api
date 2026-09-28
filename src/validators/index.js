const { body, param, query } = require('express-validator');

const mongoIdParam = (name = 'id') => param(name).isMongoId().withMessage(`Invalid ${name}`);

const auth = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().toLowerCase().isEmail().withMessage('A valid email is required'),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  login: [
    body('email').trim().toLowerCase().isEmail().withMessage('A valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
};

const courseFields = (optional) => {
  const field = (name) => (optional ? body(name).optional() : body(name));
  return [
    field('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    field('description').trim().notEmpty().withMessage('Description is required'),
    field('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number').toFloat(),
    body('image').optional().isURL().withMessage('Image must be a valid URL'),
  ];
};

const course = {
  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('q').optional().isString().trim().isLength({ max: 100 }),
  ],
  create: courseFields(false),
  update: [mongoIdParam(), ...courseFields(true)],
};

const episodeFields = (optional) => {
  const field = (name) => (optional ? body(name).optional() : body(name));
  return [
    field('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    field('description').trim().notEmpty().withMessage('Description is required'),
    field('videoUrl').isURL().withMessage('videoUrl must be a valid URL'),
    field('number').isInt({ min: 1 }).withMessage('number must be a positive integer').toInt(),
    body('durationMinutes').optional().isInt({ min: 0 }).toInt(),
    body('isFreePreview').optional().isBoolean().toBoolean(),
  ];
};

const episode = {
  create: [body('course').isMongoId().withMessage('A valid course id is required'), ...episodeFields(false)],
  update: [mongoIdParam(), ...episodeFields(true)],
};

module.exports = { mongoIdParam, auth, course, episode };
