process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

const request = require('supertest');
const app = require('../src/app');

// Mock Prisma and email service to avoid DB/email in unit tests
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/config/socket', () => ({
  initSocket: jest.fn(),
  emitToUser: jest.fn(),
  emitToTechnologists: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/database');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'Password1',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'user@test.com',
      password: 'weak',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(res.status).toBe(400);
  });

  it('should register a user successfully', async () => {
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'STUDENT',
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'user@test.com',
      password: 'Password1!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'STUDENT',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('user@test.com');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 for non-existent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'Password1!',
    });
    expect(res.status).toBe(401);
  });

  it('should return 401 for wrong password', async () => {
    const hashed = await bcrypt.hash('CorrectPassword1!', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      password: hashed,
      role: 'STUDENT',
      isEmailVerified: true,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'WrongPassword1!',
    });
    expect(res.status).toBe(401);
  });

  it('should login successfully and return access token', async () => {
    const hashed = await bcrypt.hash('Password1!', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      password: hashed,
      firstName: 'John',
      lastName: 'Doe',
      role: 'STUDENT',
      isEmailVerified: true,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'Password1!',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Health check', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
