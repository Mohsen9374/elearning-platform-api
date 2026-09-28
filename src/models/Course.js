const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Episodes are resolved via a virtual populate instead of a duplicated
// `episodes: [ObjectId]` array, so course and episodes can never drift out of sync.
courseSchema.virtual('episodes', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'course',
  options: { sort: { number: 1 } },
});

courseSchema.virtual('episodeCount', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'course',
  count: true,
});

courseSchema.index({ title: 1 });

module.exports = mongoose.model('Course', courseSchema);
