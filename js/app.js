/* ══════════════════════════════════════════════════════════════════════
   All-in-One Multi-Board & Competitive Exam Study Planner
   Pure Vanilla JS + localStorage · Built for SBP 359
══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'sp_allinone_v2';
  const THEME_KEY = 'r12theme';
  const FONT_KEY = 'sp_font';
  const SIZE_KEY = 'sp_font_size';
  const FONT_OPTIONS = [
    { id: 'jakarta', name: 'Plus Jakarta Sans', tag: 'Default · Crisp modern', stack: "'Plus Jakarta Sans', system-ui, sans-serif" },
    { id: 'dm',      name: 'DM Sans',           tag: 'Clean geometric',        stack: "'DM Sans', system-ui, sans-serif" },
    { id: 'outfit',  name: 'Outfit',            tag: 'Smooth & rounded',       stack: "'Outfit', system-ui, sans-serif" },
    { id: 'inter',   name: 'Inter',             tag: 'Classic neutral',        stack: "'Inter', system-ui, sans-serif" },
    { id: 'plex',    name: 'IBM Plex Sans',     tag: 'Sharp & technical',      stack: "'IBM Plex Sans', system-ui, sans-serif" },
    { id: 'mono',    name: 'JetBrains Mono',    tag: 'Monospace focus',        stack: "'JetBrains Mono', ui-monospace, monospace" },
    { id: 'system',  name: 'System UI',         tag: 'Native device font',     stack: "system-ui, -apple-system, sans-serif" }
  ];
  const AVATAR_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#7C3AED', '#DC2626', '#0891B2', '#059669', '#4F46E5'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let DB = window.SYLLABUS_DB || null;
  let STORE = { activeUserId: null, users: [] };
  let curPage = 'tracker';
  let curTab = 'All';
  let planDate = todayISO();
  let editExamId = null;
  let asSel = null;
  let asType = null;
  let reschedId = null;
  let confirmCallback = null;
  let toastTimer = null;

  /* ── Safe localStorage helpers ── */
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function saveStore() {
    lsSet(STORAGE_KEY, JSON.stringify(STORE));
  }

  function loadStore() {
    try {
      const raw = lsGet(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          STORE = parsed;
          if (!STORE.users.some(u => u.id === STORE.activeUserId)) {
            STORE.activeUserId = STORE.users[0] ? STORE.users[0].id : null;
          }
          return;
        }
      }
    } catch (e) {}

    // Auto-migrate legacy Class 12 Tracker localStorage if present
    try {
      const legS = lsGet('r12v2');
      const legEx = lsGet('r12exams');
      const legPlan = lsGet('r12plan');
      const legDates = lsGet('r12boarddates');
      if (legS || legEx || legPlan || legDates) {
        const p = legPlan ? JSON.parse(legPlan) : {};
        const migrated = {
          id: 'u_' + Date.now(),
          name: 'Student',
          avatarColor: '#2563EB',
          boardId: 'cbse',
          classId: 'class-12',
          addon: null,
          selectedSubjects: ['Physics', 'Chemistry', 'Mathematics', 'English Core', 'Computer Science'],
          chapters: legS ? JSON.parse(legS) : {},
          exams: legEx ? JSON.parse(legEx) : [],
          boardDates: legDates ? JSON.parse(legDates) : {},
          plan: {
            tasks: Array.isArray(p.tasks) ? p.tasks : [],
            settings: { target: (p.settings && (p.settings.target || p.settings.tasksPerDay)) || 5 }
          }
        };
        STORE = { activeUserId: migrated.id, users: [migrated] };
        saveStore();
      }
    } catch (e) {}
  }

  function getUser() {
    return STORE.users.find(u => u.id === STORE.activeUserId) || null;
  }

  function getBoard(boardId) {
    if (!DB) return null;
    return DB.boards.find(b => b.id === boardId) || DB.boards[0];
  }

  function getClassObj(board, classId) {
    if (!board || !board.classes) return null;
    return board.classes[classId] || Object.values(board.classes)[0];
  }

  function isDark() {
    return document.documentElement.dataset.theme === 'dark';
  }

  function getSubjColor(name) {
    const meta = DB && DB.subjectMeta && DB.subjectMeta[name];
    if (!meta) return isDark() ? '#78c5e8' : '#2563EB';
    return isDark() ? meta.dark : meta.color;
  }

  function getSubjShort(name) {
    const meta = DB && DB.subjectMeta && DB.subjectMeta[name];
    return (meta && meta.short) || name;
  }

  function getSubjIconKey(name) {
    const meta = DB && DB.subjectMeta && DB.subjectMeta[name];
    return (meta && meta.icon) || 'book';
  }

  function getActiveSubjects() {
    const u = getUser();
    if (!u || !DB) return [];
    const board = getBoard(u.boardId);
    const cls = getClassObj(board, u.classId);
    if (!cls) return [];

    let pool = cls.subjects.map(s => ({ ...s, isAddon: false }));
    if (u.addon && DB.competitiveAddons && DB.competitiveAddons[u.addon]) {
      const addonObj = DB.competitiveAddons[u.addon];
      pool = pool.concat(addonObj.subjects.map(s => ({ ...s, isAddon: true, addonLabel: addonObj.short })));
    }
    const selSet = new Set(u.selectedSubjects || []);
    const active = pool.filter(s => selSet.has(s.name));
    return active.length ? active : pool.slice(0, 5);
  }

  function getStepLabels(subjObj) {
    const u = getUser();
    const board = getBoard(u && u.boardId);
    if (subjObj && subjObj.isAddon) {
      return [
        { key: 'read', title: 'Theory & Concepts', sub: 'Notes, formulas & NCERT base', short: 'Theory' },
        { key: 'ncert', title: 'DPP / Question Bank', sub: 'Solve graded practice sheets', short: 'DPP' },
        { key: 'pyq', title: 'PYQ Archive', sub: 'Last 10 years NTA / IIT PYQs', short: 'PYQ' }
      ];
    }
    return (board && board.stepLabels) || [
      { key: 'read', title: 'Read Chapter', sub: 'Go through theory & examples', short: 'Read' },
      { key: 'ncert', title: 'Textbook Questions', sub: 'Solve all chapter exercises', short: 'Book' },
      { key: 'pyq', title: 'PYQ Practice', sub: 'Previous year questions', short: 'PYQ' }
    ];
  }

  function subjAllChs(s) {
    return s.groups ? s.groups.flatMap(g => g.chs) : (s.chs || []);
  }

  function getAllChaptersFlat() {
    const list = [];
    getActiveSubjects().forEach(s => {
      const color = getSubjColor(s.name);
      subjAllChs(s).forEach(ch => list.push({ subj: s.name, ch, color, subjObj: s }));
    });
    return list;
  }

  /* ── Chapter state helpers (per active user) ── */
  function ck(subj, ch) { return subj + '§' + ch; }
  function cs(subj, ch) {
    const u = getUser();
    if (!u) return { read: false, ncert: false, pyq: false, got: '', max: '25', difficulty: 0, revisions: [false, false] };
    if (!u.chapters) u.chapters = {};
    const k = ck(subj, ch);
    if (!u.chapters[k]) u.chapters[k] = { read: false, ncert: false, pyq: false, got: '', max: '25', prep: 0, revisions: [false, false] };
    if (u.chapters[k].prep === undefined) u.chapters[k].prep = 0;
    if (!Array.isArray(u.chapters[k].revisions)) u.chapters[k].revisions = [false, false];
    return u.chapters[k];
  }
  function isDone(subj, ch) { const s = cs(subj, ch); return !!(s.read && s.ncert && s.pyq); }
  function inProg(subj, ch) { const s = cs(subj, ch); return !!(s.read || s.ncert || s.pyq) && !isDone(subj, ch); }
  function stepsCount(subj, ch) { const s = cs(subj, ch); return [s.read, s.ncert, s.pyq].filter(Boolean).length; }

  /* ── Date helpers ── */
  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fromISO(s) {
    const parts = String(s || '').split('-').map(Number);
    return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
  }
  function todayISO() { return toISO(new Date()); }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return fromISO(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
  }
  function dateLabel(iso) {
    const t = todayISO();
    const dtT = fromISO(t);
    const tom = toISO(new Date(dtT.getFullYear(), dtT.getMonth(), dtT.getDate() + 1));
    const yes = toISO(new Date(dtT.getFullYear(), dtT.getMonth(), dtT.getDate() - 1));
    const d = fromISO(iso);
    return {
      main: iso === t ? 'Today' : iso === tom ? 'Tomorrow' : iso === yes ? 'Yesterday' : DAYS[d.getDay()],
      sub: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    };
  }
  function scoreColor(pct) { return pct >= 75 ? '#16A34A' : pct >= 40 ? '#EA580C' : '#DC2626'; }
  function prepTierClass(level) {
    if (level <= 0) return '';
    if (level <= 2) return 'lit-red';
    if (level === 3) return 'lit-orange';
    if (level === 4) return 'lit-yellow';
    return 'lit-green';
  }
  function prepTierText(level) {
    if (!level) return 'Not rated';
    const labels = ['', 'Needs prep', 'Early stage', 'Getting there', 'Almost ready', 'Exam ready'];
    return `${level}/5 · ${labels[level] || ''}`;
  }
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Toast & Confirm Modal ── */
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function askConfirm(title, message, okLabel, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = message;
    document.getElementById('confirmOkBtn').textContent = okLabel || 'Confirm';
    confirmCallback = onConfirm;
    openOverlay('confirmOverlay');
  }

  /* ── Overlay helpers ── */
  function syncVisualViewport() {
    const vp = window.visualViewport;
    if (!vp) return;
    document.documentElement.style.setProperty('--vv-height', `${vp.height}px`);
    document.documentElement.style.setProperty('--vv-top', `${vp.offsetTop}px`);
  }
  function openOverlay(id) {
    syncVisualViewport();
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }
  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  /* ── Theme, Font & Appearance ── */
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    lsSet(THEME_KEY, dark ? 'dark' : 'light');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#09090B' : '#2563EB');
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = dark ? '☀' : '☾';
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    syncAppearanceUI();
    if (getUser()) {
      buildStabs();
      buildTracker();
      if (curPage === 'plan') renderPlan();
      if (curPage === 'exams') renderExams();
    }
  }

  function getFontId() {
    const saved = lsGet(FONT_KEY);
    return FONT_OPTIONS.some(f => f.id === saved) ? saved : 'jakarta';
  }

  function setFont(fontId) {
    const valid = FONT_OPTIONS.some(f => f.id === fontId) ? fontId : 'jakarta';
    document.documentElement.dataset.font = valid;
    lsSet(FONT_KEY, valid);
    syncAppearanceUI();
  }

  function getFontSizeId() {
    const saved = lsGet(SIZE_KEY);
    return ['compact', 'default', 'large'].includes(saved) ? saved : 'default';
  }

  function setFontSize(sizeId) {
    const valid = ['compact', 'default', 'large'].includes(sizeId) ? sizeId : 'default';
    document.documentElement.dataset.size = valid;
    lsSet(SIZE_KEY, valid);
    syncAppearanceUI();
  }

  function syncAppearanceUI() {
    const dark = isDark();
    document.querySelectorAll('#themeSeg .app-seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.themeChoice === (dark ? 'dark' : 'light'));
    });
    const curSize = getFontSizeId();
    document.querySelectorAll('#sizeSeg .app-seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sizeChoice === curSize);
    });
    const curFont = getFontId();
    document.querySelectorAll('#fontGrid .font-card').forEach(c => {
      c.classList.toggle('active', c.dataset.fontId === curFont);
    });
  }

  function openAppearanceSheet() {
    const grid = document.getElementById('fontGrid');
    if (grid && !grid.children.length) {
      grid.innerHTML = FONT_OPTIONS.map(f => `
        <button type="button" class="font-card" data-font-id="${f.id}">
          <div class="font-card-info">
            <div class="font-card-name" style="font-family:${f.stack}">${escHtml(f.name)}</div>
            <div class="font-card-tag">${escHtml(f.tag)}</div>
          </div>
          <div class="font-card-chk">✓</div>
        </button>`).join('');
      grid.querySelectorAll('.font-card').forEach(card => {
        card.addEventListener('click', () => {
          setFont(card.dataset.fontId);
          const picked = FONT_OPTIONS.find(x => x.id === card.dataset.fontId);
          if (picked) showToast(`Font: ${picked.name}`);
        });
      });
    }
    syncAppearanceUI();
    openOverlay('appearanceOverlay');
  }

  /* ── Topbar Header ── */
  function renderTopbar() {
    const u = getUser();
    const d = new Date();
    document.getElementById('topDate').textContent = `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

    if (!u) {
      document.getElementById('topBoardLogo').innerHTML = window.APP_ICONS.getBoardLogoSVG('cbse');
      document.getElementById('topTitle').innerHTML = 'Study <span>Planner</span>';
      document.getElementById('topSubtitle').textContent = 'All-in-One Tracker ·';
      document.getElementById('topAvatar').textContent = '+';
      document.getElementById('topAvatar').style.background = '#2563EB';
      document.getElementById('topUserName').textContent = 'Setup';
      return;
    }

    const board = getBoard(u.boardId);
    const cls = getClassObj(board, u.classId);
    const addonTxt = u.addon && DB.competitiveAddons[u.addon] ? ` + ${DB.competitiveAddons[u.addon].short}` : '';
    document.getElementById('topBoardLogo').innerHTML = window.APP_ICONS.getBoardLogoSVG(board.id, board.accent);
    document.getElementById('topTitle').innerHTML = `${escHtml(board.name)} <span>${escHtml(cls.shortLabel)}${escHtml(addonTxt)}</span>`;
    document.getElementById('topSubtitle').textContent = 'Study Planner by';
    document.getElementById('topAvatar').textContent = (u.name.trim()[0] || 'S').toUpperCase();
    document.getElementById('topAvatar').style.background = u.avatarColor || '#2563EB';
    document.getElementById('topUserName').textContent = u.name;
    document.title = `${board.name} ${cls.shortLabel} — Study Planner`;
  }

  /* ── Page Switching ── */
  function gotoPage(p) {
    curPage = p;
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + p);
    if (target) target.classList.add('active');
    document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    document.getElementById('stabs').style.display = p === 'tracker' ? 'flex' : 'none';
    if (p === 'plan') renderPlan();
    if (p === 'revision') renderRevision();
    if (p === 'exams') renderExams();
  }

  /* ══════════════════════════════════════════════
     TRACKER PAGE
  ══════════════════════════════════════════════ */
  function buildStabs() {
    const wrap = document.getElementById('stabs');
    wrap.innerHTML = '';
    const subjects = getActiveSubjects();
    if (curTab !== 'All' && !subjects.some(s => s.name === curTab)) curTab = 'All';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'stab' + (curTab === 'All' ? ' active' : '');
    allBtn.dataset.s = 'All';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => {
      curTab = 'All';
      buildStabs();
      applyStab();
    });
    wrap.appendChild(allBtn);

    subjects.forEach(s => {
      const clr = getSubjColor(s.name);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stab' + (curTab === s.name ? ' active' : '');
      b.dataset.s = s.name;
      if (curTab === s.name) {
        const meta = DB && DB.subjectMeta && DB.subjectMeta[s.name];
        const pillClr = (meta && meta.color) || '#2563EB';
        b.style.background = pillClr;
        b.style.borderColor = pillClr;
        b.style.color = '#fff';
      }
      b.innerHTML = `${window.APP_ICONS.getSubjectIconSVG(getSubjIconKey(s.name))}<span>${escHtml(getSubjShort(s.name))}</span>`;
      b.addEventListener('click', () => {
        curTab = s.name;
        buildStabs();
        applyStab();
      });
      wrap.appendChild(b);
    });
  }

  function applyStab() {
    const q = (document.getElementById('chapterSearch').value || '').trim().toLowerCase();
    const grid = document.getElementById('subjCardsGrid');
    const showAllGrid = curTab === 'All' && !q;
    if (grid) { grid.hidden = !showAllGrid; grid.style.display = showAllGrid ? '' : 'none'; }

    document.querySelectorAll('.subj-block').forEach(block => {
      if (showAllGrid) {
        block.hidden = true;
        return;
      }
      const tabMatch = curTab === 'All' || block.dataset.s === curTab;
      if (!tabMatch) {
        block.hidden = true;
        return;
      }
      if (!q) {
        block.hidden = false;
        block.querySelectorAll('.ch-card').forEach(c => { c.hidden = false; });
        return;
      }
      let anyVisible = false;
      block.querySelectorAll('.ch-card').forEach(c => {
        const hit = c.dataset.ch.toLowerCase().includes(q) || c.dataset.subj.toLowerCase().includes(q);
        c.hidden = !hit;
        if (hit) anyVisible = true;
      });
      block.hidden = !anyVisible;
    });
  }

  function buildSubjectCardsGrid(subjects) {
    const grid = document.createElement('div');
    grid.className = 'subj-cards-grid';
    grid.id = 'subjCardsGrid';
    const circ = 2 * Math.PI * 21; // r=21 -> 131.95
    subjects.forEach(subj => {
      const chs = subjAllChs(subj);
      const doneN = chs.filter(ch => isDone(subj.name, ch)).length;
      const doneSteps = chs.reduce((acc, ch) => acc + stepsCount(subj.name, ch), 0);
      const totalSteps = chs.length * 3;
      const pct = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const rated = chs.map(ch => cs(subj.name, ch).prep || 0).filter(v => v > 0);
      const avgPrep = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;
      const clr = getSubjColor(subj.name);
      const offset = circ - (pct / 100) * circ;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'subj-box-card';
      btn.dataset.s = subj.name;
      btn.innerHTML = `
        <div class="subj-ring">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle class="subj-ring-bg" cx="26" cy="26" r="21" stroke-width="5"/>
            <circle class="subj-ring-arc" cx="26" cy="26" r="21" stroke-width="5"
              stroke="${clr}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
            <text class="subj-ring-pct" x="26" y="27">${pct}%</text>
          </svg>
        </div>
        <div class="subj-box-info">
          <div class="subj-box-top">
            <div class="subj-box-ico" style="background:${clr}1f;color:${clr}">${window.APP_ICONS.getSubjectIconSVG(getSubjIconKey(subj.name))}</div>
            <div class="subj-box-name">${escHtml(subj.name)}</div>
          </div>
          <div class="subj-box-meta">${doneN}/${chs.length} chapters · ${doneSteps}/${totalSteps} steps${avgPrep ? ` · ★ ${avgPrep}` : ''}</div>
        </div>
        <div class="subj-box-arrow">›</div>`;
      btn.addEventListener('click', () => {
        curTab = subj.name;
        buildStabs();
        applyStab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  function refreshSubjCard(subj) {
    const card = document.querySelector(`#subjCardsGrid .subj-box-card[data-s="${CSS.escape(subj.name)}"]`);
    if (!card) return;
    const chs = subjAllChs(subj);
    const doneN = chs.filter(ch => isDone(subj.name, ch)).length;
    const doneSteps = chs.reduce((acc, ch) => acc + stepsCount(subj.name, ch), 0);
    const totalSteps = chs.length * 3;
    const pct = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
    const rated = chs.map(ch => cs(subj.name, ch).prep || 0).filter(v => v > 0);
    const avgPrep = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;
    const circ = 2 * Math.PI * 21;
    const arc = card.querySelector('.subj-ring-arc');
    if (arc) arc.setAttribute('stroke-dashoffset', (circ - (pct / 100) * circ).toFixed(1));
    const pctEl = card.querySelector('.subj-ring-pct');
    if (pctEl) pctEl.textContent = pct + '%';
    const metaEl = card.querySelector('.subj-box-meta');
    if (metaEl) metaEl.textContent = `${doneN}/${chs.length} chapters · ${doneSteps}/${totalSteps} steps${avgPrep ? ` · ★ ${avgPrep}` : ''}`;
  }

  function buildTracker() {
    const root = document.getElementById('trackerContent');
    root.innerHTML = '';
    const subjects = getActiveSubjects();
    if (!subjects.length) {
      root.innerHTML = `<div class="plan-empty"><div class="pe-ico">📚</div><div class="pe-txt">No subjects selected yet.<br>Tap <b>⚙ Subjects</b> to choose your board, class, and subjects.</div></div>`;
      return;
    }

    root.appendChild(buildSubjectCardsGrid(subjects));

    subjects.forEach(subj => {
      const chs = subjAllChs(subj);
      const doneN = chs.filter(ch => isDone(subj.name, ch)).length;
      const pct = chs.length ? Math.round(doneN / chs.length * 100) : 0;
      const clr = getSubjColor(subj.name);
      const block = document.createElement('div');
      block.className = 'subj-block';
      block.dataset.s = subj.name;
      block.innerHTML = `
        <div class="subj-hdr">
          <div class="subj-hdr-ico" style="background:${clr}1f;color:${clr}">${window.APP_ICONS.getSubjectIconSVG(getSubjIconKey(subj.name))}</div>
          <div class="subj-hdr-name">${escHtml(subj.name)}${subj.isAddon ? `<span class="subj-tag">${escHtml(subj.addonLabel)}</span>` : ''}</div>
          <div class="subj-hdr-frac" style="color:${clr}">${doneN}/${chs.length}</div>
        </div>
        <div class="subj-prog"><div class="subj-prog-fill" style="background:${clr};width:${pct}%"></div></div>`;

      if (subj.groups) {
        subj.groups.forEach(g => {
          const gl = document.createElement('div');
          gl.className = 'group-label';
          gl.textContent = g.label;
          block.appendChild(gl);
          block.appendChild(buildChList(subj, g.chs));
        });
      } else {
        block.appendChild(buildChList(subj, subj.chs || []));
      }
      root.appendChild(block);
    });
    applyStab();
  }

  function buildChList(subj, chs) {
    const wrap = document.createElement('div');
    chs.forEach(ch => wrap.appendChild(buildChCard(subj, ch)));
    return wrap;
  }

  function buildChCard(subj, ch) {
    const s = cs(subj.name, ch);
    const done = isDone(subj.name, ch);
    const n = stepsCount(subj.name, ch);
    const sl = getStepLabels(subj);
    const got = s.got !== '' ? parseFloat(s.got) : null;
    const max = parseFloat(s.max) || 25;
    const spct = got !== null ? Math.min(100, (got / max) * 100) : 0;
    const scol = scoreColor(spct);
    const metaParts = [];
    if (s.read) metaParts.push(sl[0].short);
    if (s.ncert) metaParts.push(sl[1].short);
    if (s.pyq) metaParts.push(sl[2].short);
    const meta = done ? 'Completed ✓' : metaParts.length ? metaParts.join(' · ') : 'Not started';

    const card = document.createElement('div');
    card.className = 'ch-card' + (done ? ' completed' : n === 2 ? ' step2' : n >= 1 ? ' step1' : '');
    card.dataset.subj = subj.name;
    card.dataset.ch = ch;

    card.innerHTML = `
      <div class="ch-head">
        <div class="ch-stepper">${done ? '✓' : n || ''}</div>
        <div class="ch-info">
          <div class="ch-name">${escHtml(ch)}</div>
          <div class="ch-sub">${escHtml(meta)}</div>
        </div>
        <div class="ch-score-tag${got !== null ? ' scored' : ''}" style="${got !== null ? 'color:' + scol : ''}">${got !== null ? got + '/' + max : '—'}</div>
        <div class="ch-arrow">›</div>
      </div>
      <div class="ch-body">
        <div class="step-dots">
          <div class="sdot${s.read ? ' on' : ''}"></div>
          <div class="sdot${s.ncert ? ' on' : ''}"></div>
          <div class="sdot${s.pyq ? ' on' : ''}"></div>
        </div>
        <div class="cklist">
          ${sl.map((step, idx) => `
            <div class="ck-row${s[step.key] ? ' ticked' : ''}" data-t="${step.key}">
              <span class="ck-num">${idx + 1}</span>
              <div class="ck-circle">✓</div>
              <div class="ck-lbl"><strong>${escHtml(step.title)}</strong><span>${escHtml(step.sub)}</span></div>
            </div>`).join('')}
        </div>
        <div class="score-box">
          <div class="score-box-title">Test Score</div>
          <div class="score-inputs">
            <input type="number" min="0" max="9999" inputmode="numeric" value="${escHtml(s.got)}" placeholder="0">
            <span class="div">/</span>
            <input type="number" min="1" max="9999" inputmode="numeric" value="${escHtml(s.max)}" placeholder="25">
          </div>
          <div class="sbar-wrap"><div class="sbar-fill" style="width:${spct}%;background:${spct > 0 ? scol : 'transparent'}"></div></div>
          <div class="sbar-pct">${spct > 0 ? Math.round(spct) + '%' : ''}</div>
        </div>
        <div class="chapter-tools">
          <div class="chapter-tool">
            <div class="tool-label">Prep Meter</div>
            <div class="prep-set" role="group" aria-label="Rate how prepared you are from 1 to 5 stars">
              ${[1, 2, 3, 4, 5].map(level => {
                const lit = s.prep >= level ? ' ' + prepTierClass(s.prep) : '';
                return `<button type="button" class="prep-star${lit}" data-level="${level}" aria-label="Prep ${level} star" aria-pressed="${s.prep >= level}">★</button>`;
              }).join('')}
              <span class="prep-note">${escHtml(prepTierText(s.prep))}</span>
            </div>
          </div>
          <div class="chapter-tool">
            <div class="tool-label">Revision rounds</div>
            <div class="revision-set">
              ${s.revisions.map((rDone, i) => `<button type="button" class="revision-btn${rDone ? ' done' : ''}" data-round="${i}" ${(!done && !rDone || (i > 0 && !s.revisions[i - 1] && !rDone)) ? 'disabled' : ''} aria-pressed="${rDone}">Revision ${i + 1} ${rDone ? 'done' : 'pending'}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="done-banner">✓ Chapter complete!</div>
      </div>`;

    card.querySelector('.ch-head').addEventListener('click', () => card.classList.toggle('open'));

    card.querySelectorAll('.ck-row').forEach(row => {
      row.addEventListener('click', e => {
        e.stopPropagation();
        const st = cs(subj.name, ch);
        st[row.dataset.t] = !st[row.dataset.t];
        saveStore();
        refreshCard(card, subj, ch);
        updateOverview();
        refreshSubjHdr(subj);
        syncPlanFromTracker();
        if (curPage === 'plan') renderPlan();
      });
    });

    card.querySelectorAll('.prep-star').forEach(button => {
      button.addEventListener('click', e => {
        e.stopPropagation();
        const st = cs(subj.name, ch);
        const clicked = Number(button.dataset.level);
        st.prep = st.prep === clicked ? 0 : clicked;
        saveStore();
        const tier = prepTierClass(st.prep);
        card.querySelectorAll('.prep-star').forEach(item => {
          const lvl = Number(item.dataset.level);
          const lit = st.prep >= lvl;
          item.className = 'prep-star' + (lit && tier ? ' ' + tier : '');
          item.setAttribute('aria-pressed', lit);
        });
        card.querySelector('.prep-note').textContent = prepTierText(st.prep);
        refreshSubjCard(subj);
      });
    });

    card.querySelectorAll('.revision-btn').forEach(button => {
      button.addEventListener('click', e => {
        e.stopPropagation();
        const st = cs(subj.name, ch);
        const round = Number(button.dataset.round);
        if (!st.revisions[round] && (!isDone(subj.name, ch) || (round > 0 && !st.revisions[round - 1]))) return;
        st.revisions[round] = !st.revisions[round];
        if (!st.revisions[round]) {
          for (let i = round + 1; i < st.revisions.length; i++) st.revisions[i] = false;
        }
        saveStore();
        card.querySelectorAll('.revision-btn').forEach((item, i) => {
          item.classList.toggle('done', st.revisions[i]);
          item.textContent = `Revision ${i + 1} ${st.revisions[i] ? 'done' : 'pending'}`;
          item.disabled = (!isDone(subj.name, ch) && !st.revisions[i]) || (i > 0 && !st.revisions[i - 1] && !st.revisions[i]);
          item.setAttribute('aria-pressed', st.revisions[i]);
        });
      });
    });

    const [gi, mi] = card.querySelectorAll('.score-inputs input');
    gi.addEventListener('input', () => { cs(subj.name, ch).got = gi.value; saveStore(); refreshScoreBar(card, subj, ch); updateOverview(); });
    mi.addEventListener('input', () => { cs(subj.name, ch).max = mi.value || '25'; saveStore(); refreshScoreBar(card, subj, ch); updateOverview(); });
    [gi, mi].forEach(i => i.addEventListener('click', e => e.stopPropagation()));
    return card;
  }

  function refreshCard(card, subj, ch) {
    const s = cs(subj.name, ch);
    const done = isDone(subj.name, ch);
    const n = stepsCount(subj.name, ch);
    const sl = getStepLabels(subj);
    card.className = 'ch-card' + (done ? ' completed' : n === 2 ? ' step2' : n >= 1 ? ' step1' : '') + (card.classList.contains('open') ? ' open' : '');
    const stepper = card.querySelector('.ch-stepper');
    if (stepper) stepper.textContent = done ? '✓' : n || '';
    const metaParts = [];
    if (s.read) metaParts.push(sl[0].short);
    if (s.ncert) metaParts.push(sl[1].short);
    if (s.pyq) metaParts.push(sl[2].short);
    const sub = card.querySelector('.ch-sub');
    if (sub) sub.textContent = done ? 'Completed ✓' : metaParts.length ? metaParts.join(' · ') : 'Not started';
    card.querySelectorAll('.sdot').forEach((d, i) => d.classList.toggle('on', [s.read, s.ncert, s.pyq][i]));
    card.querySelectorAll('.ck-row').forEach(r => r.classList.toggle('ticked', !!s[r.dataset.t]));
    card.querySelectorAll('.revision-btn').forEach((button, i) => {
      button.disabled = (!done && !s.revisions[i]) || (i > 0 && !s.revisions[i - 1] && !s.revisions[i]);
    });
    refreshScoreBar(card, subj, ch);
  }

  function refreshScoreBar(card, subj, ch) {
    const s = cs(subj.name, ch);
    const got = s.got !== '' ? parseFloat(s.got) : null;
    const max = parseFloat(s.max) || 25;
    const pct = got !== null ? Math.min(100, (got / max) * 100) : 0;
    const c = scoreColor(pct);
    const fill = card.querySelector('.sbar-fill');
    if (fill) { fill.style.width = pct + '%'; fill.style.background = pct > 0 ? c : 'transparent'; }
    const lbl = card.querySelector('.sbar-pct');
    if (lbl) lbl.textContent = pct > 0 ? Math.round(pct) + '%' : '';
    const tag = card.querySelector('.ch-score-tag');
    if (tag) {
      tag.textContent = got !== null ? got + '/' + max : '—';
      tag.classList.toggle('scored', got !== null);
      tag.style.color = got !== null ? c : '';
    }
  }

  function refreshTrackerChapter(subjName, ch) {
    const card = Array.from(document.querySelectorAll('.ch-card')).find(item => item.dataset.subj === subjName && item.dataset.ch === ch);
    const subj = getActiveSubjects().find(item => item.name === subjName);
    if (card && subj) { refreshCard(card, subj, ch); refreshSubjHdr(subj); }
    updateOverview();
  }

  function refreshSubjHdr(subj) {
    refreshSubjCard(subj);
    const block = Array.from(document.querySelectorAll('.subj-block')).find(el => el.dataset.s === subj.name);
    if (!block) return;
    const chs = subjAllChs(subj);
    const doneN = chs.filter(ch => isDone(subj.name, ch)).length;
    const pct = chs.length ? Math.round(doneN / chs.length * 100) : 0;
    const frac = block.querySelector('.subj-hdr-frac');
    if (frac) frac.textContent = `${doneN}/${chs.length}`;
    const bar = block.querySelector('.subj-prog-fill');
    if (bar) bar.style.width = pct + '%';
  }

  function updateOverview() {
    let tot = 0, done = 0, prog = 0, scores = [];
    getActiveSubjects().forEach(subj => subjAllChs(subj).forEach(ch => {
      tot++;
      if (isDone(subj.name, ch)) done++;
      else if (inProg(subj.name, ch)) prog++;
      const s = cs(subj.name, ch);
      if (s.got !== '') {
        const g = parseFloat(s.got), m = parseFloat(s.max) || 25;
        if (!Number.isNaN(g) && m > 0) scores.push(Math.round(g / m * 100));
      }
    }));
    const pct = tot ? Math.round(done / tot * 100) : 0;
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    document.getElementById('ovTotal').textContent = tot;
    document.getElementById('ovDone').textContent = done;
    document.getElementById('ovProg').textContent = prog;
    document.getElementById('ovAvg').textContent = avg !== null ? avg + '%' : '—';
    document.getElementById('ovPct').textContent = pct + '%';
    const circ = 175.9;
    document.getElementById('ovArc').setAttribute('stroke-dashoffset', circ - pct / 100 * circ);
    document.getElementById('ovArc').setAttribute('stroke', pct >= 75 ? '#16A34A' : pct >= 40 ? '#EA580C' : '#2563EB');
  }

  /* ══════════════════════════════════════════════
     PLAN PAGE
  ══════════════════════════════════════════════ */
  function getPlan() {
    const u = getUser();
    if (!u) return { tasks: [], settings: { target: 5 } };
    if (!u.plan) u.plan = { tasks: [], settings: { target: 5 } };
    if (!Array.isArray(u.plan.tasks)) u.plan.tasks = [];
    if (!u.plan.settings) u.plan.settings = { target: 5 };
    return u.plan;
  }

  function isCarryTask(task) {
    return !!task.carried || (planDate === todayISO() && task.date < todayISO());
  }

  function subjectPlanStats(subj) {
    const u = getUser();
    const exams = (u && u.exams) || [];
    const chs = subjAllChs(subj), total = chs.length * 3;
    const completed = chs.reduce((sum, ch) => sum + stepsCount(subj.name, ch), 0);
    const coverage = total ? Math.round(completed / total * 100) : 0;
    const marks = exams.flatMap(ex => {
      const score = ex.scores && ex.scores[subj.name];
      return score && score.max ? [(score.got / score.max) * 100] : [];
    });
    const average = marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null;
    const need = average === null ? 100 - coverage : (100 - coverage) * 0.55 + (100 - average) * 0.45;
    return { coverage, average, need };
  }

  function renderCoverageFocus() {
    const root = document.getElementById('coverageFocus');
    const rows = getActiveSubjects().map(subj => ({ subj, ...subjectPlanStats(subj) })).sort((a, b) => b.need - a.need);
    root.innerHTML = `<div class="coverage-title">Coverage &amp; marks focus</div>${rows.map(({ subj, coverage, average }) => `
      <div class="coverage-row">
        <span class="coverage-name">${escHtml(subj.name)}</span>
        <span class="coverage-bar" title="${coverage}% chapter coverage"><span style="width:${coverage}%;background:${getSubjColor(subj.name)}"></span></span>
        <span class="coverage-marks">${average === null ? 'No marks' : average + '% marks'}</span>
      </div>`).join('')}`;
  }

  function autoGenerate() {
    const plan = getPlan();
    const date = planDate;
    const already = new Set(plan.tasks.filter(t => t.type !== 'custom').map(t => t.subj + '§' + t.ch + '§' + t.type));
    const subjects = getActiveSubjects().map(subj => {
      const candidates = [];
      subjAllChs(subj).forEach(ch => {
        if (isDone(subj.name, ch)) return;
        const state = cs(subj.name, ch);
        ['read', 'ncert', 'pyq'].forEach((type, index) => {
          const key = subj.name + '§' + ch + '§' + type;
          if (!state[type] && !already.has(key)) {
            candidates.push({ subj: subj.name, ch, type, index, steps: stepsCount(subj.name, ch), prep: state.prep || 0 });
          }
        });
      });
      candidates.sort((a, b) => a.steps - b.steps || a.prep - b.prep || a.index - b.index);
      return { subj, need: subjectPlanStats(subj).need, candidates };
    }).filter(item => item.candidates.length).sort((a, b) => b.need - a.need);

    if (!subjects.length) {
      showToast('All pending tasks are already planned or done!');
      return;
    }
    const pick = [];
    while (pick.length < plan.settings.target && subjects.some(item => item.candidates.length)) {
      subjects.forEach(item => {
        if (pick.length < plan.settings.target && item.candidates.length) pick.push(item.candidates.shift());
      });
    }
    pick.forEach(c => plan.tasks.push({ id: '' + Date.now() + Math.random(), subj: c.subj, ch: c.ch, type: c.type, date, done: false, carried: false }));
    saveStore();
    renderPlan();
    showToast(`Added ${pick.length} study tasks`);
  }

  function syncPlanFromTracker() {
    const plan = getPlan();
    let changed = false;
    plan.tasks.forEach(task => {
      if (task.type === 'custom') return;
      const done = !!cs(task.subj, task.ch)[task.type];
      if (task.done !== done) {
        task.done = done;
        if (done) task.doneAt = todayISO(); else delete task.doneAt;
        changed = true;
      }
    });
    if (changed) saveStore();
  }

  function renderPlan() {
    syncPlanFromTracker();
    renderCoverageFocus();
    const plan = getPlan();
    document.getElementById('targetVal').textContent = plan.settings.target;
    const dl = dateLabel(planDate);
    document.getElementById('dateMain').textContent = dl.main;
    document.getElementById('dateSub').textContent = dl.sub;

    const dayTasks = plan.tasks.filter(t => t.date === planDate || (planDate === todayISO() && t.date < todayISO() && !t.done));
    const doneN = dayTasks.filter(t => t.done).length;
    const tot = dayTasks.length, leftN = tot - doneN;
    const carryN = dayTasks.filter(t => isCarryTask(t) && !t.done).length;
    const pct = tot ? Math.round(doneN / tot * 100) : 0;

    document.getElementById('psDone').textContent = doneN;
    document.getElementById('psLeft').textContent = leftN;
    document.getElementById('psCarry').textContent = carryN;
    document.getElementById('planBarLabel').textContent = planDate === todayISO() ? "Today's progress" : `${dl.main}'s progress`;
    document.getElementById('planBarPct').textContent = pct + '%';
    const fill = document.getElementById('planBarFill');
    fill.style.width = pct + '%';
    fill.style.background = scoreColor(pct);

    const body = document.getElementById('planBody');
    body.innerHTML = '';
    if (!tot) {
      body.innerHTML = `<div class="plan-empty"><div class="pe-ico">📋</div><div class="pe-txt">No tasks for ${escHtml(dl.main.toLowerCase())}.<br>Tap <b>⚡ Auto-fill</b> to generate, or <b>+ Add Task</b> to add manually.</div></div>`;
      return;
    }

    const carryPend = dayTasks.filter(t => isCarryTask(t) && !t.done);
    const normPend = dayTasks.filter(t => !isCarryTask(t) && !t.done);
    const doneList = dayTasks.filter(t => t.done);
    const activeSubjects = getActiveSubjects();

    function makeGroup(title, tasks) {
      if (!tasks.length) return;
      const g = document.createElement('div');
      g.className = 'task-group';
      g.innerHTML = `<div class="tg-title">${title}<span class="tg-count">${tasks.length}</span></div>`;
      const card = document.createElement('div');
      card.className = 'task-list-card';
      tasks.forEach(t => {
        const subjObj = activeSubjects.find(s => s.name === t.subj);
        const sl = getStepLabels(subjObj);
        const pillLabel = t.type === 'custom' ? 'CUSTOM' : (sl.find(x => x.key === t.type)?.short || t.type).toUpperCase();
        const row = document.createElement('div');
        row.className = 'task-row' + (t.done ? ' t-done' : '');
        const syncedInTracker = !t.done && t.type !== 'custom' && cs(t.subj, t.ch)[t.type];
        row.innerHTML = `
          <div class="t-check">${t.done ? '✓' : ''}</div>
          <div class="task-info">
            <div class="task-text">${escHtml(t.title || t.ch)}</div>
            <div class="task-meta">
              <span class="task-sdot" style="background:${t.type === 'custom' ? '#888' : getSubjColor(t.subj)}"></span>
              <span class="task-sname">${escHtml(t.subj || 'Custom')}</span>
              <span class="t-pill ${escHtml(t.type)}">${escHtml(pillLabel)}</span>
              ${isCarryTask(t) && !t.done ? '<span class="t-carry-tag">Carried</span>' : ''}
              ${syncedInTracker ? '<span class="t-synced-tag">Done in tracker</span>' : ''}
            </div>
          </div>
          <div class="task-btns">
            ${!t.done ? '<button type="button" class="t-btn rsched-btn">📅</button>' : ''}
            <button type="button" class="t-btn del del-btn">✕</button>
          </div>`;
        row.querySelector('.t-check').addEventListener('click', () => {
          t.done = !t.done;
          if (t.done) t.doneAt = todayISO(); else delete t.doneAt;
          if (t.type !== 'custom') {
            cs(t.subj, t.ch)[t.type] = t.done;
            refreshTrackerChapter(t.subj, t.ch);
          }
          saveStore();
          renderPlan();
        });
        const rb = row.querySelector('.rsched-btn');
        if (rb) rb.addEventListener('click', e => { e.stopPropagation(); openResched(t.id); });
        row.querySelector('.del-btn').addEventListener('click', e => {
          e.stopPropagation();
          plan.tasks = plan.tasks.filter(x => x.id !== t.id);
          saveStore();
          renderPlan();
        });
        card.appendChild(row);
      });
      g.appendChild(card);
      body.appendChild(g);
    }

    if (carryPend.length) makeGroup('⚠️ Carried Over', carryPend);
    if (normPend.length) makeGroup('To Do', normPend);
    if (doneList.length) makeGroup('✅ Done', doneList);
  }

  /* ── Assign / Custom / Reschedule modals ── */
  function openAssign() {
    asSel = null; asType = null;
    document.getElementById('asSearch').value = '';
    document.getElementById('asDate').value = planDate;
    const sl = getStepLabels(null);
    const pills = document.querySelectorAll('#assignTypePills .type-pill');
    pills.forEach((p, idx) => {
      p.className = 'type-pill';
      if (sl[idx]) p.textContent = sl[idx].short;
    });
    renderAssignList();
    openOverlay('assignOverlay');
  }

  function renderAssignList() {
    const q = (document.getElementById('asSearch').value || '').toLowerCase();
    const list = document.getElementById('asList');
    list.innerHTML = '';
    getAllChaptersFlat()
      .filter(item => !q || item.ch.toLowerCase().includes(q) || item.subj.toLowerCase().includes(q))
      .forEach(item => {
        const row = document.createElement('div');
        row.className = 'assign-row' + (asSel && asSel.ch === item.ch && asSel.subj === item.subj ? ' sel' : '');
        row.innerHTML = `<div class="arow-dot" style="background:${item.color}"></div><div class="arow-name">${escHtml(item.ch)}</div><div class="arow-subj">${escHtml(getSubjShort(item.subj))}</div>`;
        row.addEventListener('click', () => { asSel = item; renderAssignList(); });
        list.appendChild(row);
      });
  }

  function openResched(id) {
    reschedId = id;
    const t = getPlan().tasks.find(x => x.id === id);
    document.getElementById('rschedDate').value = t ? t.date : todayISO();
    openOverlay('rschedOverlay');
  }

  /* ══════════════════════════════════════════════
     REVISION PAGE
  ══════════════════════════════════════════════ */
  function renderRevisionAnalysis() {
    const u = getUser();
    const root = document.getElementById('revisionAnalysis');
    if (!u || !root) return;
    const subjects = getActiveSubjects();
    let totalCh = 0, pendingCh = 0, pendingSteps = 0, totalRevDone = 0, totalRevPossible = 0;
    let prepSum = 0, prepCount = 0, lowPrepCount = 0;
    let earliestDays = null, totalNeededStepsPerDay = 0, behindSubjs = 0, datedSubjs = 0;

    subjects.forEach(subj => {
      const chs = subjAllChs(subj);
      let subjRemCh = 0, subjRemSteps = 0;
      chs.forEach(ch => {
        totalCh++;
        const st = cs(subj.name, ch);
        const sc = stepsCount(subj.name, ch);
        if (sc < 3) { pendingCh++; subjRemCh++; }
        const remS = 3 - sc;
        pendingSteps += remS;
        subjRemSteps += remS;
        totalRevPossible += 2;
        totalRevDone += (st.revisions || []).filter(Boolean).length;
        if (st.prep > 0) {
          prepSum += st.prep;
          prepCount++;
          if (st.prep <= 2) lowPrepCount++;
        }
      });
      const iso = u.boardDates && u.boardDates[subj.name];
      if (iso) {
        datedSubjs++;
        const days = Math.round((fromISO(iso) - fromISO(todayISO())) / 86400000);
        if (days > 0) {
          if (earliestDays === null || days < earliestDays) earliestDays = days;
          totalNeededStepsPerDay += subjRemSteps / days;
          if (subjRemCh > days) behindSubjs++;
        } else if (subjRemCh > 0) {
          behindSubjs++;
        }
      }
    });

    const dailyTarget = getPlan().settings.target || 5;
    const avgPrep = prepCount ? (prepSum / prepCount).toFixed(1) : '—';
    let pillCls = 'neutral', pillTxt = 'Set Exam Dates', msg = '';

    if (pendingCh === 0 && totalCh > 0) {
      pillCls = 'ontime';
      pillTxt = 'Syllabus Complete';
      msg = `All ${totalCh} chapters are complete! Focus on Revision rounds (${totalRevDone}/${totalRevPossible} done)${lowPrepCount ? ` and boosting ${lowPrepCount} low-prep chapters` : ''}.`;
    } else if (!datedSubjs) {
      pillCls = 'neutral';
      pillTxt = 'Dates Needed';
      const daysAtTarget = Math.ceil(pendingSteps / dailyTarget);
      msg = `You have ${pendingCh} pending chapters (${pendingSteps} steps left). At your target of ${dailyTarget} tasks/day, you'll finish in ~${daysAtTarget} days. Add exam dates below to check pace.`;
    } else if (behindSubjs > 0 || totalNeededStepsPerDay > dailyTarget * 1.15) {
      pillCls = 'behind';
      pillTxt = 'Behind Pace';
      msg = `You need ~${totalNeededStepsPerDay.toFixed(1)} study steps/day across upcoming exams (your daily target is ${dailyTarget}). ${behindSubjs ? `${behindSubjs} subject(s) have more pending chapters than days left.` : 'Increase your daily target or prioritize low-prep chapters.'}`;
    } else if (totalNeededStepsPerDay > dailyTarget * 0.8) {
      pillCls = 'tight';
      pillTxt = 'Tight Pace';
      msg = `You need ~${totalNeededStepsPerDay.toFixed(1)} steps/day against your ${dailyTarget} tasks/day target${earliestDays ? ` (nearest exam in ${earliestDays}d)` : ''}. Stay consistent${lowPrepCount ? ` and review ${lowPrepCount} low-prep (≤2★) chapters` : ''}.`;
    } else {
      pillCls = 'ontime';
      pillTxt = 'On Pace';
      msg = `Looking solid — you need ~${totalNeededStepsPerDay.toFixed(1)} steps/day, comfortably inside your ${dailyTarget} tasks/day target${earliestDays ? ` (nearest exam in ${earliestDays}d)` : ''}.`;
    }

    root.innerHTML = `
      <div class="rev-analysis-card">
        <div class="rev-verdict-row">
          <div class="rev-verdict-title">Readiness &amp; Pace Analysis</div>
          <span class="rev-pace-pill ${pillCls}">${pillTxt}</span>
        </div>
        <div class="rev-verdict-msg">${escHtml(msg)}</div>
        <div class="rev-kpis">
          <div class="rev-kpi"><div class="rev-kpi-v">${pendingCh}</div><div class="rev-kpi-l">Pending Ch</div></div>
          <div class="rev-kpi"><div class="rev-kpi-v">${pendingSteps}</div><div class="rev-kpi-l">Pending Steps</div></div>
          <div class="rev-kpi"><div class="rev-kpi-v">${totalRevDone}/${totalRevPossible}</div><div class="rev-kpi-l">Rev Rounds</div></div>
          <div class="rev-kpi"><div class="rev-kpi-v">${avgPrep === '—' ? '—' : '★ ' + avgPrep}</div><div class="rev-kpi-l">Avg Prep${lowPrepCount ? ` (${lowPrepCount} low)` : ''}</div></div>
        </div>
      </div>`;
  }

  function renderRevision() {
    const u = getUser();
    if (!u) return;
    if (!u.boardDates) u.boardDates = {};
    const board = getBoard(u.boardId);
    document.getElementById('revisionExamHeading').textContent = `${board.name} exam dates`;
    const dateRoot = document.getElementById('boardExamDates');
    dateRoot.innerHTML = '';

    getActiveSubjects().forEach((subj, index) => {
      const row = document.createElement('div');
      row.className = 'exam-date-row';
      row.innerHTML = `<label class="exam-date-subj" for="board-date-${index}">${escHtml(subj.name)}</label>
        <input class="exam-date-input" id="board-date-${index}" type="date" value="${escHtml(u.boardDates[subj.name] || '')}" aria-label="${escHtml(subj.name)} exam date">
        <div class="exam-countdown"></div>`;
      const input = row.querySelector('input');
      const countdown = row.querySelector('.exam-countdown');
      const updateCountdown = (fromChange) => {
        const iso = input.value;
        const chs = subjAllChs(subj);
        const remaining = chs.filter(ch => !isDone(subj.name, ch)).length;
        const remSteps = chs.reduce((sum, ch) => sum + (3 - stepsCount(subj.name, ch)), 0);
        if (iso) u.boardDates[subj.name] = iso; else delete u.boardDates[subj.name];
        saveStore();
        if (!iso) {
          countdown.textContent = `${remaining} chapters (${remSteps} steps) pending`;
          countdown.className = 'exam-countdown';
        } else {
          const days = Math.round((fromISO(iso) - fromISO(todayISO())) / 86400000);
          if (days < 0) {
            countdown.textContent = `Exam passed ${Math.abs(days)}d ago · ${remaining} ch pending`;
            countdown.className = 'exam-countdown' + (remaining ? ' behind' : ' ontime');
          } else if (days === 0) {
            countdown.textContent = `Exam today · ${remaining} ch pending`;
            countdown.className = 'exam-countdown' + (remaining ? ' behind' : ' ontime');
          } else if (remaining > days) {
            countdown.textContent = `${days}d left · ${remaining} ch (${remSteps} steps) pending · Behind (~${(remaining / days).toFixed(1)} ch/day)`;
            countdown.className = 'exam-countdown behind';
          } else {
            countdown.textContent = `${days}d left · ${remaining} ch (${remSteps} steps) pending · On pace`;
            countdown.className = 'exam-countdown ontime';
          }
        }
        if (fromChange) renderRevisionAnalysis();
      };
      input.addEventListener('change', () => updateCountdown(true));
      updateCountdown(false);
      dateRoot.appendChild(row);
    });
    renderRevisionAnalysis();

    const grid = document.getElementById('weekGrid');
    const summary = document.getElementById('weekSummary');
    grid.innerHTML = '';
    const today = fromISO(todayISO());
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
    const counts = Array(7).fill(0);
    getPlan().tasks.forEach(task => {
      if (!task.done) return;
      const completed = fromISO(task.doneAt || task.date);
      const dayIndex = Math.round((completed - monday) / 86400000);
      if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex]++;
    });
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const iso = toISO(date);
      const day = document.createElement('div');
      day.className = 'week-day' + (iso === todayISO() ? ' today' : '');
      const level = counts[i] === 0 ? 0 : counts[i] === 1 ? 1 : 2;
      day.innerHTML = `<div class="week-name">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</div><div class="week-date">${date.getDate()}</div><div class="week-count${level ? ' level-' + level : ''}">${counts[i]}</div>`;
      grid.appendChild(day);
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const activeDays = counts.filter(Boolean).length;
    summary.textContent = `${total} tasks completed across ${activeDays} ${activeDays === 1 ? 'day' : 'days'} this week`;
  }

  /* ══════════════════════════════════════════════
     EXAMS PAGE
  ══════════════════════════════════════════════ */
  function openExamModal(id) {
    const u = getUser();
    if (!u) return;
    editExamId = id || null;
    document.getElementById('examModalTitle').textContent = id ? 'Edit Exam' : 'New Exam';
    document.getElementById('examDate').value = todayISO();
    document.getElementById('examName').value = '';
    const list = document.getElementById('escList');
    list.innerHTML = '';
    getActiveSubjects().forEach(s => {
      const row = document.createElement('div');
      row.className = 'esc-row';
      row.dataset.s = s.name;
      row.innerHTML = `<div class="esc-dot" style="background:${getSubjColor(s.name)}"></div><div class="esc-name">${escHtml(s.name)}</div>
        <div class="esc-inputs">
          <input type="number" class="eg" min="0" max="9999" inputmode="numeric" placeholder="Got">
          <span>/</span>
          <input type="number" class="em" min="1" max="9999" inputmode="numeric" placeholder="100" value="100">
        </div>`;
      list.appendChild(row);
    });
    if (id) {
      const ex = (u.exams || []).find(e => e.id === id);
      if (ex) {
        document.getElementById('examName').value = ex.name;
        document.getElementById('examDate').value = ex.date || '';
        list.querySelectorAll('.esc-row').forEach(row => {
          const sc = ex.scores[row.dataset.s];
          if (sc) { row.querySelector('.eg').value = sc.got; row.querySelector('.em').value = sc.max; }
        });
      }
    }
    openOverlay('examOverlay');
  }

  function saveExam() {
    const u = getUser();
    if (!u) return;
    if (!Array.isArray(u.exams)) u.exams = [];
    const name = document.getElementById('examName').value.trim();
    if (!name) { showToast('Enter an exam name'); return; }
    const date = document.getElementById('examDate').value;
    const scores = {};
    let any = false;
    document.querySelectorAll('#escList .esc-row').forEach(row => {
      const g = row.querySelector('.eg').value;
      const m = row.querySelector('.em').value || '100';
      if (g !== '') { scores[row.dataset.s] = { got: parseFloat(g), max: parseFloat(m) || 100 }; any = true; }
    });
    if (!any) { showToast('Enter at least one subject score'); return; }
    if (editExamId) {
      const ex = u.exams.find(e => e.id === editExamId);
      if (ex) { ex.name = name; ex.date = date; ex.scores = scores; }
    } else {
      u.exams.unshift({ id: '' + Date.now(), name, date, scores });
    }
    saveStore();
    closeOverlay('examOverlay');
    renderExams();
    showToast('Exam saved');
  }

  function renderExams() {
    const u = getUser();
    const exams = (u && u.exams) || [];
    const subjects = getActiveSubjects();
    const listEl = document.getElementById('examList');
    const anaEl = document.getElementById('examAnalysis');
    if (!exams.length) {
      anaEl.innerHTML = `<div class="analysis-wrap">
        <div class="analysis-grid">
          <div class="acard"><div class="av" style="color:var(--muted)">—</div><div class="al">Overall Average</div></div>
          <div class="acard"><div class="av" style="color:var(--muted)">—</div><div class="al">Best Exam</div></div>
          <div class="acard"><div class="av" style="color:var(--muted)">—</div><div class="al">Lowest Exam</div></div>
          <div class="acard"><div class="av" style="color:var(--blue)">0</div><div class="al">Exams Logged</div></div>
        </div>
      </div>`;
      listEl.innerHTML = `<div class="plan-empty" style="padding:24px 16px"><div class="pe-txt">No exams logged yet. Tap <b>+ Add New Exam</b> above to track your marks.</div></div>`;
      return;
    }
    listEl.innerHTML = '';
    exams.forEach(ex => {
      const ks = Object.keys(ex.scores || {});
      const tg = ks.reduce((a, k) => a + (ex.scores[k].got || 0), 0);
      const tm = ks.reduce((a, k) => a + (ex.scores[k].max || 100), 0);
      const tp = tm ? Math.round(tg / tm * 100) : 0;
      const tc = scoreColor(tp);

      const chips = ks.map(sname => {
        const sc = ex.scores[sname];
        if (!sc) return '';
        const p = sc.max ? Math.round(sc.got / sc.max * 100) : 0;
        return `<span class="ecm-chip"><span class="ecm-chip-dot" style="background:${getSubjColor(sname)}"></span>${escHtml(getSubjShort(sname))} <span style="color:${scoreColor(p)}">${sc.got}/${sc.max}</span></span>`;
      }).join('');

      const card = document.createElement('div');
      card.className = 'exam-card-min';
      card.innerHTML = `
        <div class="ecm-top">
          <div class="ecm-info">
            <div class="ecm-name">${escHtml(ex.name)}</div>
            <div class="ecm-date">${escHtml(fmtDate(ex.date))} · ${tg}/${tm}</div>
          </div>
          <div class="ecm-badge" style="color:${tc}">${tp}%</div>
          <div class="exam-card-btns">
            <button type="button" class="exam-btn edit-btn">Edit</button>
            <button type="button" class="exam-btn del del-btn">✕</button>
          </div>
        </div>
        <div class="ecm-bar"><div class="ecm-bar-fill" style="width:${tp}%;background:${tc}"></div></div>
        <div class="ecm-chips">${chips}</div>`;

      card.querySelector('.edit-btn').addEventListener('click', () => openExamModal(ex.id));
      card.querySelector('.del-btn').addEventListener('click', () => {
        askConfirm('Delete Exam', `Remove "${ex.name}" from your exam log?`, 'Delete', () => {
          u.exams = u.exams.filter(e => e.id !== ex.id);
          saveStore();
          renderExams();
          showToast('Exam deleted');
        });
      });
      listEl.appendChild(card);
    });

    const allTot = exams.map(ex => {
      const ks = Object.keys(ex.scores || {});
      const g = ks.reduce((a, k) => a + (ex.scores[k].got || 0), 0);
      const m = ks.reduce((a, k) => a + (ex.scores[k].max || 100), 0);
      return m ? Math.round(g / m * 100) : 0;
    });
    const avgAll = Math.round(allTot.reduce((a, b) => a + b, 0) / allTot.length);
    const best = Math.max(...allTot), worst = Math.min(...allTot);
    const trend = allTot.length > 1 ? allTot[0] - allTot[1] : null;

    const subjAvg = {};
    subjects.forEach(s => {
      const vals = exams.filter(ex => ex.scores && ex.scores[s.name]).map(ex => {
        const sc = ex.scores[s.name];
        return sc.max ? Math.round(sc.got / sc.max * 100) : 0;
      });
      if (vals.length) subjAvg[s.name] = { avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
    });
    const se = Object.entries(subjAvg).sort((a, b) => b[1].avg - a[1].avg);
    const strong = se[0], weak = se[se.length - 1];
    let trendStr = '';
    if (trend !== null) trendStr = trend === 0 ? '→ Same as last exam' : `${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}% vs last exam`;

    anaEl.innerHTML = `<div class="analysis-wrap">
      <div class="analysis-title">Analysis</div>
      <div class="analysis-grid">
        <div class="acard"><div class="av" style="color:${scoreColor(avgAll)}">${avgAll}%</div><div class="al">Overall Average</div></div>
        <div class="acard"><div class="av" style="color:#16A34A">${best}%</div><div class="al">Best Exam</div></div>
        <div class="acard"><div class="av" style="color:#DC2626">${worst}%</div><div class="al">Lowest Exam</div></div>
        <div class="acard"><div class="av" style="color:#2563EB">${exams.length}</div><div class="al">Exams Logged</div></div>
        ${strong ? `<div class="acard wide" style="display:flex;gap:16px;align-items:center">
          <div><div class="av" style="color:${getSubjColor(strong[0])}">${strong[1].avg}%</div><div class="al">Strongest: ${escHtml(strong[0])}</div></div>
          ${weak && weak[0] !== strong[0] ? `<div style="margin-left:auto;text-align:right"><div class="av" style="color:#DC2626">${weak[1].avg}%</div><div class="al">Needs work: ${escHtml(weak[0])}</div></div>` : ''}
        </div>` : ''}
        ${trend !== null ? `<div class="acard wide"><div class="av" style="font-size:15px;color:${trend > 0 ? '#16A34A' : trend < 0 ? '#DC2626' : '#71717A'}">${trendStr}</div><div class="al">Recent Trend</div></div>` : ''}
      </div></div>`;

    if (allTot.length > 1) {
      const ce = [...exams].slice(0, 6).reverse();
      const ct = ce.map(ex => {
        const ks = Object.keys(ex.scores || {});
        const g = ks.reduce((a, k) => a + (ex.scores[k].got || 0), 0);
        const m = ks.reduce((a, k) => a + (ex.scores[k].max || 100), 0);
        return m ? Math.round(g / m * 100) : 0;
      });
      const mx = Math.max(...ct, 1);
      const bars = ce.map((ex, i) => {
        const p = ct[i], h = Math.round((p / mx) * 60), c = scoreColor(p);
        const n = ex.name.length > 7 ? ex.name.slice(0, 6) + '…' : ex.name;
        return `<div class="tcc-col"><div class="tcc-val">${p}%</div><div class="tcc-bar-wrap"><div class="tcc-bar" style="height:${h}px;background:${c}"></div></div><div class="tcc-name">${escHtml(n)}</div></div>`;
      }).join('');
      anaEl.innerHTML += `<div class="trend-chart-card"><div class="tcc-title">Score Trend (last ${ce.length} exams)</div><div class="tcc-bars">${bars}</div></div>`;
    }

    if (se.length) {
      const rows = se.map(([name, d]) => {
        const c = scoreColor(d.avg);
        return `<div class="sa-row"><div class="sa-dot" style="background:${getSubjColor(name)}"></div><div class="sa-name">${escHtml(name)}</div><div class="sa-bw"><div class="sa-b" style="width:${d.avg}%;background:${c}"></div></div><div class="sa-avg" style="color:${c}">${d.avg}%</div></div>`;
      }).join('');
      anaEl.innerHTML += `<div class="sa-card"><div class="sa-title">Subject Average (all exams)</div>${rows}</div>`;
    }
  }

  /* ══════════════════════════════════════════════
     ONBOARDING & SETUP WIZARD (4 STEPS)
  ══════════════════════════════════════════════ */
  let wiz = { mode: 'create', editId: null, step: 0, name: '', avatarColor: '#2563EB', boardId: 'cbse', classId: 'class-12', addon: null, selectedSubjects: [], boardCat: 'all', boardSearch: '' };

  function openWizard(mode, userToEdit, startStep) {
    wiz = {
      mode: mode || 'create',
      editId: userToEdit ? userToEdit.id : null,
      step: typeof startStep === 'number' ? startStep : 0,
      name: userToEdit ? userToEdit.name : '',
      avatarColor: userToEdit ? (userToEdit.avatarColor || '#2563EB') : AVATAR_COLORS[STORE.users.length % AVATAR_COLORS.length],
      boardId: userToEdit ? userToEdit.boardId : 'cbse',
      classId: userToEdit ? userToEdit.classId : 'class-12',
      addon: userToEdit ? (userToEdit.addon || null) : null,
      selectedSubjects: userToEdit ? [...(userToEdit.selectedSubjects || [])] : [],
      boardCat: 'all',
      boardSearch: ''
    };
    renderWizard();
    openOverlay('setupOverlay');
  }

  function ensureValidWizClassAndSubjects() {
    const board = getBoard(wiz.boardId);
    const classKeys = Object.keys(board.classes);
    if (!board.classes[wiz.classId]) wiz.classId = classKeys[classKeys.length - 1];
    const cls = board.classes[wiz.classId];
    if (!cls.allowCompetitive) wiz.addon = null;

    let pool = cls.subjects.map(s => s.name);
    if (wiz.addon && DB.competitiveAddons[wiz.addon]) {
      pool = pool.concat(DB.competitiveAddons[wiz.addon].subjects.map(s => s.name));
    }
    const valid = wiz.selectedSubjects.filter(s => pool.includes(s));
    if (!valid.length) {
      const defPreset = cls.presets && cls.presets[0] ? [...cls.presets[0].subjects] : pool.slice(0, 5);
      if (wiz.addon && DB.competitiveAddons[wiz.addon]) {
        DB.competitiveAddons[wiz.addon].subjects.forEach(s => { if (!defPreset.includes(s.name)) defPreset.push(s.name); });
      }
      wiz.selectedSubjects = defPreset;
    } else {
      wiz.selectedSubjects = valid;
    }
  }

  function renderWizard() {
    const stepsEl = document.querySelectorAll('#wizSteps .wiz-step');
    stepsEl.forEach((el, i) => {
      el.className = 'wiz-step' + (i < wiz.step ? ' done' : i === wiz.step ? ' now' : '');
    });

    const titleEl = document.getElementById('wizTitle');
    const subEl = document.getElementById('wizSub');
    const bodyEl = document.getElementById('wizBody');
    const btnsEl = document.getElementById('wizBtns');
    const canCancel = STORE.users.length > 0;

    if (wiz.step === 0) {
      titleEl.textContent = wiz.mode === 'edit' ? 'Edit Profile' : 'Create Your Profile';
      subEl.textContent = 'Stored privately in your browser localStorage';
      const initial = (wiz.name.trim()[0] || 'S').toUpperCase();
      bodyEl.innerHTML = `
        <div class="avatar-row">
          <div class="avatar-preview" id="wizAvPrev" style="background:${wiz.avatarColor}">${escHtml(initial)}</div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:6px">Avatar Accent</div>
            <div class="color-swatches">
              ${AVATAR_COLORS.map(c => `<button type="button" class="cswatch${wiz.avatarColor === c ? ' active' : ''}" data-clr="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
            </div>
          </div>
        </div>
        <div class="field">
          <label for="wizNameInput">Your Name</label>
          <input type="text" id="wizNameInput" maxlength="40" placeholder="e.g. Arjun, Meera, Rahul…" value="${escHtml(wiz.name)}">
        </div>`;

      const inp = bodyEl.querySelector('#wizNameInput');
      inp.addEventListener('input', () => {
        wiz.name = inp.value;
        document.getElementById('wizAvPrev').textContent = (wiz.name.trim()[0] || 'S').toUpperCase();
      });
      bodyEl.querySelectorAll('.cswatch').forEach(btn => {
        btn.addEventListener('click', () => {
          wiz.avatarColor = btn.dataset.clr;
          document.getElementById('wizAvPrev').style.background = wiz.avatarColor;
          bodyEl.querySelectorAll('.cswatch').forEach(b => b.classList.toggle('active', b.dataset.clr === wiz.avatarColor));
        });
      });

      btnsEl.innerHTML = `
        ${canCancel ? '<button type="button" class="sbtn sbtn-cancel" id="wizCancel">Cancel</button>' : ''}
        <button type="button" class="sbtn sbtn-ok" id="wizNext">Choose Board →</button>`;
      if (canCancel) btnsEl.querySelector('#wizCancel').addEventListener('click', () => closeOverlay('setupOverlay'));
      btnsEl.querySelector('#wizNext').addEventListener('click', () => {
        if (!wiz.name.trim()) { showToast('Please enter your name'); inp.focus(); return; }
        wiz.step = 1;
        renderWizard();
      });
      setTimeout(() => inp.focus(), 50);
    }

    else if (wiz.step === 1) {
      titleEl.textContent = 'Select Education Board';
      subEl.textContent = `Choose from ${DB.boards.length} boards & competitive exams`;
      const cats = [
        { id: 'all', label: 'All (15)' },
        { id: 'national', label: 'National' },
        { id: 'state', label: 'State Boards' },
        { id: 'competitive', label: 'JEE & NEET' },
        { id: 'international', label: 'International' }
      ];
      bodyEl.innerHTML = `
        <input class="assign-search" id="wizBoardSearch" type="search" placeholder="Search CBSE, Kerala, ICSE, Maharashtra, JEE, NEET…" value="${escHtml(wiz.boardSearch)}">
        <div class="board-filter-pills">
          ${cats.map(c => `<button type="button" class="bfpill${wiz.boardCat === c.id ? ' active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>
        <div class="board-grid" id="wizBoardGrid"></div>`;

      const renderBoards = () => {
        const q = wiz.boardSearch.trim().toLowerCase();
        const grid = bodyEl.querySelector('#wizBoardGrid');
        const matches = DB.boards.filter(b => {
          const catOk = wiz.boardCat === 'all' || b.category === wiz.boardCat;
          const qOk = !q || b.name.toLowerCase().includes(q) || b.fullName.toLowerCase().includes(q) || b.region.toLowerCase().includes(q);
          return catOk && qOk;
        });
        grid.innerHTML = matches.map(b => `
          <button type="button" class="board-card${wiz.boardId === b.id ? ' sel' : ''}" data-bid="${b.id}">
            <div class="board-logo">${window.APP_ICONS.getBoardLogoSVG(b.id, b.accent)}</div>
            <div class="board-meta">
              <div class="board-name">${escHtml(b.name)}</div>
              <div class="board-sub">${escHtml(b.tagline)}</div>
            </div>
          </button>`).join('') || '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted);font-size:13px">No matching board found</div>';
        grid.querySelectorAll('.board-card').forEach(card => {
          card.addEventListener('click', () => {
            if (wiz.boardId !== card.dataset.bid) {
              wiz.boardId = card.dataset.bid;
              wiz.selectedSubjects = [];
              wiz.addon = null;
            }
            renderBoards();
          });
        });
      };

      const searchInp = bodyEl.querySelector('#wizBoardSearch');
      searchInp.addEventListener('input', () => { wiz.boardSearch = searchInp.value; renderBoards(); });
      bodyEl.querySelectorAll('.bfpill').forEach(p => {
        p.addEventListener('click', () => {
          wiz.boardCat = p.dataset.cat;
          bodyEl.querySelectorAll('.bfpill').forEach(x => x.classList.toggle('active', x.dataset.cat === wiz.boardCat));
          renderBoards();
        });
      });
      renderBoards();

      btnsEl.innerHTML = `
        <button type="button" class="sbtn sbtn-cancel" id="wizBack">← Back</button>
        <button type="button" class="sbtn sbtn-ok" id="wizNext">Select Class →</button>`;
      btnsEl.querySelector('#wizBack').addEventListener('click', () => { wiz.step = 0; renderWizard(); });
      btnsEl.querySelector('#wizNext').addEventListener('click', () => {
        ensureValidWizClassAndSubjects();
        wiz.step = 2;
        renderWizard();
      });
    }

    else if (wiz.step === 2) {
      const board = getBoard(wiz.boardId);
      ensureValidWizClassAndSubjects();
      titleEl.textContent = `${board.name} — Select Class`;
      subEl.textContent = board.fullName;
      const clsEntries = Object.entries(board.classes);
      const curCls = board.classes[wiz.classId];

      bodyEl.innerHTML = `
        <div class="class-grid">
          ${clsEntries.map(([cid, cobj]) => `
            <button type="button" class="class-card${wiz.classId === cid ? ' sel' : ''}" data-cid="${cid}">
              <div class="class-card-title">${escHtml(cobj.label)}</div>
              <div class="class-card-sub">${cobj.subjects.length} subjects available</div>
            </button>`).join('')}
        </div>
        ${curCls && curCls.allowCompetitive ? `
          <div class="addon-box">
            <div class="addon-box-title">Optional Competitive Prep Add-on</div>
            <div class="addon-row">
              <button type="button" class="addon-btn${wiz.addon === null ? ' sel' : ''}" data-addon="">Board Only</button>
              <button type="button" class="addon-btn${wiz.addon === 'jee' ? ' sel' : ''}" data-addon="jee">+ JEE Prep</button>
              <button type="button" class="addon-btn${wiz.addon === 'neet' ? ' sel' : ''}" data-addon="neet">+ NEET Prep</button>
            </div>
          </div>` : ''}`;

      bodyEl.querySelectorAll('.class-card').forEach(btn => {
        btn.addEventListener('click', () => {
          if (wiz.classId !== btn.dataset.cid) {
            wiz.classId = btn.dataset.cid;
            wiz.selectedSubjects = [];
          }
          renderWizard();
        });
      });
      bodyEl.querySelectorAll('.addon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          wiz.addon = btn.dataset.addon || null;
          wiz.selectedSubjects = [];
          ensureValidWizClassAndSubjects();
          renderWizard();
        });
      });

      btnsEl.innerHTML = `
        <button type="button" class="sbtn sbtn-cancel" id="wizBack">← Back</button>
        <button type="button" class="sbtn sbtn-ok" id="wizNext">Pick Subjects →</button>`;
      btnsEl.querySelector('#wizBack').addEventListener('click', () => { wiz.step = 1; renderWizard(); });
      btnsEl.querySelector('#wizNext').addEventListener('click', () => {
        ensureValidWizClassAndSubjects();
        wiz.step = 3;
        renderWizard();
      });
    }

    else if (wiz.step === 3) {
      const board = getBoard(wiz.boardId);
      const cls = board.classes[wiz.classId];
      let pool = cls.subjects.map(s => ({ ...s, isAddon: false }));
      if (wiz.addon && DB.competitiveAddons[wiz.addon]) {
        const ad = DB.competitiveAddons[wiz.addon];
        pool = pool.concat(ad.subjects.map(s => ({ ...s, isAddon: true, addonLabel: ad.short })));
      }
      titleEl.textContent = 'Choose Your Subjects';
      subEl.textContent = `${board.name} · ${cls.label}${wiz.addon ? ' + ' + DB.competitiveAddons[wiz.addon].short : ''}`;

      bodyEl.innerHTML = `
        <div class="preset-row">
          ${(cls.presets || []).map((p, idx) => `<button type="button" class="preset-chip" data-pidx="${idx}">${escHtml(p.name)}</button>`).join('')}
          <button type="button" class="preset-chip" data-pidx="all">Select All</button>
        </div>
        <div class="subj-pick-grid" id="wizSubjGrid"></div>`;

      const renderSubjGrid = () => {
        const grid = bodyEl.querySelector('#wizSubjGrid');
        grid.innerHTML = pool.map(s => {
          const sel = wiz.selectedSubjects.includes(s.name);
          const clr = getSubjColor(s.name);
          const cnt = subjAllChs(s).length;
          return `
            <button type="button" class="subj-pick${sel ? ' sel' : ''}" data-sn="${escHtml(s.name)}">
              <div class="subj-pick-ico" style="background:${clr}1f;color:${clr}">${window.APP_ICONS.getSubjectIconSVG(getSubjIconKey(s.name))}</div>
              <div class="subj-pick-info">
                <div class="subj-pick-name">${escHtml(s.name)}</div>
                <div class="subj-pick-cnt">${cnt} chapters${s.isAddon ? ' · ' + escHtml(s.addonLabel) : ''}</div>
              </div>
              <div class="subj-pick-chk">✓</div>
            </button>`;
        }).join('');
        grid.querySelectorAll('.subj-pick').forEach(btn => {
          btn.addEventListener('click', () => {
            const sn = btn.dataset.sn;
            if (wiz.selectedSubjects.includes(sn)) {
              wiz.selectedSubjects = wiz.selectedSubjects.filter(x => x !== sn);
            } else {
              wiz.selectedSubjects.push(sn);
            }
            renderSubjGrid();
          });
        });
      };

      bodyEl.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const idx = chip.dataset.pidx;
          if (idx === 'all') {
            wiz.selectedSubjects = pool.map(s => s.name);
          } else {
            const preset = cls.presets[Number(idx)];
            wiz.selectedSubjects = [...preset.subjects];
            if (wiz.addon && DB.competitiveAddons[wiz.addon]) {
              DB.competitiveAddons[wiz.addon].subjects.forEach(s => {
                if (!wiz.selectedSubjects.includes(s.name)) wiz.selectedSubjects.push(s.name);
              });
            }
          }
          renderSubjGrid();
        });
      });
      renderSubjGrid();

      btnsEl.innerHTML = `
        <button type="button" class="sbtn sbtn-cancel" id="wizBack">← Back</button>
        <button type="button" class="sbtn sbtn-ok" id="wizFinish">${wiz.mode === 'edit' ? 'Save Changes' : 'Start Tracking ✓'}</button>`;
      btnsEl.querySelector('#wizBack').addEventListener('click', () => { wiz.step = 2; renderWizard(); });
      btnsEl.querySelector('#wizFinish').addEventListener('click', () => {
        if (!wiz.selectedSubjects.length) { showToast('Pick at least one subject'); return; }
        if (wiz.mode === 'edit' && wiz.editId) {
          const u = STORE.users.find(x => x.id === wiz.editId);
          if (u) {
            u.name = wiz.name.trim();
            u.avatarColor = wiz.avatarColor;
            u.boardId = wiz.boardId;
            u.classId = wiz.classId;
            u.addon = wiz.addon;
            u.selectedSubjects = [...wiz.selectedSubjects];
          }
          showToast('Profile updated');
        } else {
          const newUser = {
            id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 999),
            name: wiz.name.trim(),
            avatarColor: wiz.avatarColor,
            boardId: wiz.boardId,
            classId: wiz.classId,
            addon: wiz.addon,
            selectedSubjects: [...wiz.selectedSubjects],
            chapters: {},
            exams: [],
            boardDates: {},
            plan: { tasks: [], settings: { target: 5 } }
          };
          STORE.users.push(newUser);
          STORE.activeUserId = newUser.id;
          showToast(`Welcome, ${newUser.name}!`);
        }
        saveStore();
        closeOverlay('setupOverlay');
        curTab = 'All';
        refreshAllViews();
      });
    }
  }

  /* ══════════════════════════════════════════════
     PROFILE SWITCHER
  ══════════════════════════════════════════════ */
  function openProfileSheet() {
    const list = document.getElementById('profileList');
    list.innerHTML = '';
    STORE.users.forEach(u => {
      const board = getBoard(u.boardId);
      const cls = getClassObj(board, u.classId);
      const active = u.id === STORE.activeUserId;
      const item = document.createElement('div');
      item.className = 'prof-item' + (active ? ' active' : '');
      item.innerHTML = `
        <div class="profile-avatar" style="background:${u.avatarColor || '#2563EB'};width:34px;height:34px;font-size:14px">${escHtml((u.name[0] || 'S').toUpperCase())}</div>
        <div class="prof-item-info">
          <div class="prof-item-name">${escHtml(u.name)}${active ? ' · Active' : ''}</div>
          <div class="prof-item-meta">${escHtml(board.name)} · ${escHtml(cls.shortLabel)} · ${(u.selectedSubjects || []).length} subjects</div>
        </div>
        <div class="prof-item-btns">
          ${STORE.users.length > 1 ? '<button type="button" class="t-btn del prof-del-btn" title="Delete profile">✕</button>' : ''}
        </div>`;
      item.addEventListener('click', () => {
        STORE.activeUserId = u.id;
        saveStore();
        curTab = 'All';
        closeOverlay('profileOverlay');
        refreshAllViews();
        showToast(`Switched to ${u.name}`);
      });
      const delBtn = item.querySelector('.prof-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          askConfirm('Delete Profile', `Delete "${u.name}" and all their local progress?`, 'Delete', () => {
            STORE.users = STORE.users.filter(x => x.id !== u.id);
            if (STORE.activeUserId === u.id) STORE.activeUserId = STORE.users[0] ? STORE.users[0].id : null;
            saveStore();
            closeOverlay('profileOverlay');
            refreshAllViews();
            showToast('Profile deleted');
          });
        });
      }
      list.appendChild(item);
    });
    openOverlay('profileOverlay');
  }

  /* ══════════════════════════════════════════════
     BACKUP EXPORT / IMPORT (v2 + Legacy v1)
  ══════════════════════════════════════════════ */
  function downloadBackup() {
    const payload = {
      format: 'study-planner-allinone-backup',
      version: 2,
      createdAt: new Date().toISOString(),
      store: STORE
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-planner-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded');
  }

  function handleRestoreFile(file) {
    file.text().then(text => {
      const parsed = JSON.parse(text);
      if (parsed && parsed.format === 'study-planner-allinone-backup' && parsed.store && Array.isArray(parsed.store.users)) {
        askConfirm('Restore Backup', `Restore ${parsed.store.users.length} profile(s)? This replaces current browser data.`, 'Restore', () => {
          STORE = parsed.store;
          saveStore();
          refreshAllViews();
          showToast('Backup restored');
        });
      } else if (parsed && parsed.format === 'class12-tracker-backup' && parsed.data) {
        askConfirm('Import Legacy Class 12 Backup', 'Import this Class 12 Tracker backup as a new CBSE Class 12 profile?', 'Import', () => {
          const d = parsed.data;
          const u = {
            id: 'u_' + Date.now(),
            name: 'Imported Class 12',
            avatarColor: '#2563EB',
            boardId: 'cbse',
            classId: 'class-12',
            addon: null,
            selectedSubjects: ['Physics', 'Chemistry', 'Mathematics', 'English Core', 'Computer Science'],
            chapters: d.r12v2 || {},
            exams: d.r12exams || [],
            boardDates: d.r12boarddates || {},
            plan: d.r12plan || { tasks: [], settings: { target: 5 } }
          };
          STORE.users.push(u);
          STORE.activeUserId = u.id;
          saveStore();
          refreshAllViews();
          showToast('Legacy backup imported');
        });
      } else {
        showToast('Unsupported backup file format');
      }
    }).catch(() => showToast('Invalid JSON backup file'));
  }

  /* ══════════════════════════════════════════════
     REFRESH ALL VIEWS & INIT
  ══════════════════════════════════════════════ */
  function refreshAllViews() {
    renderTopbar();
    buildStabs();
    buildTracker();
    updateOverview();
    if (curPage === 'plan') renderPlan();
    if (curPage === 'revision') renderRevision();
    if (curPage === 'exams') renderExams();
  }

  function bindEvents() {
    document.getElementById('themeToggle').addEventListener('click', () => setTheme(!isDark()));
    document.getElementById('appearanceBtn').addEventListener('click', openAppearanceSheet);
    document.querySelectorAll('#themeSeg .app-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.themeChoice === 'dark'));
    });
    document.querySelectorAll('#sizeSeg .app-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => setFontSize(btn.dataset.sizeChoice));
    });
    document.getElementById('profileBtn').addEventListener('click', () => {
      if (!STORE.users.length) openWizard('create', null, 0);
      else openProfileSheet();
    });
    document.getElementById('editSubjectsQuickBtn').addEventListener('click', () => {
      const u = getUser();
      if (u) openWizard('edit', u, 3);
      else openWizard('create', null, 0);
    });
    document.getElementById('editActiveProfileBtn').addEventListener('click', () => {
      closeOverlay('profileOverlay');
      const u = getUser();
      if (u) openWizard('edit', u, 0);
    });
    document.getElementById('newProfileBtn').addEventListener('click', () => {
      closeOverlay('profileOverlay');
      openWizard('create', null, 0);
    });

    document.querySelectorAll('.ptab').forEach(btn => {
      btn.addEventListener('click', () => gotoPage(btn.dataset.page));
    });
    document.getElementById('chapterSearch').addEventListener('input', applyStab);

    document.getElementById('prevDayBtn').addEventListener('click', () => { const dt = fromISO(planDate); dt.setDate(dt.getDate() - 1); planDate = toISO(dt); renderPlan(); });
    document.getElementById('nextDayBtn').addEventListener('click', () => { const dt = fromISO(planDate); dt.setDate(dt.getDate() + 1); planDate = toISO(dt); renderPlan(); });
    document.getElementById('tomorrowBtn').addEventListener('click', () => { const dt = fromISO(todayISO()); dt.setDate(dt.getDate() + 1); planDate = toISO(dt); renderPlan(); });
    document.getElementById('autoFillBtn').addEventListener('click', autoGenerate);
    document.getElementById('addTaskBtn').addEventListener('click', openAssign);
    document.getElementById('customTaskBtn').addEventListener('click', () => {
      document.getElementById('customTaskTitle').value = '';
      document.getElementById('customTaskDate').value = planDate;
      openOverlay('customOverlay');
      document.getElementById('customTaskTitle').focus();
    });
    document.getElementById('targetMinusBtn').addEventListener('click', () => {
      const p = getPlan(); p.settings.target = Math.max(1, p.settings.target - 1); saveStore();
      document.getElementById('targetVal').textContent = p.settings.target;
    });
    document.getElementById('targetPlusBtn').addEventListener('click', () => {
      const p = getPlan(); p.settings.target = Math.min(20, p.settings.target + 1); saveStore();
      document.getElementById('targetVal').textContent = p.settings.target;
    });

    document.getElementById('asSearch').addEventListener('input', renderAssignList);
    document.querySelectorAll('#assignTypePills .type-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        asType = pill.dataset.tp;
        document.querySelectorAll('#assignTypePills .type-pill').forEach(p => {
          p.className = 'type-pill' + (p.dataset.tp === asType ? ' sp-' + asType : '');
        });
      });
    });
    document.getElementById('confirmAssignBtn').addEventListener('click', () => {
      if (!asSel) { showToast('Select a chapter'); return; }
      if (!asType) { showToast('Select a task type'); return; }
      const date = document.getElementById('asDate').value || planDate;
      getPlan().tasks.push({ id: '' + Date.now() + Math.random(), subj: asSel.subj, ch: asSel.ch, type: asType, date, done: false, carried: false });
      saveStore();
      closeOverlay('assignOverlay');
      planDate = date;
      renderPlan();
      showToast('Task added');
    });

    document.getElementById('confirmCustomBtn').addEventListener('click', () => {
      const title = document.getElementById('customTaskTitle').value.trim();
      if (!title) { showToast('Enter a task title'); return; }
      const date = document.getElementById('customTaskDate').value || planDate;
      getPlan().tasks.push({ id: '' + Date.now() + Math.random(), subj: 'Custom', ch: title, title, type: 'custom', date, done: false, carried: false });
      saveStore();
      closeOverlay('customOverlay');
      planDate = date;
      renderPlan();
      showToast('Custom task added');
    });

    document.getElementById('confirmReschedBtn').addEventListener('click', () => {
      const nd = document.getElementById('rschedDate').value;
      if (!nd) { showToast('Pick a date'); return; }
      const t = getPlan().tasks.find(x => x.id === reschedId);
      if (t) { t.date = nd; t.carried = false; saveStore(); }
      closeOverlay('rschedOverlay');
      renderPlan();
      showToast('Task moved');
    });

    document.getElementById('addExamBtn').addEventListener('click', () => openExamModal(null));
    document.getElementById('saveExamBtn').addEventListener('click', saveExam);

    document.getElementById('exportBackup').addEventListener('click', downloadBackup);
    document.getElementById('importBackup').addEventListener('click', () => document.getElementById('backupFile').click());
    document.getElementById('backupFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleRestoreFile(file);
      e.target.value = '';
    });

    document.getElementById('confirmCancelBtn').addEventListener('click', () => closeOverlay('confirmOverlay'));
    document.getElementById('confirmOkBtn').addEventListener('click', () => {
      closeOverlay('confirmOverlay');
      if (typeof confirmCallback === 'function') confirmCallback();
      confirmCallback = null;
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
    });
    ['profileOverlay', 'examOverlay', 'assignOverlay', 'customOverlay', 'rschedOverlay', 'confirmOverlay', 'appearanceOverlay'].forEach(id => {
      const ov = document.getElementById(id);
      ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(id); });
    });

    syncVisualViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncVisualViewport);
      window.visualViewport.addEventListener('scroll', syncVisualViewport);
    }
  }

  async function init() {
    setFont(getFontId());
    setFontSize(getFontSizeId());
    setTheme(lsGet(THEME_KEY) === 'dark');
    if (!DB) {
      try {
        const res = await fetch('data/syllabus.json');
        if (res.ok) DB = await res.json();
      } catch (e) {}
    }
    if (!DB) {
      showToast('Could not load syllabus database');
      return;
    }
    loadStore();
    bindEvents();
    refreshAllViews();
    document.getElementById('stabs').style.display = 'flex';
    if (!STORE.users.length) {
      openWizard('create', null, 0);
    }
  }

  init();
})();
