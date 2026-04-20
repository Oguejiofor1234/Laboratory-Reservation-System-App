const transporter = require('../config/email');
const logger = require('../utils/logger');

const FROM = process.env.EMAIL_FROM || '"Lab 1780" <noreply@lab1780.edu>';
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
      <h1>● REGAL LABORATORY</h1>
      <p>1780 Equipment Reservation System</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer"><p>© 2024 Lab 1780 · This is an automated message, please do not reply.</p></div>
  </div>
</body>
</html>`;

const send = async (to, subject, html, extra = {}) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, ...extra });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    // Don't throw — email failure shouldn't break the request
  }
};

// ─── Email templates ─────────────────────────────────────────────────────────

const sendEmailVerification = async (user, token) => {
  const link = `${CLIENT_URL}/verify-email/${token}`;
  await send(user.email, 'Verify Your Email — Lab 1780', baseTemplate(
    'Email Verification',
    `<h2>Welcome, ${user.firstName}!</h2>
     <p>Please verify your email address to activate your Lab 1780 account.</p>
     <a href="${link}" class="btn">VERIFY EMAIL →</a>
     <p style="margin-top:16px;font-size:12px;color:#8b949e;">If the button above doesn't work, copy and paste this link into your browser:</p>
     <p style="word-break:break-all;font-size:11px;color:#00bfa5;background:#0d1117;padding:10px;border-radius:4px;border:1px solid #30363d;">${link}</p>
     <p style="font-size:11px;color:#484f58;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>`
  ));
};

const sendPasswordReset = async (user, token, code, baseUrl = CLIENT_URL) => {
  const link = `${baseUrl}/reset-password/${token}`;
  await send(user.email, 'Password Reset — Lab 1780', baseTemplate(
    'Password Reset',
    `<h2>Reset Your Password</h2>
     <p>You requested a password reset for your Lab 1780 account.</p>

     <div style="background:#0d1117;border:2px solid #00bfa5;border-radius:10px;padding:24px;text-align:center;margin:20px 0;">
       <p style="color:#8b949e;font-size:12px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Your Reset Code</p>
       <p style="color:#00bfa5;font-size:42px;font-weight:900;letter-spacing:10px;margin:0;font-family:'Courier New',monospace;">${code}</p>
       <p style="color:#484f58;font-size:11px;margin:10px 0 0;">Enter this code on the Reset Password page — works on any device</p>
     </div>

     <p style="color:#8b949e;font-size:13px;">Or click the button below from the same device you used to request this reset:</p>
     <a href="${link}" class="btn">RESET VIA LINK →</a>
     <p style="font-size:11px;color:#484f58;">Code and link both expire in 1 hour. If you didn't request this, ignore this email.</p>`
  ));
};

const sendBookingRequest = async (user, reservation, equipment, personInCharge = null) => {
  const details = buildReservationDetails(reservation, equipment, personInCharge);
  const picName = personInCharge ? `${personInCharge.firstName} ${personInCharge.lastName}` : 'the assigned supervisor';
  await send(user.email, `Booking Request Received — ${equipment.name}`, baseTemplate(
    'Booking Request',
    `<h2>Booking Request Received</h2>
     <p>Your reservation request for <strong style="color:#00bfa5">${equipment.name}</strong> has been submitted and is pending approval from <strong style="color:#00bfa5">${picName}</strong>.</p>
     ${details}
     <p>You will be notified by email once your request is reviewed.</p>
     <p style="font-size:12px;color:#8b949e;">To view your booking status, log in with the email and password you used to register.</p>
     <a href="${CLIENT_URL}/login" class="btn">LOG IN TO VIEW BOOKING →</a>`
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

const sendTrainingRescheduled = async (student, session, equipment, proposedAt, reason) => {
  await send(student.email, `Training Rescheduled — ${equipment.name}`, baseTemplate(
    'Training Rescheduled',
    `<h2>Training <span style="color:#d29922">Rescheduled</span> ⏰</h2>
     <p>Your supervisor has proposed a <strong>new date and time</strong> for your training on <strong style="color:#00bfa5">${equipment.name}</strong>.</p>
     <div class="detail-box">
       <div class="detail-row"><span class="detail-label">EQUIPMENT</span><span class="detail-value">${equipment.name}</span></div>
       <div class="detail-row"><span class="detail-label">ORIGINAL DATE</span><span class="detail-value">${new Date(session.scheduledAt).toLocaleString()}</span></div>
       <div class="detail-row"><span class="detail-label">NEW PROPOSED DATE</span><span class="detail-value" style="color:#d29922;font-weight:900">${new Date(proposedAt).toLocaleString()}</span></div>
       ${reason ? `<div class="detail-row"><span class="detail-label">REASON</span><span class="detail-value">${reason}</span></div>` : ''}
     </div>
     <p style="color:#8b949e">Please log in to your dashboard to <strong>Accept</strong> or <strong>Reject</strong> this proposed time.</p>
     <a href="${CLIENT_URL}/dashboard" class="btn">RESPOND NOW →</a>`
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

// ─── Helper ─────────────────────────────────────────────────────────────────────────────

const detailRow = (label, value, color = '#e6edf3') =>
  `<tr>
    <td style="padding:8px 12px;font-size:12px;color:#8b949e;font-family:'Courier New',monospace;border-bottom:1px solid #21262d;white-space:nowrap;width:40%;">${label}</td>
    <td style="padding:8px 12px;font-size:12px;color:${color};font-family:'Courier New',monospace;font-weight:bold;border-bottom:1px solid #21262d;text-align:right;">${value}</td>
  </tr>`;

const buildReservationDetails = (reservation, equipment, personInCharge = null) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;border:1px solid #30363d;border-radius:6px;margin:16px 0;">
    <tbody>
      ${detailRow('EQUIPMENT', equipment.name)}
      ${detailRow('START', new Date(reservation.startTime).toLocaleString())}
      ${detailRow('END', new Date(reservation.endTime).toLocaleString())}
      ${personInCharge ? detailRow('PERSON IN CHARGE', `${personInCharge.firstName} ${personInCharge.lastName}`, '#00bfa5') : ''}
      ${detailRow('STATUS', reservation.status, reservation.status === 'CONFIRMED' ? '#3fb950' : reservation.status === 'REJECTED' ? '#f85149' : '#d29922')}
      ${reservation.experimentDescription ? detailRow('EXPERIMENT', reservation.experimentDescription) : ''}
      ${reservation.notes ? detailRow('NOTES', reservation.notes) : ''}
    </tbody>
  </table>`;

// ─── Contact form ─────────────────────────────────────────────────────────────

/**
 * Notify the lab admin (miracle2cool247@gmail.com) of a new contact message.
 *
 * ─ Email subject  : "[Contact Form] Miracle Mbah — SEM"  (clean, no "Enquiry about")
 * ─ Reply-To       : sender's email — hitting Reply in Gmail goes straight to them
 * ─ Reply button   : big teal "REPLY TO MIRACLE MBAH" mailto: button at the top
 * ─ Separate rows  : Name / Email / Department / Equipment / Received — all distinct
 */
const sendContactNotification = async ({ name, email, message, equipment, department }) => {
  const ADMIN_EMAIL = process.env.CONTACT_RECIPIENT || 'miracle2cool247@gmail.com';
  const timestamp   = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  // Build a clean, readable subject line — no auto-generated phrases
  const emailSubject = equipment
    ? `[Contact Form] ${name} — ${equipment}`
    : `[Contact Form] ${name} — General Enquiry`;

  await send(
    ADMIN_EMAIL,
    emailSubject,
    baseTemplate(
      'New Contact Message',
      `<h2>📬 New Message from ${name}</h2>

       <!-- ── Big reply button — the lab's primary action ── -->
       <div style="text-align:center;margin:20px 0 28px;">
         <a href="mailto:${email}?subject=Re: Your enquiry${equipment ? ` about ${equipment}` : ''}"
            style="display:inline-block;background:#00bfa5;color:#0d1117;
                   padding:14px 32px;border-radius:8px;text-decoration:none;
                   font-weight:900;font-size:15px;letter-spacing:0.5px;
                   box-shadow:0 4px 16px rgba(0,181,189,0.4);">
           ✉️ &nbsp; REPLY TO ${name.toUpperCase()}
         </a>
         <p style="color:#484f58;font-size:11px;margin:8px 0 0;">
           Clicking this opens your email client pre-addressed to
           <a href="mailto:${email}" style="color:#00bfa5;">${email}</a>
         </p>
       </div>

       <!-- ── Contact details table ── -->
       <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#0d1117;border:1px solid #30363d;border-radius:6px;margin:0 0 16px;">
         <tbody>
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;width:35%;">Name</td>
             <td style="padding:10px 14px;font-size:13px;color:#e6edf3;font-weight:700;border-bottom:1px solid #21262d;">${name}</td>
           </tr>
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;">Email</td>
             <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #21262d;">
               <a href="mailto:${email}" style="color:#00bfa5;font-weight:700;">${email}</a>
             </td>
           </tr>
           ${department ? `
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;">Department</td>
             <td style="padding:10px 14px;font-size:13px;color:#e6edf3;font-weight:700;border-bottom:1px solid #21262d;">${department}</td>
           </tr>` : ''}
           ${equipment ? `
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;">Equipment of Interest</td>
             <td style="padding:10px 14px;font-size:13px;color:#00bfa5;font-weight:700;border-bottom:1px solid #21262d;">${equipment}</td>
           </tr>` : ''}
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;">Received</td>
             <td style="padding:10px 14px;font-size:12px;color:#8b949e;">${timestamp}</td>
           </tr>
         </tbody>
       </table>

       <!-- ── Message body ── -->
       <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:20px;margin:0 0 20px;">
         <p style="color:#8b949e;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Message</p>
         <p style="color:#e6edf3;font-size:14px;line-height:1.8;white-space:pre-wrap;margin:0;">${message}</p>
       </div>

       <!-- ── Tip ── -->
       <p style="color:#484f58;font-size:11px;text-align:center;">
         💡 You can also hit <strong>Reply</strong> in your email client — it is pre-addressed to ${name}.
       </p>`
    ),
    // Reply-To ensures Gmail's Reply button goes directly to the sender
    { replyTo: `${name} <${email}>` }
  );
};

/**
 * Auto-reply sent to the person who filled the contact form.
 *
 * Shows equipment / department / message as clean separate rows.
 * Does NOT show any auto-generated subject text — only what the user actually typed.
 */
const sendContactAutoReply = async ({ name, email, message, equipment, department }) => {
  await send(
    email,
    'We received your message — REGAL Laboratory',
    baseTemplate(
      'Message Received',
      `<h2>Thanks for reaching out, ${name}! 👋</h2>
       <p>We have received your enquiry and will get back to you within <strong>24 hours</strong>.</p>

       <!-- ── Summary of what was submitted ── -->
       <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#0d1117;border:1px solid #30363d;border-radius:6px;margin:20px 0;">
         <tbody>
           ${equipment ? `
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;width:40%;">Equipment of Interest</td>
             <td style="padding:10px 14px;font-size:13px;color:#00bfa5;font-weight:700;border-bottom:1px solid #21262d;">${equipment}</td>
           </tr>` : ''}
           ${department ? `
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #21262d;">Department / Faculty</td>
             <td style="padding:10px 14px;font-size:13px;color:#e6edf3;font-weight:700;border-bottom:1px solid #21262d;">${department}</td>
           </tr>` : ''}
           <tr>
             <td style="padding:10px 14px;font-size:11px;color:#8b949e;letter-spacing:1px;text-transform:uppercase;">Status</td>
             <td style="padding:10px 14px;font-size:13px;color:#d29922;font-weight:700;">⏳ Pending Review</td>
           </tr>
         </tbody>
       </table>

       <!-- ── Their message ── -->
       <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:20px;margin:0 0 20px;">
         <p style="color:#8b949e;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Your Message</p>
         <p style="color:#e6edf3;font-size:13px;line-height:1.8;white-space:pre-wrap;margin:0;">${message}</p>
       </div>

       <p style="font-size:13px;color:#8b949e;">
         If your enquiry is urgent, reply directly to this email and we will prioritise your request.
       </p>`
    )
  );
};

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
  sendTrainingRescheduled,
  sendReminder,
  sendWaitlistNotification,
  sendContactNotification,
  sendContactAutoReply,
};
