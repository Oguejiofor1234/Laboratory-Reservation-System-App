/**
 * Quick email connection test — run with the SAME credentials set on Render:
 *
 *   EMAIL_USER=you@gmail.com EMAIL_PASS=your-app-password node test-email.js
 *
 * Remove this file after debugging.
 */
const nodemailer = require('nodemailer');

const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('❌ Set EMAIL_USER and EMAIL_PASS environment variables first.');
  process.exit(1);
}

console.log(`Testing SMTP connection...`);
console.log(`  Host : ${EMAIL_HOST || 'smtp.gmail.com'}`);
console.log(`  Port : ${EMAIL_PORT || '587'}`);
console.log(`  User : ${EMAIL_USER}`);
console.log(`  Secure: ${EMAIL_SECURE || 'false'}`);

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(EMAIL_PORT || '587'),
  secure: EMAIL_SECURE === 'true',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

transporter.verify()
  .then(() => {
    console.log('\n✅ SMTP connection OK — credentials are valid!');
    console.log('Sending test email...');
    return transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: 'REGAL Lab — Email Test',
      text: 'If you receive this, email is working correctly on Render.',
    });
  })
  .then(info => {
    console.log(`✅ Test email sent! Message ID: ${info.messageId}`);
    console.log('Check your inbox (and spam folder).');
    process.exit(0);
  })
  .catch(err => {
    console.error(`\n❌ FAILED: ${err.message}`);
    if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
      console.error('\n→ Fix: Use a Gmail App Password (not your regular password).');
      console.error('   Go to: Google Account → Security → 2-Step Verification → App Passwords');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.error('\n→ Fix: Port 587 may be blocked. Try EMAIL_PORT=465 with EMAIL_SECURE=true');
    }
    process.exit(1);
  });
