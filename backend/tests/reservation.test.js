process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

jest.mock('../src/config/database', () => ({
  reservation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  equipment: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  trainingCertification: { findUnique: jest.fn() },
  waitlist: { findFirst: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  notification: { create: jest.fn() },
  auditLog: { create: jest.fn() },
  $disconnect: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendBookingRequest: jest.fn(),
  sendTechNewBooking: jest.fn(),
  sendBookingConfirmed: jest.fn(),
  sendBookingRejected: jest.fn(),
  sendBookingCancelled: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  notifyTechsNewBooking: jest.fn(),
  notifyBookingConfirmed: jest.fn(),
  notifyBookingRejected: jest.fn(),
  notifyBookingCancelled: jest.fn(),
}));

jest.mock('../src/config/socket', () => ({
  emitToUser: jest.fn(),
  emitToTechnologists: jest.fn(),
}));

jest.mock('../src/services/cronJobs', () => ({
  initCronJobs: jest.fn(),
  processWaitlist: jest.fn(),
}));

const prisma = require('../src/config/database');

const makeToken = (user = { id: 'u1', role: 'STUDENT' }) =>
  jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

const authHeader = (role = 'STUDENT') => ({
  Authorization: `Bearer ${makeToken({ id: 'u1', role })}`,
});

describe('POST /api/reservations', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth middleware user lookup
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'u@test.com', role: 'STUDENT', isEmailVerified: true,
      firstName: 'John', lastName: 'Doe',
    });
  });

  it('should reject missing equipmentId', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(authHeader())
      .send({ startTime: new Date().toISOString(), endTime: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  it('should reject booking in the past', async () => {
    prisma.equipment.findUnique.mockResolvedValue({
      id: 'eq1', name: 'Laser Cutter', requiresTraining: false,
      totalUnits: 2, maintenanceMode: false,
    });
    prisma.trainingCertification.findUnique.mockResolvedValue({ id: 'cert1' });
    prisma.reservation.count.mockResolvedValue(0);

    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const past2 = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/reservations')
      .set(authHeader())
      .send({ equipmentId: 'eq1', startTime: past, endTime: past2 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past/i);
  });

  it('should reject when equipment is fully booked (conflict)', async () => {
    prisma.equipment.findUnique.mockResolvedValue({
      id: 'eq1', name: 'Laser Cutter', requiresTraining: false,
      totalUnits: 2, maintenanceMode: false,
    });
    prisma.trainingCertification.findUnique.mockResolvedValue({ id: 'cert1' });
    // Return count equal to totalUnits → conflict
    prisma.reservation.count.mockResolvedValue(2);

    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/reservations')
      .set(authHeader())
      .send({ equipmentId: 'eq1', startTime: future, endTime: futureEnd });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/reservations/:id/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'u@test.com', role: 'STUDENT', isEmailVerified: true,
      firstName: 'John', lastName: 'Doe',
    });
  });

  it('should reject cancellation within 24 hours for students', async () => {
    const startTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      status: 'CONFIRMED',
      startTime,
      equipment: { name: 'Laser Cutter' },
      user: { id: 'u1', email: 'u@test.com', firstName: 'John', lastName: 'Doe' },
    });

    const res = await request(app)
      .patch('/api/reservations/r1/cancel')
      .set(authHeader('STUDENT'))
      .send({ reason: 'Changed plans' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/24 hour/i);
  });

  it('should allow technologist to cancel within 24 hours', async () => {
    const startTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
    prisma.user.findUnique.mockResolvedValue({
      id: 'tech1', email: 't@test.com', role: 'TECHNOLOGIST', isEmailVerified: true,
      firstName: 'Lab', lastName: 'Tech',
    });
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      status: 'CONFIRMED',
      startTime,
      equipmentId: 'eq1',
      equipment: { name: 'Laser Cutter' },
      user: { id: 'u1', email: 'u@test.com', firstName: 'John', lastName: 'Doe' },
    });
    prisma.reservation.update.mockResolvedValue({
      id: 'r1', status: 'CANCELLED',
      equipment: { name: 'Laser Cutter' },
      user: { id: 'u1', email: 'u@test.com', firstName: 'John', lastName: 'Doe' },
    });

    const res = await request(app)
      .patch('/api/reservations/r1/cancel')
      .set({ Authorization: `Bearer ${makeToken({ id: 'tech1', role: 'TECHNOLOGIST' })}` })
      .send({ reason: 'Emergency' });
    expect(res.status).toBe(200);
  });
});
