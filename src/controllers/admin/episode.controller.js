const { matchedData } = require('express-validator');
const Course = require('../../models/Course');
const Episode = require('../../models/Episode');
const ApiError = require('../../utils/ApiError');
const { episodeDetail } = require('../../transformers');

/** GET /admin/episodes?course=<id> */
async function list(req, res) {
  const filter = req.query.course ? { course: req.query.course } : {};
  const episodes = await Episode.find(filter).sort({ course: 1, number: 1 });
  res.json({ success: true, data: episodes.map(episodeDetail) });
}

async function show(req, res) {
  const episode = await Episode.findById(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');
  res.json({ success: true, data: episodeDetail(episode) });
}

async function create(req, res) {
  const data = matchedData(req, { locations: ['body'] });

  // Fixed: original code crashed with a null reference when the course did not exist.
  if (!(await Course.exists({ _id: data.course }))) throw ApiError.notFound('Course not found');

  const episode = await Episode.create(data);
  res.status(201).json({ success: true, data: episodeDetail(episode) });
}

async function update(req, res) {
  const data = matchedData(req, { locations: ['body'] });

  const episode = await Episode.findByIdAndUpdate(req.params.id, data, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!episode) throw ApiError.notFound('Episode not found');

  res.json({ success: true, data: episodeDetail(episode) });
}

async function destroy(req, res) {
  const episode = await Episode.findByIdAndDelete(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');
  res.json({ success: true, message: 'Episode deleted' });
}

module.exports = { list, show, create, update, destroy };
