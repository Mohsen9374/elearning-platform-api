const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    videoUrl: { type: String, required: true },
    number: { type: Number, required: true, min: 1 },
    durationMinutes: { type: Number, min: 0 },
    isFreePreview: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// An episode number must be unique inside its course.
episodeSchema.index({ course: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', episodeSchema);
