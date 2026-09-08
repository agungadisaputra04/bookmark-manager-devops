// db is mocked so these tests can run without a live PostgreSQL instance.
jest.mock('../src/db', () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const db = require('../src/db');
const { createApp } = require('../src/app');

const app = createApp();

describe('GET /health/live', () => {
  test('returns 200 ok without touching the database', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  test('returns 200 when the database is reachable', async () => {
    db.healthCheck.mockResolvedValueOnce();
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });

  test('returns 503 when the database is unreachable', async () => {
    db.healthCheck.mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unreachable');
  });
});

describe('POST /auth/register validation', () => {
  test('rejects an invalid email before touching the database', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'somepassword' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('rejects a short password before touching the database', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('GET /bookmarks without auth', () => {
  test('rejects requests missing an Authorization header', async () => {
    const res = await request(app).get('/bookmarks');
    expect(res.status).toBe(401);
  });
});
