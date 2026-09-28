const { matchedData } = require('express-validator');
const Course = require('../models/Course');
const Episode = require('../models/Episode');
const ApiError = require('../utils/ApiError');
const { courseSummary, courseDetail, episodeDetail } = require('../transformers');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /courses — paginated catalogue with optional title search. */
async function list(req, res) {
  const { page = 1, limit = 10, q } = matchedData(req, { locations: ['query'] });
  const filter = q ? { title: { $regex: escapeRegex(q), $options: 'i' } } : {};

  const [items, total] = await Promise.all([
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('episodeCount'),
    Course.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map(courseSummary),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** GET /courses/:id — course with its episode outline. */
async function show(req, res) {
  const course = await Course.findById(req.params.id)
    .populate('episodes')
    .populate('instructor', 'name');
  if (!course) throw ApiError.notFound('Course not found');

  res.json({ success: true, data: courseDetail(course) });
}

/** POST /courses/:id/enroll — enrol the current user in a course. */
async function enroll(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  if (req.user.isEnrolledIn(course._id)) throw ApiError.conflict('Already enrolled in this course');

  // Payment integration would go here; the demo enrols directly.
  await req.user.updateOne({ $addToSet: { enrolledCourses: course._id } });

  res.status(201).json({ success: true, message: 'Enrolled successfully' });
}

/** GET /courses/:id/episodes/:episodeId — full episode (video URL) for enrolled users. */
async function showEpisode(req, res) {
  const { id, episodeId } = req.params;
  const episode = await Episode.findOne({ _id: episodeId, course: id });
  if (!episode) throw ApiError.notFound('Episode not found');

  const canWatch =
    episode.isFreePreview || req.user.role === 'admin' || req.user.isEnrolledIn(episode.course);
  if (!canWatch) throw ApiError.forbidden('Enroll in this course to watch this episode');

  episode.viewCount += 1;
  await Episode.updateOne({ _id: episode._id }, { $inc: { viewCount: 1 } });

  res.json({ success: true, data: episodeDetail(episode) });
}

module.exports = { list, show, enroll, showEpisode };
