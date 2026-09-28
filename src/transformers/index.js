/**
 * Transformers shape database documents into public API responses,
 * so internal fields (password hashes, __v, …) never leak to clients.
 */

const userTransformer = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  enrolledCourses: (user.enrolledCourses || []).map((c) => (c && c._id ? courseSummary(c) : c)),
  createdAt: user.createdAt,
});

const courseSummary = (course) => ({
  id: course._id,
  title: course.title,
  description: course.description,
  price: course.price,
  image: course.image || null,
  episodeCount: course.episodeCount ?? undefined,
  createdAt: course.createdAt,
});

/** Episode as shown in a course outline: no video URL unless it is a free preview. */
const episodeOutline = (episode) => ({
  id: episode._id,
  number: episode.number,
  title: episode.title,
  durationMinutes: episode.durationMinutes ?? null,
  isFreePreview: episode.isFreePreview,
  videoUrl: episode.isFreePreview ? episode.videoUrl : undefined,
});

/** Full episode, only returned to enrolled users and admins. */
const episodeDetail = (episode) => ({
  id: episode._id,
  course: episode.course,
  number: episode.number,
  title: episode.title,
  description: episode.description,
  videoUrl: episode.videoUrl,
  durationMinutes: episode.durationMinutes ?? null,
  isFreePreview: episode.isFreePreview,
  viewCount: episode.viewCount,
  createdAt: episode.createdAt,
  updatedAt: episode.updatedAt,
});

const courseDetail = (course) => ({
  ...courseSummary(course),
  instructor: course.instructor ? { id: course.instructor._id, name: course.instructor.name } : null,
  episodes: (course.episodes || []).map(episodeOutline),
  updatedAt: course.updatedAt,
});

module.exports = { userTransformer, courseSummary, courseDetail, episodeOutline, episodeDetail };
