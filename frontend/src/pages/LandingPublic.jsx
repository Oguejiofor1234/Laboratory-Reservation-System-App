import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  teal:    '#00B5BD',
  navy:    '#003B5C',
  navyDark:'#00294a',
  white:   '#ffffff',
  light:   '#f4f9f9',
  gray:    '#f0f0f0',
  text:    '#333333',
  muted:   '#666666',
  border:  '#e0e0e0',
};

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    nav: {
      book: 'Book Equipment', contact: 'Contact', signIn: 'Sign In', register: 'Register',
      home: 'Home',
    },
    hero: {
      title: 'Advanced Lab Equipment,',
      title2: 'Reserved For You.',
      sub: 'Book equipment online · Get trained · Conduct your research',
      cta: 'Book Equipment →',
      login: 'Sign In',
    },
    explore: {
      heading: 'Explore REGAL Equipment',
      sub: 'Booking equipment is only the beginning of your research journey. With REGAL Laboratory, you get access to a modern platform with all the tools and resources you need.',
    },
    features: [
      { icon: '🔬', title: 'More Control', body: 'Book equipment on your schedule, from any device, at any time. Manage your reservations with ease through our intuitive portal.' },
      { icon: '📊', title: 'More Clarity', body: 'View equipment availability in real time, see who is in charge, and track your booking status from pending to confirmed.' },
      { icon: '⚡', title: 'More Convenience', body: 'Receive email notifications when your booking is confirmed or rejected. No need to follow up manually with supervisors.' },
    ],
    equipment: {
      heading: 'Our Equipment',
      sub: 'Select any equipment below to start your booking',
      book: 'Book Equipment',
      unavailable: 'Unavailable',
      supervisor: 'Supervisor',
      booked: 'Booked',
    },
    how: {
      heading: 'How to Book Equipment',
      steps: [
        'Go to the booking page.',
        'Select your equipment.',
        'Confirm your experience level.',
        'Fill in your booking details.',
        'Submit and wait for supervisor approval.',
        'Receive email confirmation.',
      ],
    },
    contact: {
      heading: 'Contact Us',
      sub: 'Have questions? Reach out to the REGAL Laboratory team.',
      email: 'lab@regallaboratory.edu',
      phone: '+1 (555) 000-1780',
      address: 'REGAL Laboratory · University Campus · Building A, Room 1780',
    },
    footer: {
      copy: '© 2025 REGAL Laboratory Equipment Reservation System. All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
    },
  },
  fr: {
    nav: {
      book: 'Réserver équipement', contact: 'Contact', signIn: 'Connexion', register: "S'inscrire",
      home: 'Accueil',
    },
    hero: {
      title: 'Équipement de laboratoire,',
      title2: 'Réservé pour vous.',
      sub: 'Réservez en ligne · Soyez formé · Conduisez vos recherches',
      cta: "Réserver l'équipement →",
      login: 'Connexion',
    },
    explore: {
      heading: 'Explorer l\'équipement REGAL',
      sub: 'La réservation n\'est que le début de votre parcours de recherche. REGAL vous donne accès à une plateforme moderne avec tous les outils nécessaires.',
    },
    features: [
      { icon: '🔬', title: 'Plus de contrôle', body: 'Réservez selon votre horaire, depuis n\'importe quel appareil, à tout moment.' },
      { icon: '📊', title: 'Plus de clarté', body: 'Consultez la disponibilité en temps réel et suivez l\'état de votre réservation.' },
      { icon: '⚡', title: 'Plus de commodité', body: 'Recevez des notifications par e-mail lors de la confirmation ou du rejet de votre réservation.' },
    ],
    equipment: {
      heading: 'Notre équipement',
      sub: 'Sélectionnez un équipement pour commencer votre réservation',
      book: "Réserver l'équipement",
      unavailable: 'Indisponible',
      supervisor: 'Superviseur',
      booked: 'Réservé',
    },
    how: {
      heading: 'Comment réserver',
      steps: [
        'Accédez à la page de réservation.',
        'Sélectionnez votre équipement.',
        'Confirmez votre niveau d\'expérience.',
        'Remplissez les détails de réservation.',
        'Soumettez et attendez l\'approbation.',
        'Recevez la confirmation par e-mail.',
      ],
    },
    contact: {
      heading: 'Contactez-nous',
      sub: 'Des questions ? Contactez l\'équipe du laboratoire REGAL.',
      email: 'lab@regallaboratory.edu',
      phone: '+1 (555) 000-1780',
      address: 'Laboratoire REGAL · Campus universitaire · Bâtiment A, Salle 1780',
    },
    footer: {
      copy: '© 2025 REGAL Laboratory. Tous droits réservés.',
      privacy: 'Politique de confidentialité',
      terms: "Conditions d'utilisation",
    },
  },
};

// ── Hours & Location (collapsible) ──────────────────────────────────────
const HoursLocation = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const todayIdx = now.getDay();
  const hour = now.getHours();
  const isOpen = todayIdx >= 1 && todayIdx <= 5 && hour >= 8 && hour < 16;

  const C2 = { teal:'#00B5BD', navy:'#003B5C', white:'#fff', border:'#e0e0e0', muted:'#666', text:'#333' };

  const schedule = lang === 'fr'
    ? [
        { day:'Lundi',    time:'8:00 AM – 4:00 PM', open:true,  idx:1 },
        { day:'Mardi',    time:'8:00 AM – 4:00 PM', open:true,  idx:2 },
        { day:'Mercredi', time:'8:00 AM – 4:00 PM', open:true,  idx:3 },
        { day:'Jeudi',    time:'8:00 AM – 4:00 PM', open:true,  idx:4 },
        { day:'Vendredi', time:'8:00 AM – 4:00 PM', open:true,  idx:5 },
        { day:'Samedi',   time:'Fermé',              open:false, idx:6 },
        { day:'Dimanche', time:'Fermé',              open:false, idx:0 },
      ]
    : [
        { day:'Monday',    time:'8:00 AM – 4:00 PM', open:true,  idx:1 },
        { day:'Tuesday',   time:'8:00 AM – 4:00 PM', open:true,  idx:2 },
        { day:'Wednesday', time:'8:00 AM – 4:00 PM', open:true,  idx:3 },
        { day:'Thursday',  time:'8:00 AM – 4:00 PM', open:true,  idx:4 },
        { day:'Friday',    time:'8:00 AM – 4:00 PM', open:true,  idx:5 },
        { day:'Saturday',  time:'Closed',             open:false, idx:6 },
        { day:'Sunday',    time:'Closed',             open:false, idx:0 },
      ];

  const todayRow = schedule.find(s => s.idx === todayIdx);
  const googleMapsUrl = 'https://maps.google.com/?q=REGAL+Laboratory+University+Campus+Building+A+Room+1780';

  return (
    <section style={{ background:'#fff', borderTop:'1px solid #e0e0e0', borderBottom:'1px solid #e0e0e0' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, minHeight:64 }}>

          {/* Left — Google address */}
          <a href={googleMapsUrl} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:14, padding:'20px 0', textDecoration:'none', borderRight:'1px solid #e0e0e0' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#EEF4FB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#00B5BD"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:'#003B5C', margin:0, lineHeight:1.2 }}>REGAL Laboratory</p>
              <p style={{ fontSize:12, color:'#666', margin:'2px 0 0' }}>University Campus · Building A, Room 1780</p>
              <p style={{ fontSize:11, color:'#00B5BD', fontWeight:700, margin:'2px 0 0' }}>
                {lang === 'fr' ? 'Voir sur Google Maps →' : 'View on Google Maps →'}
              </p>
            </div>
          </a>

          {/* Right — collapsible hours */}
          <div style={{ padding:'0 0 0 24px' }}>
            {/* Toggle row */}
            <button onClick={() => setOpen(o => !o)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer', padding:'20px 0', textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#EEF4FB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#00B5BD" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="#00B5BD" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:'#003B5C', margin:0, lineHeight:1.2 }}>
                    {lang === 'fr' ? 'Heures d\'ouverture' : 'Business Hours'}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                    <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.5, repeat:Infinity }}
                      style={{ width:7, height:7, borderRadius:'50%', background: isOpen ? '#27ae60' : '#e74c3c', display:'inline-block', flexShrink:0 }} />
                    <span style={{ fontSize:12, fontWeight:700, color: isOpen ? '#27ae60' : '#e74c3c' }}>
                      {isOpen
                        ? (lang === 'fr' ? 'Ouvert maintenant' : 'Open now')
                        : (lang === 'fr' ? 'Fermé maintenant' : 'Closed now')}
                    </span>
                    {todayRow && (
                      <span style={{ fontSize:11, color:'#999' }}>
                        · {todayRow.open ? todayRow.time : (lang === 'fr' ? 'Fermé aujourd\'hui' : 'Closed today')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Arrow */}
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.25 }}
                style={{ fontSize:18, color:'#00B5BD', display:'inline-block', marginRight:4 }}>
                ▼
              </motion.span>
            </button>

            {/* Expanded schedule */}
            <motion.div
              initial={false}
              animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
              transition={{ duration:0.3, ease:'easeInOut' }}
              style={{ overflow:'hidden' }}>
              <div style={{ paddingBottom:16 }}>
                {schedule.map((s, i) => {
                  const isToday = s.idx === todayIdx;
                  return (
                    <div key={i} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'9px 14px',
                      borderRadius:10, marginBottom:3,
                      background: isToday ? (isOpen ? '#f0fffe' : '#fff5f5') : 'transparent',
                      borderLeft: isToday ? `3px solid ${isOpen ? '#27ae60' : '#e74c3c'}` : '3px solid transparent',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight: isToday ? 800 : 500, color: isToday ? '#003B5C' : '#444' }}>{s.day}</span>
                        {isToday && (
                          <span style={{ fontSize:9, fontWeight:800, background: isOpen ? '#27ae60':'#e74c3c', color:'#fff', borderRadius:20, padding:'1px 7px', letterSpacing:0.5 }}>
                            {lang === 'fr' ? "Aujourd'hui" : 'TODAY'}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color: !s.open ? '#e74c3c' : '#00B5BD' }}>{s.time}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Equipment Row (LifeLabs alternating style) ───────────────────────
const EquipRow = ({ eq, t, reverse, lang }) => {
  const circleColors = [
    '#bfe8f0', '#c5e0f5', '#d4ecd4', '#fde8c8', '#e8d4f0', '#ffd6d6', '#d4f0e8', '#e8f0d4',
  ];
  const idx = Math.abs(eq.name.charCodeAt(0)) % circleColors.length;
  const bgColor = circleColors[idx];

  const circleEl = (
    <motion.div
      initial={{ opacity: 0, x: reverse ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{
        width: 420, height: 420, borderRadius: '50%',
        background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 150,
        boxShadow: '0 16px 56px rgba(0,0,0,0.14)',
        position: 'relative', overflow: 'hidden',
      }}>
        {eq.maintenanceMode && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 36 }}>🔧</span>
            <span style={{ fontSize: 13, color: '#e67e22', fontWeight: 700 }}>{t.equipment.unavailable}</span>
          </div>
        )}
        {eq.imageUrl
          ? <img src={eq.imageUrl} alt={eq.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          : eq.icon}
      </div>
    </motion.div>
  );

  const textEl = (
    <motion.div
      initial={{ opacity: 0, x: reverse ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ flex: 1, minWidth: 0 }}
    >
      <h3 style={{ color: C.navy, fontSize: 28, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
        {(lang === 'fr' && eq.nameFr) ? eq.nameFr : eq.name}.
      </h3>
      <p style={{ color: C.text, fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
        {(lang === 'fr' && eq.descriptionFr) ? eq.descriptionFr : eq.description}
      </p>
      {eq.personInCharge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: C.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.white, fontWeight: 800, fontSize: 13,
          }}>
            {eq.personInCharge.firstName[0]}
          </div>
          <span style={{ color: C.muted, fontSize: 13 }}>
            <strong style={{ color: C.navy }}>{t.equipment.supervisor}:</strong>{' '}
            {eq.personInCharge.firstName} {eq.personInCharge.lastName}
          </span>
        </div>
      )}
      {eq.confirmedNext && (
        <span style={{
          display: 'inline-block', background: '#fff8f0', color: '#e67e22',
          border: '1px solid #f5cba7', borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700,
        }}>
          📅 {t.equipment.booked} — {eq.confirmedNext.userName}
        </span>
      )}
      {eq.maintenanceMode && (
        <span style={{
          display: 'inline-block', background: '#fef9e7', color: '#e67e22',
          border: '1px solid #f9e4b7', borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700,
        }}>
          🔧 {t.equipment.unavailable}
        </span>
      )}

    </motion.div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      gap: 64, padding: '56px 0',
      borderBottom: `1px solid ${C.border}`,
      flexWrap: 'wrap',
    }}>
      {reverse ? <>{textEl}{circleEl}</> : <>{circleEl}{textEl}</>}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const LandingPublic = () => {
  const { i18n } = useTranslation();
  // Sync with global i18n language (persisted across pages)
  const [lang, setLang] = useState(() => {
    const l = i18n.language?.slice(0, 2);
    return l === 'fr' ? 'fr' : 'en';
  });
  const [activeSection, setActiveSection] = useState('hero');
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = T[lang];

  const switchLang = (l) => {
    setLang(l);
    i18n.changeLanguage(l); // updates Dashboard, Navbar, BookingFlow, etc.
  };

  // Track which section is in view
  useEffect(() => {
    const sections = ['hero', 'equipment', 'contact'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(obs => obs?.disconnect());
  }, []);

  const { data: equipmentData = [] } = useQuery({
    queryKey: ['equipment-public'],
    queryFn: () => api.get('/equipment').then(r => r.data.data),
    staleTime: 60000,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data),
    staleTime: 0,          // always fetch fresh
    refetchOnMount: true,
  });
  const coverImageUrl = siteSettings?.coverImageUrl || null;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: C.white, color: C.text, minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.white, borderBottom: `1px solid ${C.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: C.white, fontWeight: 900, fontSize: 16 }}>R</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, letterSpacing: 0.5 }}>REGAL</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1 }}>Laboratory</div>
            </div>
          </div>

          {/* Links — all in one pill bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f4f6f8', borderRadius: 32, padding: '4px 6px' }}>

            {/* Section links + Book Equipment — all toggle, one active at a time */}
            {[
              { id: 'hero',      label: lang === 'en' ? 'Home' : 'Accueil',            href: '#hero',      nav: false },
              { id: 'equipment', label: lang === 'en' ? 'Equipment' : 'Équipement',    href: '#equipment', nav: false },
              { id: 'book',      label: lang === 'en' ? 'Book Equipment' : 'Réserver', href: user ? '/book' : '/login', nav: true },
            ].map(link => (
              link.nav ? (
                <Link key={link.id} to={link.href}
                  onClick={() => setActiveSection(link.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', transition: 'all 0.22s',
                    background: activeSection === link.id ? C.teal : 'transparent',
                    color: activeSection === link.id ? C.white : C.navy,
                    boxShadow: activeSection === link.id ? '0 2px 10px rgba(0,181,189,0.25)' : 'none',
                  }}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.id} href={link.href}
                  onClick={() => setActiveSection(link.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', transition: 'all 0.22s',
                    background: activeSection === link.id ? C.teal : 'transparent',
                    color: activeSection === link.id ? C.white : C.navy,
                    boxShadow: activeSection === link.id ? '0 2px 10px rgba(0,181,189,0.25)' : 'none',
                  }}>
                  {link.label}
                </a>
              )
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

            {/* EN / FR */}
            {['en', 'fr'].map(l => (
              <button key={l} onClick={() => switchLang(l)} style={{
                padding: '7px 12px', borderRadius: 28, fontSize: 12, fontWeight: 800,
                border: 'none', cursor: 'pointer', transition: 'all 0.22s',
                background: lang === l ? C.navy : 'transparent',
                color: lang === l ? C.white : C.muted,
                boxShadow: lang === l ? '0 2px 8px rgba(0,59,92,0.2)' : 'none',
              }}>{l.toUpperCase()}</button>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

            {/* Contact — last */}
            <a href="#contact"
              onClick={() => setActiveSection('contact')}
              style={{
                padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'all 0.22s',
                background: activeSection === 'contact' ? C.teal : 'transparent',
                color: activeSection === 'contact' ? C.white : C.navy,
                boxShadow: activeSection === 'contact' ? '0 2px 10px rgba(0,181,189,0.25)' : 'none',
              }}>
              Contact
            </a>

          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" style={{
        background: coverImageUrl
          ? `url(${coverImageUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, ${C.navy} 0%, ${C.teal} 100%)`,
        minHeight: 520, display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dark overlay when cover photo is set */}
        {coverImageUrl && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,20,40,0.35) 0%, rgba(0,40,60,0.25) 60%, rgba(0,20,40,0.4) 100%)' }} />
        )}
        {/* Decorative circles (shown only without cover) */}
        {!coverImageUrl && <div style={{ position: 'absolute', right: -80, top: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />}
        {!coverImageUrl && <div style={{ position: 'absolute', right: 60, bottom: -120, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p style={{ color: '#7ee8eb', fontSize: 40, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
              REGAL LABORATORY
            </p>
            <h1 style={{ color: C.white, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 8 }}>
              {t.hero.title}
            </h1>
            <h1 style={{ color: '#7ee8eb', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
              {t.hero.title2}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17, marginBottom: 40, maxWidth: 500 }}>
              {t.hero.sub}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to={user ? '/book' : '/register'} style={{
                background: C.white, color: C.navy, textDecoration: 'none',
                padding: '14px 32px', borderRadius: 32, fontWeight: 800, fontSize: 15,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}>
                {t.hero.cta}
              </Link>
              <Link to="/login" style={{
                background: 'transparent', color: C.white, textDecoration: 'none',
                padding: '14px 32px', borderRadius: 32, fontWeight: 700, fontSize: 15,
                border: '2px solid rgba(255,255,255,0.5)',
              }}>
                {t.hero.login}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Opening Hours + Location ── */}
      <HoursLocation lang={lang} />

      {/* ── Explore REGAL Equipment ── */}
      <section style={{ background: C.light, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Two-col header */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:32, flexWrap:'wrap', marginBottom:56 }}>
            <div style={{ maxWidth:520 }}>
              <p style={{ fontSize:12, fontWeight:800, color:C.teal, letterSpacing:3, textTransform:'uppercase', marginBottom:12 }}>Why Choose REGAL</p>
              <h2 style={{ color:C.navy, fontSize:'clamp(26px,3.5vw,40px)', fontWeight:900, lineHeight:1.15, margin:0 }}>
                {t.explore.heading}
              </h2>
            </div>
            <p style={{ color:C.muted, fontSize:15, lineHeight:1.8, maxWidth:400, margin:0 }}>
              {t.explore.sub}
            </p>
          </div>

          {/* Feature cards — no icons, modern layout */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
            {t.features.map((f, i) => {
              const colors = ['#00B5BD','#003B5C','#27ae60'];
              return (
                <motion.div key={i}
                  initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.1, duration:0.5 }}
                  whileHover={{ y:-4, boxShadow:'0 16px 40px rgba(0,59,92,0.12)' }}
                  style={{
                    background:C.white, borderRadius:20, padding:'40px 32px',
                    boxShadow:'0 2px 16px rgba(0,59,92,0.07)',
                    borderLeft:`4px solid ${colors[i]}`,
                    display:'flex', flexDirection:'column', gap:16,
                    transition:'all 0.25s',
                  }}
                >
                  {/* Step number */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:colors[i], letterSpacing:2, textTransform:'uppercase' }}>0{i+1}</span>
                    <div style={{ width:36, height:3, borderRadius:9999, background:`linear-gradient(90deg,${colors[i]},transparent)` }} />
                  </div>
                  {/* Title */}
                  <h3 style={{ color:C.navy, fontWeight:800, fontSize:20, margin:0, lineHeight:1.2 }}>{f.title}</h3>
                  {/* Body */}
                  <p style={{ color:C.muted, fontSize:14, lineHeight:1.8, margin:0, flex:1 }}>{f.body}</p>
                  {/* Bottom link */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <div style={{ width:20, height:1.5, background:colors[i] }} />
                    <span style={{ fontSize:12, fontWeight:700, color:colors[i] }}>Learn more</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Equipment Rows (LifeLabs style) ── */}
      <section id="equipment" style={{ padding: '60px 24px 0', background: C.white }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 style={{ color: C.navy, fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
              {t.equipment.heading}
            </h2>
            <p style={{ color: C.muted, fontSize: 15 }}>{t.equipment.sub}</p>
          </div>

          {equipmentData.map((eq, i) => (
            <EquipRow key={eq.id} eq={eq} t={t} reverse={i % 2 !== 0} lang={lang} />
          ))}

          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Link to={user ? '/book' : '/register'} style={{
              background: C.teal, color: C.white, textDecoration: 'none',
              padding: '14px 36px', borderRadius: 32, fontWeight: 700, fontSize: 15,
              display: 'inline-block', boxShadow: '0 4px 16px rgba(0,181,189,0.3)',
            }}>
              {t.equipment.book} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How to Book ── */}
      <section style={{ background: C.light, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ color: C.navy, fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
            {t.how.heading}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {t.how.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: 36, height: 36, borderRadius: '50%',
                  background: C.teal, color: C.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                }}>
                  {i + 1}
                </div>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, paddingTop: 6 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
        padding: '64px 24px', textAlign: 'center',
      }}>
        <h2 style={{ color: C.white, fontSize: 30, fontWeight: 800, marginBottom: 16 }}>
          {lang === 'en' ? "It's your research. Get started today." : "C'est votre recherche. Commencez aujourd'hui."}
        </h2>
        <Link to={user ? '/book' : '/register'} style={{
          background: C.white, color: C.navy, textDecoration: 'none',
          padding: '14px 36px', borderRadius: 32, fontWeight: 800, fontSize: 15,
          display: 'inline-block', marginTop: 8,
        }}>
          {lang === 'en' ? 'Book Equipment Today →' : "Réserver l'équipement →"}
        </Link>
      </section>

      {/* ── Contact ── */}
      <section id="contact" style={{ background: '#f8f9fb', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ color: C.navy, fontSize: 36, fontWeight: 900, marginBottom: 12 }}>
              {lang === 'en' ? "Let's Connect With" : 'Contactez'}{' '}
              <span style={{ color: C.teal }}>REGAL Laboratory</span>
            </h2>
            <p style={{ color: C.muted, fontSize: 16, maxWidth: 540, margin: '0 auto' }}>{t.contact.sub}</p>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start', flexWrap: 'wrap' }}>

            {/* Left — Form */}
            <div style={{ background: C.white, borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: `1px solid ${C.border}` }}>
              <h3 style={{ color: C.navy, fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                {lang === 'en' ? 'Send a Message' : 'Envoyer un message'}
              </h3>
              <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
                {lang === 'en' ? 'Fill in the form below and we will get back to you within 24 hours.' : 'Remplissez le formulaire et nous vous répondrons sous 24 heures.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {[{label: lang === 'en' ? 'Full Name *' : 'Nom complet *', ph: 'John Doe'}, {label: 'Email *', ph: 'you@university.edu'}].map((f, i) => (
                  <div key={i}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: 0.5 }}>{f.label}</label>
                    <input placeholder={f.ph} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'en' ? 'Department / Faculty' : 'Département'}</label>
                  <input placeholder={lang === 'en' ? 'e.g. Chemistry' : 'ex. Chimie'} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'en' ? 'Equipment of Interest' : 'Équipement'}</label>
                  <select style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">{lang === 'en' ? 'Select equipment' : 'Choisir équipement'}</option>
                    {['XRD','FTIR','CHNS-O','XRF','SEM','TGA','GC-MS','TEM','BET','DSC'].map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'en' ? 'Message / Experiment Details *' : 'Message / Détails *'}</label>
                <textarea rows={5} placeholder={lang === 'en' ? 'Describe your experiment, research goals, and any specific requirements...' : 'Décrivez votre expérience, vos objectifs de recherche...'}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fafafa', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <button style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.teal}, #007b82)`, color: C.white,
                fontWeight: 800, fontSize: 15, letterSpacing: 0.3,
                boxShadow: '0 4px 16px rgba(0,181,189,0.3)',
              }}>
                {lang === 'en' ? 'Send Message →' : 'Envoyer le message →'}
              </button>
            </div>

            {/* Right — Info sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Get in touch */}
              <div style={{ background: C.white, borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: `1px solid ${C.border}` }}>
                <h3 style={{ color: C.navy, fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                  {lang === 'en' ? 'Get In Touch' : 'Nous contacter'}
                </h3>
                {[
                  { icon: '✉️', label: 'Email', value: t.contact.email },
                  { icon: '📞', label: lang === 'en' ? 'Phone' : 'Téléphone', value: t.contact.phone },
                  { icon: '📍', label: lang === 'en' ? 'Location' : 'Adresse', value: t.contact.address },
                  { icon: '⏱️', label: lang === 'en' ? 'Response Time' : 'Délai de réponse', value: lang === 'en' ? 'Within 24 hours' : 'Sous 24 heures' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 18 : 0, paddingBottom: i < 3 ? 18 : 0, borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0fffe', border: `1px solid ${C.teal}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ color: C.navy, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.label}</p>
                      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equipment available */}
              <div style={{ background: C.white, borderRadius: 20, padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: `1px solid ${C.border}` }}>
                <h3 style={{ color: C.navy, fontSize: 17, fontWeight: 800, marginBottom: 16 }}>
                  {lang === 'en' ? 'Equipment Available' : 'Équipements disponibles'}
                </h3>
                {['XRD — X-ray Diffraction','FTIR — Fourier-Transform Infrared','CHNS-O — Elemental Analyzer','XRF — X-ray Fluorescence','SEM — Scanning Electron Microscope','TGA — Thermogravimetric Analysis'].map((eq, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8faf8', border: `1px solid ${C.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: C.teal, fontSize: 11, fontWeight: 800 }}>✓</span>
                    </div>
                    <span style={{ color: C.text, fontSize: 13 }}>{eq}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: C.navy, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: C.white, fontWeight: 900, fontSize: 14 }}>R</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t.footer.copy}</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{t.footer.privacy}</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{t.footer.terms}</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPublic;
