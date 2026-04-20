import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

// ── Same colour palette as Navbar.jsx ────────────────────────────────────────
const C = {
  teal:   '#00B5BD',
  navy:   '#003B5C',
  white:  '#ffffff',
  muted:  '#666',
  border: '#e0e0e0',
  bg:     '#f8fafc',
  error:  '#e74c3c',
};

// ── Reusable labelled input ───────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 700,
      color: C.navy, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
    }}>
      {label}
    </label>
    {children}
    {error && (
      <p style={{ margin: '5px 0 0', fontSize: 12, color: C.error }}>{error}</p>
    )}
  </div>
);

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  fontFamily: "'Inter', system-ui, sans-serif",
  color: C.navy,
  background: C.white,
  border: `1.5px solid ${hasError ? C.error : C.border}`,
  borderRadius: 10,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
});

// ── Contact page ──────────────────────────────────────────────────────────────
const Contact = () => {
  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [serverError, setServerError] = useState('');

  // ── Client-side validation ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Your name is required.';
    if (!form.email.trim())   e.email   = 'Your email address is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.subject.trim()) e.subject = 'A subject is required.';
    if (!form.message.trim()) e.message = 'Please write your message.';
    else if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field as the user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/contact', {
        ...form,
        website: '', // honeypot — always blank from real users
      });
      setSent(true);
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
        'Something went wrong. Please try again or email us directly.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: C.white, borderRadius: 20, padding: '56px 48px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.10)', textAlign: 'center', maxWidth: 480, width: '100%',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: C.navy, margin: '0 0 12px', fontSize: 24, fontWeight: 800 }}>
            Message Sent!
          </h2>
          <p style={{ color: C.muted, lineHeight: 1.7, margin: '0 0 8px' }}>
            Thank you for reaching out. We have received your message and will get back to you shortly.
          </p>
          <p style={{ color: C.muted, fontSize: 13 }}>
            A confirmation has been sent to <strong style={{ color: C.navy }}>{form.email}</strong>.
          </p>
          <button
            onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
            style={{
              marginTop: 28, padding: '12px 28px', borderRadius: 28, fontSize: 13,
              fontWeight: 800, border: 'none', cursor: 'pointer',
              background: C.teal, color: C.white,
              boxShadow: '0 4px 14px rgba(0,181,189,0.3)',
            }}
          >
            Send another message
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 36, textAlign: 'center' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${C.teal}18`, border: `1px solid ${C.teal}40`,
            borderRadius: 24, padding: '6px 16px', marginBottom: 20,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.teal }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.teal, letterSpacing: 2, textTransform: 'uppercase' }}>
              REGAL Laboratory
            </span>
          </div>
          <h1 style={{ color: C.navy, margin: '0 0 12px', fontSize: 32, fontWeight: 900, lineHeight: 1.2 }}>
            Get in Touch
          </h1>
          <p style={{ color: C.muted, margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Have a question about equipment, training, or your reservation?
            Fill in the form below and we'll respond as soon as possible.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>

          {/* Left — contact info panel */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: C.navy, borderRadius: 16, padding: 28, color: C.white,
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>
              Contact Info
            </h3>

            {[
              { icon: '📧', label: 'Email', value: 'miracle2cool247@gmail.com' },
              { icon: '🏛️', label: 'Location', value: 'Lab 1708, School of Engineering' },
              { icon: '🕐', label: 'Response time', value: 'Within 1–2 business days' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: `${C.white}99`, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {item.label}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: C.white, lineHeight: 1.5 }}>
                  {item.value}
                </p>
              </div>
            ))}

            <div style={{
              marginTop: 28, padding: '12px 16px',
              background: `${C.white}15`, borderRadius: 10, fontSize: 12, color: `${C.white}cc`, lineHeight: 1.6,
            }}>
              💡 For urgent issues, please contact the lab technologist directly through the dashboard.
            </div>
          </motion.div>

          {/* Right — form card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: C.white, borderRadius: 16, padding: 32,
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              border: `1px solid ${C.border}`,
            }}
          >
            <form onSubmit={handleSubmit} noValidate>

              {/* Honeypot — hidden from real users, caught by server */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: 'none' }}
              />

              {/* Name + Email side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Your Name" error={errors.name}>
                  <input
                    style={inputStyle(!!errors.name)}
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    maxLength={100}
                  />
                </Field>
                <Field label="Email Address" error={errors.email}>
                  <input
                    style={inputStyle(!!errors.email)}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    maxLength={254}
                  />
                </Field>
              </div>

              {/* Subject */}
              <Field label="Subject" error={errors.subject}>
                <input
                  style={inputStyle(!!errors.subject)}
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Equipment enquiry / Training request / Other..."
                  maxLength={200}
                />
              </Field>

              {/* Message */}
              <Field label="Message" error={errors.message}>
                <textarea
                  style={{
                    ...inputStyle(!!errors.message),
                    resize: 'vertical',
                    minHeight: 140,
                    lineHeight: 1.6,
                  }}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your question or request in detail..."
                  maxLength={5000}
                />
                <p style={{ textAlign: 'right', fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
                  {form.message.length}/5000
                </p>
              </Field>

              {/* Server-side error */}
              <AnimatePresence>
                {serverError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: '#fef2f2', border: `1px solid #fecaca`,
                      borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                      fontSize: 13, color: C.error,
                    }}
                  >
                    ⚠️ {serverError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 28,
                  fontSize: 14, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#aaa' : C.teal,
                  color: C.white,
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(0,181,189,0.35)',
                  transition: 'all 0.2s',
                  letterSpacing: 0.5,
                }}
              >
                {loading ? 'Sending…' : 'Send Message →'}
              </button>

            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
