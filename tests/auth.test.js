const { app, request, connect, clear, close, registerUser, auth } = require('./helpers');
const User = require('../src/models/User');

beforeAll(connect);
afterEach(clear);
afterAll(close);

describe('POST /api/v1/auth/register', () => {
  it('creates a user, hashes the password and returns a token', async () => {
    const { res, user, token } = await registerUser();

    expect(res.status).toBe(201);
    expect(user).toMatchObject({ name: 'Jane Doe', email: 'jane@example.com', role: 'user' });
    expect(user.password).toBeUndefined();
    expect(token).toEqual(expect.any(String));

    const stored = await User.findOne({ email: 'jane@example.com' }).select('+password');
    expect(stored.password).not.toBe('secret123');
    expect(await stored.comparePassword('secret123')).toBe(true);
  });

  it('ignores a role sent by the client', async () => {
    const { user } = await registerUser({ role: 'admin' });
    expect(user.role).toBe('user');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser();
    const { res } = await registerUser({ email: 'JANE@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 with field errors for invalid input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'nope', password: '1' });
    expect(res.status).toBe(422);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => registerUser());

  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('does not re-hash the password when the user is saved again', async () => {
    const user = await User.findOne({ email: 'jane@example.com' });
    user.name = 'Jane Updated';
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'secret123' });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/users/me', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/v1/users/me').set(auth('not-a-jwt'));
    expect(res.status).toBe(401);
  });

  it('returns the current user', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/v1/users/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('jane@example.com');
  });
});
