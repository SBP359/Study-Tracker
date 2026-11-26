/* Custom crisp SVG emblems for every Education Board / Exam and Subject icon */
(function () {
  const BOARD_STYLES = {
    cbse:        { bg: '#EFF6FF', fg: '#2563EB', ring: '#BFDBFE', label: 'CBSE', sub: 'NCERT', shape: 'shield' },
    cisce:       { bg: '#F5F3FF', fg: '#7C3AED', ring: '#DDD6FE', label: 'CISCE', sub: 'ICSE·ISC', shape: 'crest' },
    kerala:      { bg: '#ECFDF5', fg: '#059669', ring: '#A7F3D0', label: 'DHSE', sub: 'KERALA', shape: 'leaf' },
    maharashtra: { bg: '#FFF7ED', fg: '#EA580C', ring: '#FED7AA', label: 'MSB', sub: 'HSC·SSC', shape: 'fort' },
    tamilnadu:   { bg: '#ECFEFF', fg: '#0891B2', ring: '#A5F3FC', label: 'TNSB', sub: 'SCERT', shape: 'gopuram' },
    karnataka:   { bg: '#FEF2F2', fg: '#DC2626', ring: '#FECACA', label: 'PUC', sub: 'KSEAB', shape: 'shield' },
    westbengal:  { bg: '#EEF2FF', fg: '#4F46E5', ring: '#C7D2FE', label: 'WB', sub: 'CHSE', shape: 'book' },
    gujarat:     { bg: '#FEFCE8', fg: '#CA8A04', ring: '#FEF08A', label: 'GSEB', sub: 'GUJ', shape: 'sun' },
    upmsp:       { bg: '#F0F9FF', fg: '#0284C7', ring: '#BAE6FD', label: 'UPMSP', sub: 'UP', shape: 'crest' },
    rbse:        { bg: '#FDF2F8', fg: '#DB2777', ring: '#FBCFE8', label: 'RBSE', sub: 'RAJ', shape: 'fort' },
    apts:        { bg: '#F0FDFA', fg: '#0D9488', ring: '#99F6E4', label: 'BIE', sub: 'AP·TS', shape: 'shield' },
    nios:        { bg: '#F0FDF4', fg: '#16A34A', ring: '#BBF7D0', label: 'NIOS', sub: 'OPEN', shape: 'book' },
    cambridge:   { bg: '#FAF5FF', fg: '#9333EA', ring: '#E9D5FF', label: 'CAIE', sub: 'IGCSE', shape: 'crest' },
    jee:         { bg: '#EFF6FF', fg: '#1D4ED8', ring: '#93C5FD', label: 'JEE', sub: 'IIT·NTA', shape: 'atom' },
    neet:        { bg: '#ECFDF5', fg: '#047857', ring: '#6EE7B7', label: 'NEET', sub: 'NMC·UG', shape: 'med' }
  };

  function getBoardLogoSVG(boardId, accentFallback) {
    const cfg = BOARD_STYLES[boardId] || {
      bg: '#F4F4F5', fg: accentFallback || '#2563EB', ring: '#E4E4E7',
      label: (boardId || 'EDU').slice(0, 4).toUpperCase(), sub: 'BOARD', shape: 'shield'
    };
    let motif = '';
    if (cfg.shape === 'atom') {
      motif = `<ellipse cx="20" cy="14" rx="10" ry="3.8" fill="none" stroke="${cfg.fg}" stroke-width="1.3" opacity=".35" transform="rotate(-25 20 14)"/>
               <ellipse cx="20" cy="14" rx="10" ry="3.8" fill="none" stroke="${cfg.fg}" stroke-width="1.3" opacity=".35" transform="rotate(25 20 14)"/>`;
    } else if (cfg.shape === 'med') {
      motif = `<path d="M18.2 7.5h3.6v3.2H25v3.6h-3.2v3.2h-3.6v-3.2H15v-3.6h3.2z" fill="${cfg.fg}" opacity=".2"/>`;
    } else if (cfg.shape === 'leaf') {
      motif = `<path d="M20 6c4.5 2.5 6.5 6.5 5 11-3.5-1-6.5-3.5-5-11z" fill="${cfg.fg}" opacity=".2"/>
               <path d="M20 6c-4.5 2.5-6.5 6.5-5 11 3.5-1 6.5-3.5 5-11z" fill="${cfg.fg}" opacity=".14"/>`;
    } else if (cfg.shape === 'sun') {
      motif = `<circle cx="20" cy="13" r="5" fill="${cfg.fg}" opacity=".18"/>`;
    } else if (cfg.shape === 'book') {
      motif = `<path d="M11 10.5c3-1.4 6-1.4 9 0 3-1.4 6-1.4 9 0v7.5c-3-1.2-6-1.2-9 0-3-1.2-6-1.2-9 0z" fill="${cfg.fg}" opacity=".16"/>`;
    } else if (cfg.shape === 'gopuram' || cfg.shape === 'fort') {
      motif = `<path d="M14 16h12l-1.5-6h-9zM16.5 10l3.5-3.5L23.5 10z" fill="${cfg.fg}" opacity=".18"/>`;
    } else {
      motif = `<path d="M20 5.5l8 3.2v5.8c0 4.2-3.4 7.3-8 8.5-4.6-1.2-8-4.3-8-8.5V8.7z" fill="${cfg.fg}" opacity=".14"/>`;
    }

    const fontSize = cfg.label.length >= 5 ? 8.2 : cfg.label.length === 4 ? 9.2 : 10.5;
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="${cfg.bg}" stroke="${cfg.ring}" stroke-width="1.5"/>
      ${motif}
      <text x="20" y="23.5" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="${fontSize}" font-weight="800" fill="${cfg.fg}" letter-spacing="-0.2">${cfg.label}</text>
      <text x="20" y="32.5" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="5.6" font-weight="700" fill="${cfg.fg}" opacity="0.72" letter-spacing="0.4">${cfg.sub}</text>
    </svg>`;
  }

  const SUBJECT_ICONS = {
    atom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(35 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-35 12 12)"/></svg>`,
    flask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/></svg>`,
    sigma: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5H7l6 7-6 7h11"/></svg>`,
    dna: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3c0 5 12 5 12 10s-12 5-12 8"/><path d="M18 3c0 5-12 5-12 10s12 5 12 8"/><path d="M8 7h8M8 17h8"/></svg>`,
    leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    ledger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>`,
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
    scroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/><path d="M10 8h6M10 12h6M10 16h4"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M6 7l-3 6h6zM18 7l-3 6h6zM8 21h8"/></svg>`
  };

  function getSubjectIconSVG(iconKey) {
    return SUBJECT_ICONS[iconKey] || SUBJECT_ICONS.book;
  }

  window.APP_ICONS = {
    getBoardLogoSVG,
    getSubjectIconSVG
  };
})();
