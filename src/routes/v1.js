const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('express-validator');

const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadImage } = require('../middlewares/upload');
const v = require('../validators');

const authController = require('../controllers/auth.controller');
const courseController = require('../controllers/course.controller');
const userController = require('../controllers/user.controller');
const adminCourseController = require('../controllers/admin/course.controller');
const adminEpisodeController = require('../controllers/admin/episode.controller');

const router = express.Router();

// Brute-force protection for credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts, please try again later' },
});

/* ---------- Auth ---------- */
router.post('/auth/register', authLimiter, v.auth.register, validate, authController.register);
router.post('/auth/login', authLimiter, v.auth.login, validate, authController.login);

/* ---------- Public catalogue ---------- */
router.get('/courses', v.course.list, validate, courseController.list);
router.get('/courses/:id', v.mongoIdParam(), validate, courseController.show);

/* ---------- Authenticated user ---------- */
router.post('/courses/:id/enroll', authenticate, v.mongoIdParam(), validate, courseController.enroll);
router.get(
  '/courses/:id/episodes/:episodeId',
  authenticate,
  v.mongoIdParam(),
  v.mongoIdParam('episodeId'),
  validate,
  courseController.showEpisode,
);
router.get('/users/me', authenticate, userController.me);
router.post('/users/me/avatar', authenticate, uploadImage.single('image'), userController.uploadAvatar);

/* ---------- Admin (fixed: was completely unprotected) ---------- */
const admin = express.Router();
admin.use(authenticate, authorize('admin'));

admin.post('/courses', uploadImage.single('image'), v.course.create, validate, adminCourseController.create);
admin.patch('/courses/:id', uploadImage.single('image'), v.course.update, validate, adminCourseController.update);
admin.delete('/courses/:id', v.mongoIdParam(), validate, adminCourseController.destroy);

admin.get(
  '/episodes',
  query('course').optional().isMongoId().withMessage('Invalid course'),
  validate,
  adminEpisodeController.list,
);
admin.get('/episodes/:id', v.mongoIdParam(), validate, adminEpisodeController.show);
admin.post('/episodes', v.episode.create, validate, adminEpisodeController.create);
admin.patch('/episodes/:id', v.episode.update, validate, adminEpisodeController.update);
admin.delete('/episodes/:id', v.mongoIdParam(), validate, adminEpisodeController.destroy);

router.use('/admin', admin);

module.exports = router;
