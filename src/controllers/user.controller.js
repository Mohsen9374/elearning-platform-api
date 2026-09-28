const ApiError = require('../utils/ApiError');
const { publicUrl } = require('../middlewares/upload');
const { userTransformer } = require('../transformers');

/** GET /users/me — current user's profile with enrolled courses. */
async function me(req, res) {
  await req.user.populate('enrolledCourses');
  res.json({ success: true, data: userTransformer(req.user) });
}

/** POST /users/me/avatar — upload a profile image (multipart field `image`). */
async function uploadAvatar(req, res) {
  if (!req.file) throw ApiError.badRequest('No image file uploaded (expected field "image")');

  req.user.avatar = publicUrl(req, req.file.path);
  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: { avatar: req.user.avatar },
  });
}

module.exports = { me, uploadAvatar };
