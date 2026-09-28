const path = require('path');
const fs = require('fs');
const os = require('os');
const { app, request, connect, clear, close, registerUser, createAdmin, auth } = require('./helpers');

beforeAll(connect);
afterEach(clear);
afterAll(close);

const courseData = { title: 'Node.js from Zero', description: 'Build REST APIs', price: 49.99 };
const episodeData = (course, number = 1, extra = {}) => ({
  course,
  title: `Episode ${number}`,
  description: 'Lesson content',
  videoUrl: `https://videos.example.com/${number}.mp4`,
  number,
  ...extra,
});

async function seedCourse(adminToken) {
  const res = await request(app).post('/api/v1/admin/courses').set(auth(adminToken)).send(courseData);
  return res.body.data;
}

describe('Admin authorization', () => {
  it('blocks anonymous users from admin routes', async () => {
    const res = await request(app).post('/api/v1/admin/courses').send(courseData);
    expect(res.status).toBe(401);
  });

  it('blocks regular users from admin routes', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/v1/admin/courses').set(auth(token)).send(courseData);
    expect(res.status).toBe(403);
  });
});

describe('Course management', () => {
  let adminToken;
  beforeEach(async () => {
    adminToken = await createAdmin();
  });

  it('creates, lists, updates and deletes a course', async () => {
    const created = await seedCourse(adminToken);
    expect(created).toMatchObject({ title: courseData.title, price: 49.99 });

    const list = await request(app).get('/api/v1/courses');
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, total: 1 });
    expect(list.body.data[0]).toMatchObject({ title: courseData.title, episodeCount: 0 });

    const updated = await request(app)
      .patch(`/api/v1/admin/courses/${created.id}`)
      .set(auth(adminToken))
      .send({ title: 'Node.js Advanced', price: 59 });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ title: 'Node.js Advanced', price: 59 });
    expect(updated.body.data.description).toBe(courseData.description);

    const del = await request(app).delete(`/api/v1/admin/courses/${created.id}`).set(auth(adminToken));
    expect(del.status).toBe(200);

    const after = await request(app).get(`/api/v1/courses/${created.id}`);
    expect(after.status).toBe(404);
  });

  it('validates course input', async () => {
    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set(auth(adminToken))
      .send({ title: '', price: -5 });
    expect(res.status).toBe(422);
  });

  it('supports search and pagination', async () => {
    for (const title of ['Node.js Basics', 'React Basics', 'Node.js Testing']) {
      await request(app).post('/api/v1/admin/courses').set(auth(adminToken)).send({ ...courseData, title });
    }
    const res = await request(app).get('/api/v1/courses?q=node&limit=1&page=2');
    expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 422 for a malformed id', async () => {
    const res = await request(app).get('/api/v1/courses/not-an-id');
    expect(res.status).toBe(422);
  });

  it('uploads a course image via multipart', async () => {
    const png = path.join(os.tmpdir(), 'test.png');
    fs.writeFileSync(png, Buffer.from('89504e470d0a1a0a', 'hex'));

    const res = await request(app)
      .post('/api/v1/admin/courses')
      .set(auth(adminToken))
      .field('title', 'With image')
      .field('description', 'desc')
      .field('price', '10')
      .attach('image', png, { contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.image).toMatch(/\/uploads\/images\/\d{4}\/\d{2}\/\d{2}\/.+\.png$/);
  });
});

describe('Episodes and enrollment', () => {
  let adminToken;
  let course;
  let paidEpisode;
  let freeEpisode;

  beforeEach(async () => {
    adminToken = await createAdmin();
    course = await seedCourse(adminToken);

    freeEpisode = (
      await request(app)
        .post('/api/v1/admin/episodes')
        .set(auth(adminToken))
        .send(episodeData(course.id, 1, { isFreePreview: true }))
    ).body.data;
    paidEpisode = (
      await request(app).post('/api/v1/admin/episodes').set(auth(adminToken)).send(episodeData(course.id, 2))
    ).body.data;
  });

  it('shows the course outline without paid video URLs', async () => {
    const res = await request(app).get(`/api/v1/courses/${course.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.episodes).toHaveLength(2);
    expect(res.body.data.episodes[0].videoUrl).toBeDefined();
    expect(res.body.data.episodes[1].videoUrl).toBeUndefined();
  });

  it('rejects an episode for a non-existent course', async () => {
    const res = await request(app)
      .post('/api/v1/admin/episodes')
      .set(auth(adminToken))
      .send(episodeData('64b000000000000000000000', 1));
    expect(res.status).toBe(404);
  });

  it('rejects a duplicate episode number in the same course', async () => {
    const res = await request(app)
      .post('/api/v1/admin/episodes')
      .set(auth(adminToken))
      .send(episodeData(course.id, 2));
    expect(res.status).toBe(409);
  });

  it('only lets enrolled users watch paid episodes', async () => {
    const { token } = await registerUser();
    const url = `/api/v1/courses/${course.id}/episodes/${paidEpisode.id}`;

    expect((await request(app).get(url).set(auth(token))).status).toBe(403);
    expect(
      (await request(app).get(`/api/v1/courses/${course.id}/episodes/${freeEpisode.id}`).set(auth(token)))
        .status,
    ).toBe(200);

    const enroll = await request(app).post(`/api/v1/courses/${course.id}/enroll`).set(auth(token));
    expect(enroll.status).toBe(201);

    const again = await request(app).post(`/api/v1/courses/${course.id}/enroll`).set(auth(token));
    expect(again.status).toBe(409);

    const watch = await request(app).get(url).set(auth(token));
    expect(watch.status).toBe(200);
    expect(watch.body.data.videoUrl).toBe(paidEpisode.videoUrl);
    expect(watch.body.data.viewCount).toBe(1);

    const me = await request(app).get('/api/v1/users/me').set(auth(token));
    expect(me.body.data.enrolledCourses).toHaveLength(1);
    expect(me.body.data.enrolledCourses[0].title).toBe(courseData.title);
  });

  it('updates an episode with the submitted data', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/episodes/${paidEpisode.id}`)
      .set(auth(adminToken))
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');
  });

  it('deletes episodes together with their course', async () => {
    await request(app).delete(`/api/v1/admin/courses/${course.id}`).set(auth(adminToken));
    const res = await request(app).get(`/api/v1/admin/episodes/${paidEpisode.id}`).set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});

describe('Misc', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('reports health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe(true);
  });
});
