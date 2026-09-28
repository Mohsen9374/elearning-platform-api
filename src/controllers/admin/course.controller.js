const { matchedData } = require('express-validator');
const Course = require('../../models/Course');
const Episode = require('../../models/Episode');
const ApiError = require('../../utils/ApiError');
const { publicUrl } = require('../../middlewares/upload');
const { courseDetail } = require('../../transformers');

/** POST /admin/courses — accepts JSON or multipart (with an `image` file). */
async function create(req, res) {
  const data = matchedData(req, { locations: ['body'] });
  if (req.file) data.image = publicUrl(req, req.file.path);

  const course = await Course.create({ ...data, instructor: req.user._id });
  res.status(201).json({ success: true, data: courseDetail(course) });
}

/** PATCH /admin/courses/:id — only validated fields are applied (whitelisting). */
async function update(req, res) {
  const data = matchedData(req, { locations: ['body'] });
  if (req.file) data.image = publicUrl(req, req.file.path);

  // Fixed: original code ignored the request body and always wrote a hard-coded title.
  const course = await Course.findByIdAndUpdate(req.params.id, data, {
    returnDocument: 'after',
    runValidators: true,
  }).populate('episodes');
  if (!course) throw ApiError.notFound('Course not found');

  res.json({ success: true, data: courseDetail(course) });
}

/** DELETE /admin/courses/:id — also removes the course's episodes. */
async function destroy(req, res) {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  await Episode.deleteMany({ course: course._id });
  res.json({ success: true, message: 'Course deleted' });
}

module.exports = { create, update, destroy };
