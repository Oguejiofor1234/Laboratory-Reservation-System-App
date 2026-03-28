const transporter = require('../config/email');
const logger = require('../utils/logger');

const FROM = process.env.EMAIL_FROM || '"Lab 1708" <noreply@lab1708.edu>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const baseTemplate = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #0d1117; color: #e6edf3; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
    .header { background: #0d1117; padding: 24px; text-align: center; border-bottom: 1px solid #30363d; }
    .header h1 { color: #00bfa5; margin: 0; font-size: 20px; letter-spacing: 2px; }
    .header p { color: #8b949e; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; }
    .body { padding: 32px; }
    .body h2 { color: #e6edf3; font-size: 16px; margin-top: 0; }
    .body p { color: #8b949e; line-height: 1.6; }
    .detail-box { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #21262d; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #8b949e; font-size: 12px; }
    .detail-value { color: #e6edf3; font-size: 12px; font-weight: bold; }
    .btn { display: inline-block; background: #00bfa5; color: #0d1117; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 16px 0; letter-spacing: 1px; }
    .status-confirmed { color: #3fb950; }
    .status-rejected { color: #f85149; }
    .status-pending { color: #d29922; }
    .footer { background: #0d1117; padding: 16px 24px; text-align: center; border-top: 1px solid #30363d; }
    .footer p { color: #484f58; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>● SCHOOL LABORATORY</h1>
      <p>1708 Equipment Reservation System</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer"><p>© 2024 Lab 1708 · This is an automated message, please do not reply.</p></div>
  </div>
</body>
</html>`;

const send = async (to, subject, html) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    // Don't throw — email failure shouldn't break the request
  }
};

// ─── Email templates ─────────────────────────────────────────────────────────

const sendEmailVerification = async (user, token) => {
  const link = `${CLIENT_URL}/verify-email/${token}`;
  await send(user.email, 'Verify Your Email — Lab 1708', baseTemplate(
    'Email Verification',
    `<h2>Welcome, ${user.firstName}!</h2>
     <p>Please verify your email address to activate your Lab 1708 account.</p>
     <a href="${link}" class="btn">VERIFY EMAIL →</a>
     <p style="font-size:11px;color:#484f58;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>`
  ));
};

const sendPasswordReset = async (user, token) => {
  const link = `${CLIENT_URL}/reset-password/${token}`;
  await send(user.email, 'Password Reset — Lab 1708', baseTemplate(
    'Password Reset',
    `<h2>Reset Your Password</h2>
     <p>You requested a password reset for your Lab 1708 account.</p>
     <a href="${link}" class="btn">RESET PASSWORD →</a>
     <p style="font-size:11px;color:#484f58;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>`
  ));
};

const sendBookingRequest = async (user, reservation, equipment) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(user.email, `Booking Request Received — ${equipment.name}`, baseTemplate(
    'Booking Request',
    `<h2>Booking Request Received</h2>
     <p>Your reservation request for <strong style="color:#00bfa5">${equipment.name}</strong> has been submitted and is pending technologist approval.</p>
     ${details}
     <p>You will be notified once your request is reviewed.</p>
     <a href="${CLIENT_URL}/dashboard" class="btn">VIEW DASHBOARD →</a>`
  ));
};

const sendBookingConfirmed = async (user, reservation, equipment) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(user.email, `Booking Confirmed ✓ — ${equipment.name}`, baseTemplate(
    'Booking Confirmed',
    `<h2>Booking <span class="status-confirmed">Confirmed</span></h2>
     <p>Your reservation for <strong style="color:#00bfa5">${equipment.name}</strong> has been confirmed.</p>
     ${details}
     <a href="${CLIENT_URL}/dashboard" class="btn">VIEW DASHBOARD →</a>`
  ));
};

const sendBookingRejected = async (user, reservation, equipment, reason) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(user.email, `Booking Rejected — ${equipment.name}`, baseTemplate(
    'Booking Rejected',
    `<h2>Booking <span class="status-rejected">Rejected</span></h2>
     <p>Your reservation for <strong style="color:#00bfa5">${equipment.name}</strong> was rejected.</p>
     ${details}
     ${reason ? `<div class="detail-box"><p style="color:#f85149;margin:0">Reason: ${reason}</p></div>` : ''}
     <a href="${CLIENT_URL}/book" class="btn">BOOK AGAIN →</a>`
  ));
};

const sendBookingCancelled = async (user, reservation, equipment, reason) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(user.email, `Booking Cancelled — ${equipment.name}`, baseTemplate(
    'Booking Cancelled',
    `<h2>Booking Cancelled</h2>
     <p>Your reservation for <strong style="color:#00bfa5">${equipment.name}</strong> has been cancelled.</p>
     ${details}
     ${reason ? `<div class="detail-box"><p style="color:#8b949e;margin:0">Reason: ${reason}</p></div>` : ''}
     <a href="${CLIENT_URL}/book" class="btn">MAKE NEW BOOKING →</a>`
  ));
};

const sendTechNewBooking = async (techEmail, student, reservation, equipment) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(techEmail, `New Booking Request — ${equipment.name}`, baseTemplate(
    'New Booking Request',
    `<h2>New Booking Request</h2>
     <p><strong style="color:#00bfa5">${student.firstName} ${student.lastName}</strong> (${student.email}) has requested to use <strong>${equipment.name}</strong>.</p>
     ${details}
     <a href="${CLIENT_URL}/dashboard" class="btn">REVIEW REQUEST →</a>`
  ));
};

const sendTrainingRequest = async (techEmail, student, session, equipment) => {
  await send(techEmail, `Training Request — ${equipment.name}`, baseTemplate(
    'Training Request',
    `<h2>Training Session Request</h2>
     <p><strong style="color:#00bfa5">${student.firstName} ${student.lastName}</strong> has requested training on <strong>${equipment.name}</strong>.</p>
     <div class="detail-box">
       <div class="detail-row"><span class="detail-label">EQUIPMENT</span><span class="detail-value">${equipment.name}</span></div>
       <div class="detail-row"><span class="detail-label">STUDENT</span><span class="detail-value">${student.firstName} ${student.lastName}</span></div>
       <div class="detail-row"><span class="detail-label">REQUESTED SLOT</span><span class="detail-value">${new Date(session.scheduledAt).toLocaleString()}</span></div>
     </div>
     <a href="${CLIENT_URL}/dashboard" class="btn">REVIEW REQUEST →</a>`
  ));
};

const sendTrainingConfirmed = async (student, session, equipment) => {
  await send(student.email, `Training Confirmed — ${equipment.name}`, baseTemplate(
    'Training Confirmed',
    `<h2>Training <span class="status-confirmed">Confirmed</span></h2>
     <p>Your training session for <strong style="color:#00bfa5">${equipment.name}</strong> has been confirmed.</p>
     <div class="detail-box">
       <div class="detail-row"><span class="detail-label">EQUIPMENT</span><span class="detail-value">${equipment.name}</span></div>
       <div class="detail-row"><span class="detail-label">DATE & TIME</span><span class="detail-value">${new Date(session.scheduledAt).toLocaleString()}</span></div>
     </div>
     <a href="${CLIENT_URL}/dashboard" class="btn">VIEW DASHBOARD →</a>`
  ));
};

const sendTrainingCompleted = async (student, equipment) => {
  await send(student.email, `Training Completed — ${equipment.name}`, baseTemplate(
    'Training Completed',
    `<h2>Training <span class="status-confirmed">Completed</span> 🎓</h2>
     <p>Congratulations! You are now certified to use <strong style="color:#00bfa5">${equipment.name}</strong>.</p>
     <p>You can now book the equipment directly from the reservation system.</p>
     <a href="${CLIENT_URL}/book" class="btn">BOOK EQUIPMENT →</a>`
  ));
};

const sendReminder = async (user, reservation, equipment) => {
  const details = buildReservationDetails(reservation, equipment);
  await send(user.email, `Reminder: Booking Tomorrow — ${equipment.name}`, baseTemplate(
    '24-Hour Reminder',
    `<h2>Booking Reminder</h2>
     <p>This is a reminder that you have a confirmed booking for <strong style="color:#00bfa5">${equipment.name}</strong> in approximately 24 hours.</p>
     ${details}
     <a href="${CLIENT_URL}/dashboard" class="btn">VIEW DASHBOARD →</a>`
  ));
};

const sendWaitlistNotification = async (user, equipment, date) => {
  await send(user.email, `Slot Available — ${equipment.name}`, baseTemplate(
    'Waitlist — Slot Available',
    `<h2>A Slot Is Now Available</h2>
     <p>Good news! A reservation slot for <strong style="color:#00bfa5">${equipment.name}</strong> on <strong>${new Date(date).toLocaleDateString()}</strong> has opened up.</p>
     <p>Book now before it's taken!</p>
     <a href="${CLIENT_URL}/book" class="btn">BOOK NOW →</a>`
  ));
};

// ─── Helper ──────────────────────────────────────────────────────────────────

const buildReservationDetails = (reservation, equipment) => `
  <div class="detail-box">
    <div class="detail-row"><span class="detail-label">EQUIPMENT</span><span class="detail-value">${equipment.name}</span></div>
    <div class="detail-row"><span class="detail-label">START</span><span class="detail-value">${new Date(reservation.startTime).toLocaleString()}</span></div>
    <div class="detail-row"><span class="detail-label">END</span><span class="detail-value">${new Date(reservation.endTime).toLocaleString()}</span></div>
    <div class="detail-row"><span class="detail-label">STATUS</span><span class="detail-value status-${reservation.status.toLowerCase()}">${reservation.status}</span></div>
    ${reservation.notes ? `<div class="detail-row"><span class="detail-label">NOTES</span><span class="detail-value">${reservation.notes}</span></div>` : ''}
  </div>`;

module.exports = {
  sendEmailVerification,
  sendPasswordReset,
  sendBookingRequest,
  sendBookingConfirmed,
  sendBookingRejected,
  sendBookingCancelled,
  sendTechNewBooking,
  sendTrainingRequest,
  sendTrainingConfirmed,
  sendTrainingCompleted,
  sendReminder,
  sendWaitlistNotification,
};
