/* ============================================================================
 * portal.js — Unified 4-Tab Tactile Course Workbench Controller
 * ============================================================================
 * Modes:
 *   1. lectures    — Course Overview + 37/40 Slides & Audio TTS player + Slide PDF
 *   2. simulations — Native 3-column 2.5D IsoStage Workbench (12 lessons / 48 steps)
 *   3. diagrams    — 83/82 Step-by-step SVG Mechanism Atlas + Glossary (~180-200)
 *   4. code        — 35/38 Runnable Code & Results Viewer + Interactive Quizzes
 * Works identically on file://, localhost, and GitHub Pages (zero CDN/fetch).
 * ============================================================================ */
(function (global) {
  'use strict';

  const P = global.COURSE_PORTAL;
  const WB = global.ELEARNING_COURSE || global.WORKBENCH_COURSE;
  if (!P) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

  const META = P.meta;
  const WATCHED_KEY = `bgs_watched_${META.code}`;
  const WB_DONE_KEY = WB ? `bgs_wb_done_${WB.courseId}` : `bgs_wb_done_${META.code}`;
  const THEME_KEY = 'ide-theme';

  // Flatten lectures in sequential order
  const allParts = [];
  const partById = {};
  for (const ch of P.chapters) {
    for (const p of ch.parts) {
      const rec = { ...p, chId: ch.id, chNum: ch.num, chTitle: ch.title, chShort: ch.shortTitle };
      allParts.push(rec);
      partById[p.id] = rec;
    }
  }
  const figById = Object.fromEntries((P.figures || []).map((f) => [f.id, f]));
  const codeById = Object.fromEntries((P.codeLabs || []).map((c) => [c.id, c]));

  const PHASE_LABEL = {
    setup:     'Khởi tạo',
    problem:   'Vấn đề',
    technique: 'Cơ chế',
    scale:     'Mở rộng & Tối ưu',
    solution:  'Giải pháp',
    tradeoff:  'Đánh đổi',
    summary:   'Tổng kết'
  };

  const LEGEND_META = {
    req:    { label: 'Yêu cầu',       color: '#3b82f6', sq: false },
    res:    { label: 'Phản hồi',      color: '#22c55e', sq: false },
    msg:    { label: 'Gói tin',       color: '#f59e0b', sq: true  },
    heavy:  { label: 'Tải nặng',      color: '#ef4444', sq: true  },
    write:  { label: 'Ghi bộ nhớ',    color: '#a855f7', sq: true  },
    ping:   { label: 'Thăm dò',       color: '#14b8a6', sq: false },
    kill:   { label: 'Mất gói / Lỗi', color: '#dc2626', sq: false },
    poison: { label: 'Gói lỗi',       color: '#dc2626', sq: true  },
    fail:   { label: 'Mất gói / Lỗi', color: '#dc2626', sq: false }
  };

  /* ── Dynamic Script Loader (works on file:// & https://) ── */
  const loadedScripts = {};
  function loadScriptOnce(src, checkGlobal) {
    if (checkGlobal && global[checkGlobal]) return Promise.resolve(global[checkGlobal]);
    if (loadedScripts[src]) return loadedScripts[src];
    loadedScripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(checkGlobal ? global[checkGlobal] : true);
      s.onerror = () => reject(new Error(`Không nạp được ${src}`));
      document.head.appendChild(s);
    });
    return loadedScripts[src];
  }

  /* ── State ── */
  const state = {
    mode: 'lectures', // 'lectures' | 'simulations' | 'diagrams' | 'code'
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    // Mode 1
    lectureView: 'overview', // 'overview' | '<partId>'
    lecFilter: '',
    lecCollapsed: new Set(),
    // Mode 2 (2.5D Simulations)
    simLessonId: WB && WB.lessons[0] ? WB.lessons[0].id : '',
    simStepIdx: 0,
    simFilter: '',
    simCollapsed: new Set(),
    simDone: new Set(),
    speaking: false,
    // Mode 3 (Diagrams & Glossary)
    diagView: 'svg', // 'svg' | 'glossary'
    figId: P.figures && P.figures[0] ? P.figures[0].id : '',
    figStep: 0, // 0 = all steps
    figZoom: 1,
    diagFilter: '',
    diagCollapsed: new Set(),
    // Mode 4 (Code & Quiz)
    codeView: 'labs', // 'labs' | 'quiz'
    codeId: P.codeLabs && P.codeLabs[0] ? P.codeLabs[0].id : '',
    codeTabKey: 'readme',
    codeFilter: '',
    codeCollapsed: new Set(),
    quizCh: P.quizzes && P.quizzes[0] ? P.quizzes[0].ch : 1,
    quizAnswers: {}, // `${ch}:${idx}` -> 'A'..'D'
    // Search
    searchSel: 0,
    searchHits: []
  };

  let stage = null;

  /* ── Persistence ── */
  function readWatched() {
    try {
      const raw = localStorage.getItem(WATCHED_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return d && typeof d === 'object' && d.watched ? d.watched : {};
    } catch (_) {
      return {};
    }
  }
  function markWatched(partId, done) {
    try {
      const raw = localStorage.getItem(WATCHED_KEY);
      const d = raw ? JSON.parse(raw) : { watched: {} };
      if (!d.watched || typeof d.watched !== 'object') d.watched = {};
      if (done) {
        d.watched[partId] = { ts: Date.now(), tieu_de: partById[partId]?.title || partId, done: true };
        d.last = { ma: partId, tieu_de: partById[partId]?.title || partId, ts: Date.now() };
      } else {
        delete d.watched[partId];
      }
      localStorage.setItem(WATCHED_KEY, JSON.stringify(d));
    } catch (_) {}
  }

  function loadSimDone() {
    try {
      const arr = JSON.parse(localStorage.getItem(WB_DONE_KEY) || '[]');
      if (Array.isArray(arr)) arr.forEach((id) => state.simDone.add(id));
    } catch (_) {}
  }
  function saveSimDone() {
    try {
      localStorage.setItem(WB_DONE_KEY, JSON.stringify([...state.simDone]));
    } catch (_) {}
  }

  /* ── Theme ── */
  function applyTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = state.theme;
    try { localStorage.setItem(THEME_KEY, state.theme); } catch (_) {}
    const btn = $('cp-theme-btn');
    if (btn) {
      btn.title = state.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
      btn.innerHTML = state.theme === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
    }
    if (stage) stage.setTheme(state.theme);
    const fr = $('cp-lecture-frame');
    if (fr && fr.contentWindow) {
      try { fr.contentWindow.postMessage({ type: 'SET_THEME', theme: state.theme }, '*'); } catch (_) {}
    }
  }

  /* ── Mobile Drawer ── */
  function setDrawer(open) {
    const sb = $('cp-sidebar');
    const bd = $('cp-drawer-backdrop');
    if (sb) sb.classList.toggle('is-drawer-open', !!open);
    if (bd) bd.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /* ── Mode Switcher ── */
  function switchMode(mode, updateHash = true) {
    if (!['lectures', 'simulations', 'diagrams', 'code'].includes(mode)) mode = 'lectures';
    if (state.mode !== mode) stopSpeech();
    state.mode = mode;

    $('cp-body').dataset.mode = mode;
    document.querySelectorAll('.cp-nav__item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('[data-side-mode]').forEach((el) => {
      el.hidden = el.dataset.sideMode !== mode;
    });
    document.querySelectorAll('[data-main-mode]').forEach((el) => {
      el.hidden = el.dataset.mainMode !== mode;
    });

    if (mode === 'lectures') {
      renderLectureSidebar();
      renderLectureMain();
    } else if (mode === 'simulations') {
      ensureStage();
      renderSimSidebar();
      renderSimLesson();
      setTimeout(() => stage && stage.fit(false), 30);
    } else if (mode === 'diagrams') {
      renderDiagSidebar();
      renderDiagMain();
    } else if (mode === 'code') {
      renderCodeSidebar();
      renderCodeMain();
    }

    if (updateHash) syncHash();
    setDrawer(false);
  }

  function syncHash() {
    let h = '#lectures';
    if (state.mode === 'lectures') {
      h = state.lectureView === 'overview' ? '#overview' : `#lectures/${state.lectureView}`;
    } else if (state.mode === 'simulations') {
      h = `#simulations/${state.simLessonId}${state.simStepIdx ? '/' + state.simStepIdx : ''}`;
    } else if (state.mode === 'diagrams') {
      h = state.diagView === 'glossary' ? '#glossary' : `#diagrams/${state.figId}`;
    } else if (state.mode === 'code') {
      h = state.codeView === 'quiz' ? `#quiz/${state.quizCh}` : `#code/${state.codeId}`;
    }
    try { history.replaceState(null, '', h); } catch (_) {}
  }

  /* ========================================================================
   * MODE 1: LECTURES & COURSE OVERVIEW
   * ======================================================================== */
  function renderLectureSidebar() {
    const watched = readWatched();
    const doneCount = allParts.filter((p) => Boolean(watched[p.id])).length;
    const pct = allParts.length ? Math.round((doneCount * 100) / allParts.length) : 0;
    const pr = $('cp-lec-progress');
    const bar = $('cp-lec-bar');
    if (pr) pr.textContent = `${doneCount}/${allParts.length} đã xem`;
    if (bar) bar.style.width = `${pct}%`;

    const q = norm(state.lecFilter);
    const tree = $('cp-lec-tree');
    if (!tree) return;

    let html = `
      <button type="button" class="cp-overview-btn ${state.lectureView === 'overview' ? 'is-active' : ''}" data-open-overview>
        <span>📋</span><span>Tổng quan học phần</span>
      </button>`;

    for (const ch of P.chapters) {
      const items = ch.parts.filter((p) => !q || norm(`${p.title} ${p.goal} ${ch.title}`).includes(q));
      if (!items.length) continue;
      const isCol = !q && state.lecCollapsed.has(ch.id);
      const chDone = ch.parts.filter((p) => Boolean(watched[p.id])).length;
      html += `
        <div class="cp-group ${isCol ? 'is-collapsed' : ''}" data-lec-ch="${esc(ch.id)}">
          <button type="button" class="cp-group__head" data-toggle-lec-ch="${esc(ch.id)}">
            <span class="cp-group__chev">▾</span>
            <span class="cp-group__title">${esc(ch.title)}</span>
            <span class="cp-group__meta">${chDone > 0 ? `${chDone}/` : ''}${items.length}</span>
          </button>
          <div class="cp-group__list">
            ${items.map((p) => {
              const isAct = state.lectureView === p.id;
              const isDone = Boolean(watched[p.id]);
              return `
                <button type="button" class="cp-item ${isAct ? 'is-active' : ''} ${isDone ? 'is-done' : ''}" data-open-lec="${esc(p.id)}">
                  <span class="cp-item__dot">${isDone ? '✓' : p.pos}</span>
                  <span class="cp-item__main">
                    <span class="cp-item__title">${esc(p.title)}</span>
                    <span class="cp-item__sub">
                      <span>${p.ttsMin ? `${p.ttsMin}′` : `${p.planMin}′`}</span>
                      ${p.simId ? '<span class="cp-mini-tag cp-mini-tag--sim">⚡ 2.5D</span>' : ''}
                      ${p.codeId ? '<span class="cp-mini-tag cp-mini-tag--code">💻 Mã</span>' : ''}
                    </span>
                  </span>
                </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    tree.innerHTML = html;
    tree.querySelector('[data-open-overview]')?.addEventListener('click', () => {
      state.lectureView = 'overview';
      renderLectureSidebar();
      renderLectureMain();
      syncHash();
      setDrawer(false);
    });
    tree.querySelectorAll('[data-toggle-lec-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.toggleLecCh;
        if (state.lecCollapsed.has(cid)) state.lecCollapsed.delete(cid);
        else state.lecCollapsed.add(cid);
        renderLectureSidebar();
      });
    });
    tree.querySelectorAll('[data-open-lec]').forEach((btn) => {
      btn.addEventListener('click', () => openLecture(btn.dataset.openLec));
    });
  }

  function openLecture(partId) {
    if (!partById[partId]) return;
    state.lectureView = partId;
    if (state.mode !== 'lectures') {
      switchMode('lectures', false);
    } else {
      renderLectureSidebar();
      renderLectureMain();
    }
    syncHash();
    setDrawer(false);
  }

  function renderLectureMain() {
    const ovEl = $('cp-overview');
    const frEl = $('cp-lecture-frame');
    const crumbEl = $('cp-lec-crumb');
    const titleEl = $('cp-lec-title');
    const actEl = $('cp-lec-actions');

    if (state.lectureView === 'overview' || !partById[state.lectureView]) {
      ovEl.hidden = false;
      frEl.hidden = true;
      frEl.src = 'about:blank';
      crumbEl.textContent = `${META.code} · ${META.credits} tín chỉ · ${META.platform}`;
      titleEl.textContent = META.title;
      actEl.innerHTML = `
        <button type="button" class="cp-pill cp-pill--primary" id="cp-start-first">▶ Bắt đầu học</button>
        <button type="button" class="cp-pill cp-pill--accent" data-jump-mode="simulations">⚡ Mô phỏng 2.5D (${META.simCount})</button>
        <a class="cp-pill" href="frame.html" target="_blank" rel="noopener">📖 Khung &amp; Thuật ngữ ↗</a>`;
      $('cp-start-first')?.addEventListener('click', () => {
        const first = allParts.find((p) => p.hasPreview) || allParts[0];
        if (first) openLecture(first.id);
      });
      actEl.querySelectorAll('[data-jump-mode]').forEach((b) =>
        b.addEventListener('click', () => switchMode(b.dataset.jumpMode))
      );
      renderOverviewCards();
      return;
    }

    const p = partById[state.lectureView];
    const idx = allParts.findIndex((x) => x.id === p.id);
    const prevP = idx > 0 ? allParts[idx - 1] : null;
    const nextP = idx >= 0 && idx < allParts.length - 1 ? allParts[idx + 1] : null;
    const watched = readWatched();
    const isDone = Boolean(watched[p.id]);

    ovEl.hidden = true;
    frEl.hidden = false;

    crumbEl.textContent = `${p.chTitle} · Phần ${p.pos} · ${p.ttsMin ? `${p.ttsMin}′` : `${p.planMin}′`}`;
    titleEl.textContent = p.title;
    actEl.innerHTML = `
      <button type="button" class="cp-pill ${isDone ? 'cp-pill--primary' : ''}" id="cp-toggle-done" title="Đánh dấu đã xem phần này">${isDone ? '✓ Đã xem' : '○ Đánh dấu xong'}</button>
      ${p.pdfHref ? `<a class="cp-pill" href="${esc(p.pdfHref)}" target="_blank" rel="noopener">📄 Slide PDF</a>` : ''}
      ${p.simId ? `<button type="button" class="cp-pill cp-pill--accent" id="cp-lec-go-sim" title="Mở mô phỏng 2.5D: ${esc(p.simTitle)}">⚡ Mô phỏng 2.5D</button>` : ''}
      ${p.codeId ? `<button type="button" class="cp-pill" id="cp-lec-go-code">💻 Xem mã</button>` : ''}
      <button type="button" class="cp-pill" id="cp-lec-prev" ${prevP ? '' : 'disabled'} title="${prevP ? esc(prevP.title) : ''}">← Trước</button>
      <button type="button" class="cp-pill" id="cp-lec-next" ${nextP ? '' : 'disabled'} title="${nextP ? esc(nextP.title) : ''}">Tiếp →</button>
      ${p.href ? `<a class="cp-pill" href="${esc(p.href)}" target="_blank" rel="noopener" title="Mở trình chiếu toàn trang trong tab mới">↗ Toàn trang</a>` : ''}`;

    $('cp-toggle-done')?.addEventListener('click', () => {
      markWatched(p.id, !isDone);
      renderLectureSidebar();
      renderLectureMain();
    });
    $('cp-lec-go-sim')?.addEventListener('click', () => openSimulation(p.simId, 0));
    $('cp-lec-go-code')?.addEventListener('click', () => openCodeLab(p.codeId));
    $('cp-lec-prev')?.addEventListener('click', () => prevP && openLecture(prevP.id));
    $('cp-lec-next')?.addEventListener('click', () => nextP && openLecture(nextP.id));

    const targetSrc = p.href ? `${p.href}?embed=1&theme=${state.theme}` : 'about:blank';
    if (frEl.dataset.loadedPart !== p.id) {
      frEl.dataset.loadedPart = p.id;
      frEl.src = targetSrc;
    }
  }

  function renderOverviewCards() {
    const ovEl = $('cp-overview');
    const watched = readWatched();
    const doneCount = allParts.filter((p) => Boolean(watched[p.id])).length;

    const chCards = P.chapters.map((ch) => {
      const chDone = ch.parts.filter((p) => Boolean(watched[p.id])).length;
      const firstPart = ch.parts[0];
      const firstSim = ch.parts.find((p) => p.simId)?.simId;
      const firstCode = ch.parts.find((p) => p.codeId)?.codeId;
      return `
        <article class="cp-ch-card">
          <div class="cp-ch-card__top">
            <h3 class="cp-ch-card__title">${esc(ch.title)}</h3>
            <span class="cp-ch-card__meta">${chDone > 0 ? `${chDone}/` : ''}${ch.parts.length} phần · ${ch.totalMin}′</span>
          </div>
          ${ch.competency ? `<p class="cp-ch-card__desc">${esc(ch.competency)}</p>` : ''}
          <div class="cp-ch-card__actions">
            ${firstPart ? `<button type="button" class="cp-pill cp-pill--primary" data-ov-lec="${esc(firstPart.id)}">▶ Mở bài giảng</button>` : ''}
            ${firstSim ? `<button type="button" class="cp-pill cp-pill--accent" data-ov-sim="${esc(firstSim)}">⚡ Mô phỏng 2.5D</button>` : ''}
            ${firstCode ? `<button type="button" class="cp-pill" data-ov-code="${esc(firstCode)}">💻 Mã nguồn</button>` : ''}
          </div>
        </article>`;
    }).join('');

    ovEl.innerHTML = `
      <div class="cp-ov-inner">
        <div class="cp-ov-hero">
          <div class="cp-ov-eyebrow">
            <span>${esc(META.instructor)}</span> · <span>${META.credits} tín chỉ</span> · <span>${esc(META.platform)}</span> · <span>${esc(META.language)}</span>
          </div>
          <h2>${esc(META.title)}</h2>
          ${META.titleEn ? `<div class="cp-ov-en">${esc(META.titleEn)}</div>` : ''}
          ${META.bigQuestion ? `<div class="cp-ov-bigq"><b>Câu hỏi lớn của học phần:</b> ${esc(META.bigQuestion)}</div>` : ''}
          ${META.slogan ? `<p class="cp-ov-slogan">“${esc(META.slogan)}”</p>` : ''}
          <div class="cp-ov-cta">
            <button type="button" class="cp-pill cp-pill--primary" data-ov-lec="${esc((allParts[0] || {}).id || '')}">▶ Bắt đầu từ phần mở đầu</button>
            <button type="button" class="cp-pill cp-pill--accent" data-ov-mode="simulations">⚡ Khám phá ${META.simCount} mô phỏng 2.5D</button>
            <button type="button" class="cp-pill" data-ov-mode="diagrams">📐 ${META.figCount} sơ đồ &amp; ${META.glossaryCount} thuật ngữ</button>
            <button type="button" class="cp-pill" data-ov-mode="code">💻 ${META.codeCount} mã chạy được &amp; ${META.quizCount} câu ôn tập</button>
            ${META.starterRepoUrl ? `<a class="cp-pill" href="${esc(META.starterRepoUrl)}" target="_blank" rel="noopener">🚀 Repo bài tập mẫu ↗</a>` : ''}
          </div>
        </div>

        <div class="cp-ov-stats">
          <div class="cp-stat-card">
            <span class="cp-stat-card__k">Bài giảng &amp; Slides</span>
            <span class="cp-stat-card__v">${META.totalParts}</span>
            <span class="cp-stat-card__s">${doneCount > 0 ? `Đã xem ${doneCount}/${META.totalParts}` : `${META.totalTtsMin || META.totalPlanMin} phút học liệu`}</span>
          </div>
          <div class="cp-stat-card">
            <span class="cp-stat-card__k">Mô phỏng 2.5D</span>
            <span class="cp-stat-card__v">${META.simCount}</span>
            <span class="cp-stat-card__s">${META.simCount * 4} bước tương tác</span>
          </div>
          <div class="cp-stat-card">
            <span class="cp-stat-card__k">Sơ đồ &amp; Thuật ngữ</span>
            <span class="cp-stat-card__v">${META.figCount}</span>
            <span class="cp-stat-card__s">${META.glossaryCount} thuật ngữ chuẩn hóa</span>
          </div>
          <div class="cp-stat-card">
            <span class="cp-stat-card__k">Mã chạy được &amp; Ôn tập</span>
            <span class="cp-stat-card__v">${META.codeCount}</span>
            <span class="cp-stat-card__s">${META.quizCount} câu trắc nghiệm tự chấm</span>
          </div>
        </div>

        <div class="cp-ov-grid">${chCards}</div>
      </div>`;

    ovEl.querySelectorAll('[data-ov-lec]').forEach((b) =>
      b.addEventListener('click', () => openLecture(b.dataset.ovLec))
    );
    ovEl.querySelectorAll('[data-ov-sim]').forEach((b) =>
      b.addEventListener('click', () => openSimulation(b.dataset.ovSim, 0))
    );
    ovEl.querySelectorAll('[data-ov-code]').forEach((b) =>
      b.addEventListener('click', () => openCodeLab(b.dataset.ovCode))
    );
    ovEl.querySelectorAll('[data-ov-mode]').forEach((b) =>
      b.addEventListener('click', () => switchMode(b.dataset.ovMode))
    );
  }

  /* ========================================================================
   * MODE 2: 2.5D INTERACTIVE SIMULATIONS (NATIVE IsoStage)
   * ======================================================================== */
  function ensureStage() {
    if (stage || !global.IsoStage) return;
    const host = $('wb-stage-host');
    if (!host) return;
    stage = new global.IsoStage(host, { theme: state.theme });
    stage.onViewChange = (isZoomed) => {
      const btn = $('wb-reset-view');
      if (btn) btn.hidden = !isZoomed;
    };
  }

  function getSimLesson(id) {
    return (WB?.lessons || []).find((l) => l.id === id) || WB?.lessons?.[0] || null;
  }

  function openSimulation(lessonId, stepIdx = 0) {
    if (!WB) return;
    const lesson = getSimLesson(lessonId);
    if (!lesson) return;
    state.simLessonId = lesson.id;
    state.simStepIdx = Math.max(0, Math.min(lesson.steps.length - 1, stepIdx));
    if (state.simStepIdx === lesson.steps.length - 1) {
      state.simDone.add(lesson.id);
      saveSimDone();
    }
    if (state.mode !== 'simulations') {
      switchMode('simulations', false);
    } else {
      ensureStage();
      renderSimSidebar();
      renderSimLesson();
    }
    syncHash();
    setDrawer(false);
  }

  function renderSimSidebar() {
    if (!WB) return;
    const container = $('wb-sidebar-list');
    if (!container) return;
    const q = norm(state.simFilter);

    const total = WB.lessons.length;
    const done = state.simDone.size;
    if ($('wb-progress-count')) $('wb-progress-count').textContent = `${done}/${total} xong`;
    if ($('wb-progress-fill')) $('wb-progress-fill').style.width = `${total ? Math.round((done / total) * 100) : 0}%`;

    let html = '';
    for (const mod of WB.modules) {
      const items = WB.lessons.filter((l) => {
        if (l.ch !== mod.ch) return false;
        if (!q) return true;
        return norm(`${l.title} ${l.summary} ${l.ref} ${l.steps.map((s) => `${s.short} ${s.title}`).join(' ')}`).includes(q);
      });
      if (!items.length) continue;
      const isOpen = q ? true : !state.simCollapsed.has(mod.ch);
      html += `
        <div class="wb-ch-group${isOpen ? ' is-open' : ''}" data-ch="${mod.ch}">
          <button type="button" class="wb-ch-btn" data-toggle-sim-ch="${mod.ch}">
            <span class="wb-ch-chevron">▶</span>
            <span class="wb-ch-dot wb-ch-dot--${esc(mod.color || 'blue')}"></span>
            <span class="wb-ch-title">Ch.${mod.ch}: ${esc(mod.title)}</span>
            <span class="wb-ch-num">${items.length}</span>
          </button>
          <div class="wb-lesson-list">
            ${items.map((l) => {
              const isAct = l.id === state.simLessonId;
              const isDone = state.simDone.has(l.id);
              return `
                <button type="button" class="wb-lesson-item${isAct ? ' is-active' : ''}${isDone ? ' is-done' : ''}" data-sim-lesson="${esc(l.id)}">
                  <span class="wb-lesson-item__status">${isDone ? '✓' : ''}</span>
                  <span class="wb-lesson-item__meta">
                    <span class="wb-lesson-item__title">${esc(l.title)}</span>
                    <span class="wb-lesson-item__sub">${l.steps.length} bước · ${esc(l.level || 'Cơ bản')}</span>
                  </span>
                </button>`;
            }).join('')}
          </div>
        </div>`;
    }
    container.innerHTML = html || '<p style="padding:14px;font-size:12.5px;color:var(--wb-muted)">Không tìm thấy bài mô phỏng phù hợp.</p>';
    container.querySelectorAll('[data-toggle-sim-ch]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = Number(b.dataset.toggleSimCh);
        if (state.simCollapsed.has(c)) state.simCollapsed.delete(c);
        else state.simCollapsed.add(c);
        renderSimSidebar();
      })
    );
    container.querySelectorAll('[data-sim-lesson]').forEach((b) =>
      b.addEventListener('click', () => openSimulation(b.dataset.simLesson, 0))
    );
  }

  function renderSimLesson() {
    const lesson = getSimLesson(state.simLessonId);
    if (!lesson) return;
    const step = lesson.steps[state.simStepIdx] || lesson.steps[0];
    const totalSteps = lesson.steps.length;

    $('wb-lesson-crumb').textContent = lesson.ref || '';
    $('wb-lesson-title').textContent = lesson.title;
    $('wb-lesson-level').textContent = `${lesson.level} · ${totalSteps} bước`;

    const vbtn = $('wb-video-btn');
    const firstVid = lesson.videos && lesson.videos[0];
    if (vbtn && firstVid && partById[firstVid]) {
      vbtn.hidden = false;
      vbtn.textContent = '▶ Xem bài giảng gốc';
      vbtn.title = `Mở bài giảng: ${partById[firstVid].title}`;
      vbtn.onclick = () => openLecture(firstVid);
    } else if (vbtn) {
      vbtn.hidden = true;
    }

    $('wb-hud').innerHTML = (lesson.metrics || []).map((m) => {
      const v = (step.metrics || {})[m.id] || { val: '—', level: '' };
      const lvlCls = v.level ? ` wb-hud-card--${esc(v.level)}` : '';
      return `
        <div class="wb-hud-card${lvlCls}">
          <div class="wb-hud-card__label">${esc(m.label)}</div>
          <div class="wb-hud-card__val">${esc(v.val)}</div>
        </div>`;
    }).join('');

    const legendKeys = lesson.legend || ['req', 'res'];
    $('wb-legend').innerHTML = legendKeys
      .filter((k) => LEGEND_META[k])
      .map((k) => {
        const m = LEGEND_META[k];
        return `<span class="wb-legend-item"><span class="wb-legend-dot${m.sq ? ' wb-legend-dot--sq' : ''}" style="background:${m.color}"></span>${esc(m.label)}</span>`;
      }).join('');

    const pct = totalSteps > 1 ? Math.round((state.simStepIdx / (totalSteps - 1)) * 100) : 100;
    $('wb-timeline').innerHTML = `
      <div class="wb-timeline__head">
        <span class="wb-timeline__eyebrow">Trong bài này</span>
        <span class="wb-timeline__count">Bước ${state.simStepIdx + 1} / ${totalSteps}<span class="wb-timeline__hint"> · phím ← → · R phát lại · Space tạm dừng</span></span>
      </div>
      <div class="wb-timeline__track" style="--n:${totalSteps}">
        <div class="wb-timeline__rail" aria-hidden="true"><div class="wb-timeline__rail-fill" style="width:${pct}%"></div></div>
        <div class="wb-timeline__steps">
          ${lesson.steps.map((s, idx) => {
            const active = idx === state.simStepIdx;
            const visited = idx < state.simStepIdx;
            return `
              <button type="button" class="wb-step-pill${active ? ' is-active' : ''}${visited ? ' is-visited' : ''}" data-sim-step="${idx}" title="${esc(s.short)}">
                <span class="wb-step-pill__idx">${idx + 1}</span>
                <span class="wb-step-pill__label">${esc(s.short)}</span>
              </button>`;
          }).join('')}
        </div>
      </div>`;
    $('wb-timeline').querySelectorAll('[data-sim-step]').forEach((b) =>
      b.addEventListener('click', () => openSimulation(lesson.id, Number(b.dataset.simStep)))
    );

    const ph = step.chapter || 'setup';
    const pill = $('wb-phase-pill');
    pill.className = `wb-phase-pill wb-phase-pill--${ph}`;
    pill.textContent = `Bước ${state.simStepIdx + 1}/${totalSteps} · ${PHASE_LABEL[ph] || ph}`;
    $('wb-step-title').textContent = step.title;
    $('wb-step-body').innerHTML = (step.body || []).map((t) => `<p>${t}</p>`).join('');

    const callEl = $('wb-callout');
    if (step.callout && step.callout.text) {
      const k = step.callout.kind || 'insight';
      const tagText = k === 'warn' ? '⚠ Lưu ý kỹ thuật' : k === 'tip' ? '✓ Kinh nghiệm thực hành' : '💡 Điểm cốt lõi';
      callEl.hidden = false;
      callEl.className = `wb-callout wb-callout--${k}`;
      callEl.innerHTML = `<span class="wb-callout__tag">${tagText}</span><div>${step.callout.text}</div>`;
    } else {
      callEl.hidden = true;
    }

    const chEl = $('wb-changes');
    if (step.changes && step.changes.length) {
      chEl.hidden = false;
      chEl.innerHTML = `<div class="wb-section-lbl">Biến đổi ở bước này</div><ul>${step.changes.map((c) => {
        const s = String(c);
        const cls = s.startsWith('+') ? 'wb-change--add' : (s.startsWith('!') || s.startsWith('-')) ? 'wb-change--warn' : 'wb-change--mod';
        return `<li class="${cls}">${esc(s)}</li>`;
      }).join('')}</ul>`;
    } else {
      chEl.hidden = true;
    }

    const gEl = $('wb-goals');
    if (lesson.goals && lesson.goals.length) {
      gEl.hidden = false;
      gEl.innerHTML = `<div class="wb-section-lbl">Mục tiêu nắm vững</div><ul>${lesson.goals.map((g) => {
        const ok = state.simStepIdx >= (g.step ?? 0) || state.simDone.has(lesson.id);
        return `<li class="wb-goal${ok ? ' is-done' : ''}"><span class="wb-goal__chk">${ok ? '✓' : ''}</span><span>${esc(g.text)}</span></li>`;
      }).join('')}</ul>`;
    } else {
      gEl.hidden = true;
    }

    const lIdx = WB.lessons.findIndex((l) => l.id === lesson.id);
    const prevBtn = $('wb-prev-step');
    const nextBtn = $('wb-next-step');
    prevBtn.disabled = state.simStepIdx === 0 && lIdx === 0;
    if (state.simStepIdx < totalSteps - 1) {
      nextBtn.textContent = 'Bước tiếp →';
      nextBtn.disabled = false;
    } else if (lIdx < WB.lessons.length - 1) {
      nextBtn.textContent = 'Bài tiếp →';
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = 'Hoàn thành ✓';
      nextBtn.disabled = true;
    }

    if (stage && step.scene) stage.renderScene(step.scene);
    const rs = $('wb-rail-scroll');
    if (rs) rs.scrollTop = 0;
  }

  /* ── TTS for Mode 2 ── */
  function stopSpeech() {
    state.speaking = false;
    try { global.speechSynthesis?.cancel(); } catch (_) {}
    const btn = $('wb-tts-btn');
    if (btn) {
      btn.classList.remove('is-speaking');
      btn.textContent = '🔊 Đọc bước này';
    }
  }
  function toggleSpeech() {
    if (!global.speechSynthesis) return;
    if (state.speaking) { stopSpeech(); return; }
    const lesson = getSimLesson(state.simLessonId);
    const step = lesson?.steps[state.simStepIdx];
    if (!step) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = [step.title, ...(step.body || []), step.callout?.text || ''].join('. ');
    const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 1.02;
    u.onend = stopSpeech;
    u.onerror = stopSpeech;
    state.speaking = true;
    const btn = $('wb-tts-btn');
    if (btn) {
      btn.classList.add('is-speaking');
      btn.textContent = '⏹ Dừng đọc';
    }
    global.speechSynthesis.cancel();
    global.speechSynthesis.speak(u);
  }

  /* ========================================================================
   * MODE 3: MECHANISM SVG DIAGRAMS & GLOSSARY
   * ======================================================================== */
  function openDiagram(figId) {
    if (!figById[figId]) return;
    state.diagView = 'svg';
    state.figId = figId;
    state.figStep = 0;
    state.figZoom = 1;
    if (state.mode !== 'diagrams') {
      switchMode('diagrams', false);
    } else {
      renderDiagSidebar();
      renderDiagMain();
    }
    syncHash();
    setDrawer(false);
  }

  function renderDiagSidebar() {
    document.querySelectorAll('[data-diag-view]').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.diagView === state.diagView)
    );
    const tree = $('cp-diag-tree');
    if (!tree) return;
    const q = norm(state.diagFilter);

    if (state.diagView === 'glossary') {
      const hits = P.glossary.filter((g) => !q || norm(`${g.term} ${g.origin} ${g.meaning}`).includes(q));
      tree.innerHTML = `
        <div style="padding:8px 10px;font-size:12px;color:var(--wb-muted);line-height:1.5">
          Đang hiển thị <b>${hits.length} / ${P.glossary.length}</b> thuật ngữ chuẩn hóa của học phần <b>${esc(META.code)}</b>.
          Gõ vào ô lọc phía trên để tra nhanh theo tiếng Việt, tiếng Anh hoặc định nghĩa.
        </div>`;
      return;
    }

    // Group figures by chapter
    const byCh = new Map();
    for (const f of P.figures) {
      if (q && !norm(`${f.title} ${f.partTitle} ${f.aria} ${f.chTitle}`).includes(q)) continue;
      if (!byCh.has(f.ch)) byCh.set(f.ch, { ch: f.ch, title: f.ch > 0 ? `Chương ${f.ch}. ${f.chTitle}` : f.chTitle, items: [] });
      byCh.get(f.ch).items.push(f);
    }

    let html = '';
    for (const grp of byCh.values()) {
      const isCol = !q && state.diagCollapsed.has(grp.ch);
      html += `
        <div class="cp-group ${isCol ? 'is-collapsed' : ''}">
          <button type="button" class="cp-group__head" data-toggle-diag-ch="${grp.ch}">
            <span class="cp-group__chev">▾</span>
            <span class="cp-group__title">${esc(grp.title)}</span>
            <span class="cp-group__meta">${grp.items.length}</span>
          </button>
          <div class="cp-group__list">
            ${grp.items.map((f) => `
              <button type="button" class="cp-item ${f.id === state.figId ? 'is-active' : ''}" data-open-fig="${esc(f.id)}">
                <span class="cp-item__dot">${f.num}</span>
                <span class="cp-item__main">
                  <span class="cp-item__title">${esc(f.title)}</span>
                  <span class="cp-item__sub">
                    <span>${esc(f.partTitle)}</span>
                    ${f.maxStep > 1 ? `<span class="cp-mini-tag">${f.maxStep} bước</span>` : ''}
                  </span>
                </span>
              </button>`).join('')}
          </div>
        </div>`;
    }
    tree.innerHTML = html || '<p style="padding:14px;font-size:12.5px;color:var(--wb-muted)">Không tìm thấy sơ đồ phù hợp.</p>';
    tree.querySelectorAll('[data-toggle-diag-ch]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = Number(b.dataset.toggleDiagCh);
        if (state.diagCollapsed.has(c)) state.diagCollapsed.delete(c);
        else state.diagCollapsed.add(c);
        renderDiagSidebar();
      })
    );
    tree.querySelectorAll('[data-open-fig]').forEach((b) =>
      b.addEventListener('click', () => openDiagram(b.dataset.openFig))
    );
  }

  function renderDiagMain() {
    const svgView = $('cp-diag-svg-view');
    const glView = $('cp-glossary-view');

    if (state.diagView === 'glossary') {
      svgView.hidden = true;
      glView.hidden = false;
      const q = norm(state.diagFilter);
      const rows = P.glossary.filter((g) => !q || norm(`${g.term} ${g.origin} ${g.meaning}`).includes(q));
      glView.innerHTML = `
        <div class="cp-gloss-inner">
          <div class="cp-gloss-head">
            <h2>Bảng thuật ngữ chuẩn hóa (${rows.length}/${P.glossary.length})</h2>
            <a class="cp-pill" href="frame.html" target="_blank" rel="noopener">📖 Mở Bản khung &amp; Storyline đầy đủ ↗</a>
          </div>
          <table class="cp-gloss-table">
            <thead><tr><th style="width:24%">Thuật ngữ</th><th style="width:24%">Dạng gốc / Tiếng Anh</th><th>Định nghĩa</th></tr></thead>
            <tbody>
              ${rows.map((g) => `
                <tr>
                  <td class="cp-gloss-term">${esc(g.term)}</td>
                  <td class="cp-gloss-orig">${esc(g.origin || '—')}</td>
                  <td>${esc(g.meaning)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      return;
    }

    svgView.hidden = false;
    glView.hidden = true;
    const f = figById[state.figId] || P.figures[0];
    if (!f) return;
    state.figId = f.id;
    const idx = P.figures.findIndex((x) => x.id === f.id);

    $('cp-diag-crumb').textContent = `${f.ch > 0 ? `Chương ${f.ch}` : 'Mở đầu/Kết thúc'} · ${f.partTitle} · Sơ đồ #${f.num}/${P.figures.length}`;
    $('cp-diag-title').textContent = f.title;
    $('cp-diag-actions').innerHTML = `
      <button type="button" class="cp-pill" id="cp-fig-zout" title="Thu nhỏ">−</button>
      <button type="button" class="cp-pill" id="cp-fig-zreset" title="100%">${Math.round(state.figZoom * 100)}%</button>
      <button type="button" class="cp-pill" id="cp-fig-zin" title="Phóng to">+</button>
      <button type="button" class="cp-pill cp-pill--primary" id="cp-fig-go-lec">▶ Xem bài giảng</button>
      ${f.simId ? `<button type="button" class="cp-pill cp-pill--accent" id="cp-fig-go-sim">⚡ Mô phỏng 2.5D</button>` : ''}`;

    const applyZoom = () => {
      const card = $('cp-svg-card');
      if (card) card.style.transform = `scale(${state.figZoom})`;
      const zr = $('cp-fig-zreset');
      if (zr) zr.textContent = `${Math.round(state.figZoom * 100)}%`;
    };
    $('cp-fig-zout')?.addEventListener('click', () => { state.figZoom = Math.max(0.6, +(state.figZoom - 0.15).toFixed(2)); applyZoom(); });
    $('cp-fig-zin')?.addEventListener('click', () => { state.figZoom = Math.min(1.6, +(state.figZoom + 0.15).toFixed(2)); applyZoom(); });
    $('cp-fig-zreset')?.addEventListener('click', () => { state.figZoom = 1; applyZoom(); });
    $('cp-fig-go-lec')?.addEventListener('click', () => openLecture(f.partId));
    $('cp-fig-go-sim')?.addEventListener('click', () => openSimulation(f.simId, 0));

    // Render SVG (lazy-load figures-data.js)
    const card = $('cp-svg-card');
    card.style.transform = `scale(${state.figZoom})`;
    card.innerHTML = '<p style="text-align:center;padding:30px;color:#6f6961">Đang nạp sơ đồ vector...</p>';
    loadScriptOnce('portal/figures-data.js', 'COURSE_FIGURES').then((map) => {
      if (state.figId !== f.id) return;
      card.innerHTML = (map && map[f.id]) || '<p>Không tìm thấy tệp SVG.</p>';
      applySvgStep(f.maxStep);
    }).catch((err) => {
      card.innerHTML = `<p style="color:#c0392b">${esc(err.message)}</p>`;
    });

    // Progressive steps bar
    const stepsBar = $('cp-diag-steps');
    if (f.maxStep > 1) {
      stepsBar.hidden = false;
      let btns = `<button type="button" class="cp-step-chip ${state.figStep === 0 ? 'is-active' : ''}" data-fig-step="0">Tất cả (${f.maxStep} bước)</button>`;
      for (let s = 1; s <= f.maxStep; s++) {
        btns += `<button type="button" class="cp-step-chip ${state.figStep === s ? 'is-active' : ''}" data-fig-step="${s}">Bước ${s}</button>`;
      }
      stepsBar.innerHTML = btns;
      stepsBar.querySelectorAll('[data-fig-step]').forEach((b) =>
        b.addEventListener('click', () => {
          state.figStep = Number(b.dataset.figStep);
          stepsBar.querySelectorAll('[data-fig-step]').forEach((x) =>
            x.classList.toggle('is-active', Number(x.dataset.figStep) === state.figStep)
          );
          applySvgStep(f.maxStep);
        })
      );
    } else {
      stepsBar.hidden = true;
    }

    // Info rail
    $('cp-diag-info').innerHTML = `
      <div class="cp-diag-info-card">
        <div class="cp-info-box">
          <h3>MÔ TẢ CƠ CHẾ</h3>
          <p>${esc(f.aria || f.title)}</p>
        </div>
        ${f.takeaways && f.takeaways.length ? `
          <div class="cp-info-box">
            <h3>KẾT LUẬN TRỌNG TÂM</h3>
            <ul>${f.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>` : ''}
        <div class="cp-info-box">
          <h3>NGUỒN BÀI GIẢNG</h3>
          <p><b>${esc(f.partTitle)}</b> (${f.ch > 0 ? `Chương ${f.ch}: ${esc(f.chTitle)}` : esc(f.chTitle)})</p>
          ${f.maxStep > 1 ? `<p style="margin-top:6px;font-size:12px;color:var(--wb-muted)">Sơ đồ gồm <b>${f.maxStep} lớp hiện dần</b> — bấm từng bước ở thanh dưới để quan sát tuần tự.</p>` : ''}
        </div>
      </div>`;

    const prevB = $('cp-prev-diag');
    const nextB = $('cp-next-diag');
    prevB.disabled = idx <= 0;
    nextB.disabled = idx >= P.figures.length - 1;
    prevB.onclick = () => idx > 0 && openDiagram(P.figures[idx - 1].id);
    nextB.onclick = () => idx < P.figures.length - 1 && openDiagram(P.figures[idx + 1].id);
  }

  function applySvgStep(maxStep) {
    const svg = $('cp-svg-card')?.querySelector('svg');
    if (!svg || maxStep <= 1) return;
    svg.querySelectorAll('[data-s]').forEach((el) => {
      const s = Number(el.getAttribute('data-s') || '0');
      el.classList.toggle('cp-step-dim', state.figStep > 0 && s > state.figStep);
    });
  }

  /* ========================================================================
   * MODE 4: CODE LABS & INTERACTIVE CHAPTER QUIZZES
   * ======================================================================== */
  function openCodeLab(codeId) {
    if (!codeById[codeId]) return;
    state.codeView = 'labs';
    state.codeId = codeId;
    state.codeTabKey = 'readme';
    if (state.mode !== 'code') {
      switchMode('code', false);
    } else {
      renderCodeSidebar();
      renderCodeMain();
    }
    syncHash();
    setDrawer(false);
  }

  function renderCodeSidebar() {
    document.querySelectorAll('[data-code-view]').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.codeView === state.codeView)
    );
    const tree = $('cp-code-tree');
    if (!tree) return;
    const q = norm(state.codeFilter);

    if (state.codeView === 'quiz') {
      tree.innerHTML = (P.quizzes || []).map((g) => {
        const answered = g.questions.filter((_, i) => state.quizAnswers[`${g.ch}:${i}`]).length;
        return `
          <button type="button" class="cp-item ${g.ch === state.quizCh ? 'is-active' : ''}" data-open-quiz="${g.ch}">
            <span class="cp-item__dot">${g.ch}</span>
            <span class="cp-item__main">
              <span class="cp-item__title">Chương ${g.ch}. ${esc(g.chTitle)}</span>
              <span class="cp-item__sub">
                <span>${g.questions.length} câu hỏi</span>
                ${answered > 0 ? `<span class="cp-mini-tag">Đã làm ${answered}/${g.questions.length}</span>` : ''}
              </span>
            </span>
          </button>`;
      }).join('');
      tree.querySelectorAll('[data-open-quiz]').forEach((b) =>
        b.addEventListener('click', () => {
          state.quizCh = Number(b.dataset.openQuiz);
          renderCodeSidebar();
          renderCodeMain();
          syncHash();
          setDrawer(false);
        })
      );
      return;
    }

    const byCh = new Map();
    for (const c of P.codeLabs) {
      if (q && !norm(`${c.partTitle} ${c.relPath} ${(c.fileNames || []).join(' ')} ${c.chTitle}`).includes(q)) continue;
      if (!byCh.has(c.ch)) byCh.set(c.ch, { ch: c.ch, title: `Chương ${c.ch}. ${c.chTitle}`, items: [] });
      byCh.get(c.ch).items.push(c);
    }

    let html = '';
    for (const grp of byCh.values()) {
      const isCol = !q && state.codeCollapsed.has(grp.ch);
      html += `
        <div class="cp-group ${isCol ? 'is-collapsed' : ''}">
          <button type="button" class="cp-group__head" data-toggle-code-ch="${grp.ch}">
            <span class="cp-group__chev">▾</span>
            <span class="cp-group__title">${esc(grp.title)}</span>
            <span class="cp-group__meta">${grp.items.length}</span>
          </button>
          <div class="cp-group__list">
            ${grp.items.map((c) => `
              <button type="button" class="cp-item ${c.id === state.codeId ? 'is-active' : ''}" data-open-code="${esc(c.id)}">
                <span class="cp-item__dot">${c.pos}</span>
                <span class="cp-item__main">
                  <span class="cp-item__title">${esc(c.partTitle)}</span>
                  <span class="cp-item__sub">
                    <span>${c.fileCount} tệp mã</span>
                    ${c.resultCount ? `<span class="cp-mini-tag">${c.resultCount} kết quả</span>` : ''}
                  </span>
                </span>
              </button>`).join('')}
          </div>
        </div>`;
    }
    tree.innerHTML = html || '<p style="padding:14px;font-size:12.5px;color:var(--wb-muted)">Không tìm thấy thư mục mã phù hợp.</p>';
    tree.querySelectorAll('[data-toggle-code-ch]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = Number(b.dataset.toggleCodeCh);
        if (state.codeCollapsed.has(c)) state.codeCollapsed.delete(c);
        else state.codeCollapsed.add(c);
        renderCodeSidebar();
      })
    );
    tree.querySelectorAll('[data-open-code]').forEach((b) =>
      b.addEventListener('click', () => openCodeLab(b.dataset.openCode))
    );
  }

  function renderCodeMain() {
    const labsView = $('cp-code-labs-view');
    const quizView = $('cp-quiz-view');

    if (state.codeView === 'quiz') {
      labsView.hidden = true;
      quizView.hidden = false;
      renderQuizView();
      return;
    }

    labsView.hidden = false;
    quizView.hidden = true;
    const c = codeById[state.codeId] || P.codeLabs[0];
    if (!c) return;
    state.codeId = c.id;

    $('cp-code-crumb').textContent = `Chương ${c.ch} · ${c.relPath}`;
    $('cp-code-title').textContent = c.partTitle;
    $('cp-code-actions').innerHTML = `
      <button type="button" class="cp-pill cp-pill--primary" id="cp-code-go-lec">▶ Xem bài giảng</button>
      ${c.simId ? `<button type="button" class="cp-pill cp-pill--accent" id="cp-code-go-sim">⚡ Mô phỏng 2.5D</button>` : ''}
      ${c.githubUrl ? `<a class="cp-pill" href="${esc(c.githubUrl)}" target="_blank" rel="noopener">↗ Mở trên GitHub</a>` : ''}`;
    $('cp-code-go-lec')?.addEventListener('click', () => openLecture(c.partId));
    $('cp-code-go-sim')?.addEventListener('click', () => openSimulation(c.simId, 0));

    $('cp-code-banner').innerHTML = `
      <span><b>Môi trường chạy:</b> ${esc(META.environment || META.platform)}</span>
      <span style="display:flex;gap:8px;flex-wrap:wrap">
        ${META.starterRepoUrl ? `<a class="cp-pill cp-pill--accent" href="${esc(META.starterRepoUrl)}" target="_blank" rel="noopener">🚀 Repo bài tập mẫu (${esc(META.starterRepoName)}) ↗</a>` : ''}
        ${META.repoUrl ? `<a class="cp-pill" href="${esc(META.repoUrl)}" target="_blank" rel="noopener">📦 Toàn bộ repo học phần ↗</a>` : ''}
      </span>`;

    const bodyEl = $('cp-code-body');
    const tabsEl = $('cp-code-tabs');
    bodyEl.innerHTML = '<p style="text-align:center;padding:30px;color:var(--wb-muted)">Đang nạp mã nguồn...</p>';

    loadScriptOnce('portal/code-data.js', 'COURSE_CODE').then((map) => {
      if (state.codeId !== c.id) return;
      const pack = (map && map[c.id]) || { readme: '', files: [], results: [] };
      const tabs = [];
      if (pack.readme) tabs.push({ key: 'readme', label: '📘 README.md', kind: 'readme', content: pack.readme, path: 'README.md' });
      pack.files.forEach((f, i) => tabs.push({ key: `f:${i}`, label: f.name, kind: 'code', lang: f.lang, content: f.content, path: f.path }));
      pack.results.forEach((r, i) => tabs.push({ key: `r:${i}`, label: `🖥 ${r.name}`, kind: 'result', content: r.content, path: r.path }));

      if (!tabs.some((t) => t.key === state.codeTabKey) && tabs.length) {
        state.codeTabKey = tabs[0].key;
      }

      const drawActive = () => {
        tabsEl.innerHTML = tabs.map((t) =>
          `<button type="button" class="cp-file-tab ${t.kind === 'result' ? 'cp-file-tab--res' : ''} ${t.key === state.codeTabKey ? 'is-active' : ''}" data-ctab="${esc(t.key)}" title="${esc(t.path)}">${esc(t.label)}</button>`
        ).join('');
        tabsEl.querySelectorAll('[data-ctab]').forEach((b) =>
          b.addEventListener('click', () => { state.codeTabKey = b.dataset.ctab; drawActive(); })
        );

        const cur = tabs.find((t) => t.key === state.codeTabKey) || tabs[0];
        if (!cur) { bodyEl.innerHTML = '<p>Chưa có tệp mã nguồn.</p>'; return; }
        if (cur.kind === 'readme') {
          bodyEl.innerHTML = `
            <div class="cp-code-card">
              <div class="cp-code-card__head"><span>${esc(c.relPath)}/README.md</span><span>Hướng dẫn chạy</span></div>
              <div class="cp-readme">${renderMarkdownLite(cur.content)}</div>
            </div>`;
        } else {
          const highlighted = cur.kind === 'code' ? highlightCode(cur.content, cur.lang) : esc(cur.content);
          bodyEl.innerHTML = `
            <div class="cp-code-card">
              <div class="cp-code-card__head">
                <span>${esc(c.relPath)}/${esc(cur.path)}</span>
                <button type="button" class="cp-pill" id="cp-copy-code">📋 Sao chép</button>
              </div>
              <pre class="cp-code-pre"><code>${highlighted}</code></pre>
            </div>`;
          $('cp-copy-code')?.addEventListener('click', () => {
            const btn = $('cp-copy-code');
            navigator.clipboard?.writeText(cur.content).then(() => {
              btn.textContent = '✓ Đã sao chép!';
              setTimeout(() => { btn.textContent = '📋 Sao chép'; }, 1500);
            }).catch(() => {});
          });
        }
      };
      drawActive();
    }).catch((err) => {
      bodyEl.innerHTML = `<p style="color:#c0392b">${esc(err.message)}</p>`;
    });
  }

  function highlightCode(src, lang) {
    const code = esc(src);
    if (lang !== 'java' && lang !== 'c' && lang !== 'proto') return code;
    const kwRe = lang === 'java'
      ? /\b(public|private|protected|class|interface|record|enum|extends|implements|static|final|void|return|new|try|catch|finally|throw|throws|if|else|for|while|switch|case|default|break|continue|import|package|var|int|long|double|boolean|byte|char|true|false|null|synchronized|volatile)\b/g
      : lang === 'c'
        ? /\b(int|long|short|char|float|double|void|unsigned|signed|const|static|struct|typedef|enum|union|sizeof|return|if|else|for|while|do|switch|case|default|break|continue|NULL|size_t|bool|true|false)\b/g
        : /\b(syntax|package|option|service|rpc|returns|message|repeated|stream|int32|int64|string|bool|double|bytes)\b/g;
    // Highlight comments & strings first via single-pass tokenizer
    return code.replace(
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;|'(?:\\.|[^'])*?')/g,
      (m) => m.startsWith('/') ? `<span class="tok-com">${m}</span>` : `<span class="tok-str">${m}</span>`
    ).replace(/(<span[^>]*>[\s\S]*?<\/span>)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g, (m, span, num, word) => {
      if (span) return span;
      if (num) return `<span class="tok-num">${num}</span>`;
      if (word && kwRe.test(word)) { kwRe.lastIndex = 0; return `<span class="tok-kw">${word}</span>`; }
      return m;
    });
  }

  function renderMarkdownLite(md) {
    const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    let out = '', inPre = false, inUl = false;
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    for (const raw of lines) {
      if (raw.trim().startsWith('```')) {
        if (inUl) { out += '</ul>'; inUl = false; }
        out += inPre ? '</code></pre>' : '<pre><code>';
        inPre = !inPre;
        continue;
      }
      if (inPre) { out += esc(raw) + '\n'; continue; }
      const t = raw.trim();
      if (!t) { if (inUl) { out += '</ul>'; inUl = false; } continue; }
      if (t.startsWith('### ')) { if (inUl) { out += '</ul>'; inUl = false; } out += `<h3>${inline(t.slice(4))}</h3>`; }
      else if (t.startsWith('## ')) { if (inUl) { out += '</ul>'; inUl = false; } out += `<h2>${inline(t.slice(3))}</h2>`; }
      else if (t.startsWith('# ')) { if (inUl) { out += '</ul>'; inUl = false; } out += `<h1>${inline(t.slice(2))}</h1>`; }
      else if (t.startsWith('- ') || t.startsWith('* ')) {
        if (!inUl) { out += '<ul>'; inUl = true; }
        out += `<li>${inline(t.slice(2))}</li>`;
      } else {
        if (inUl) { out += '</ul>'; inUl = false; }
        out += `<p>${inline(t)}</p>`;
      }
    }
    if (inUl) out += '</ul>';
    if (inPre) out += '</code></pre>';
    return out;
  }

  function renderQuizView() {
    const quizView = $('cp-quiz-view');
    const grp = (P.quizzes || []).find((g) => g.ch === state.quizCh) || P.quizzes?.[0];
    if (!grp) { quizView.innerHTML = '<p style="padding:20px">Chưa có bộ câu hỏi ôn tập.</p>'; return; }

    let correct = 0, answered = 0;
    grp.questions.forEach((q, i) => {
      const pick = state.quizAnswers[`${grp.ch}:${i}`];
      if (pick) {
        answered++;
        if (pick === q.ans) correct++;
      }
    });

    quizView.innerHTML = `
      <div class="cp-quiz-inner">
        <div class="cp-quiz-head">
          <div>
            <span class="cp-crumb">ÔN TẬP CHƯƠNG ${grp.ch} · ${grp.questions.length} CÂU TRẮC NGHIỆM</span>
            <h2 style="font-size:18px;font-weight:800">${esc(grp.chTitle)}</h2>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="cp-pill ${answered ? 'cp-pill--primary' : ''}">Kết quả: ${correct} / ${answered} đúng</span>
            <button type="button" class="cp-pill" id="cp-quiz-reset">↻ Làm lại chương</button>
          </div>
        </div>
        ${grp.questions.map((q, i) => {
          const key = `${grp.ch}:${i}`;
          const pick = state.quizAnswers[key] || '';
          return `
            <article class="cp-quiz-card">
              <div class="cp-quiz-qhead">
                <div class="cp-quiz-q">Câu ${i + 1}. ${esc(q.q)}</div>
                ${q.level ? `<span class="cp-quiz-lvl">${esc(q.level)}</span>` : ''}
              </div>
              <div class="cp-quiz-opts">
                ${['A', 'B', 'C', 'D'].map((k) => {
                  let cls = '';
                  if (pick) {
                    if (k === q.ans) cls = 'is-correct';
                    else if (k === pick) cls = 'is-wrong';
                  }
                  return `
                    <button type="button" class="cp-quiz-opt ${cls}" data-qkey="${esc(key)}" data-qopt="${k}" ${pick ? 'disabled' : ''}>
                      <span class="cp-quiz-opt__k">${k}</span>
                      <span>${esc(q.opts[k])}</span>
                    </button>`;
                }).join('')}
              </div>
              ${pick ? `<div class="cp-quiz-explain"><b>${pick === q.ans ? '✓ Chính xác!' : `✗ Đáp án đúng là ${q.ans}.`}</b> ${esc(q.explain)}</div>` : ''}
            </article>`;
        }).join('')}
      </div>`;

    quizView.querySelectorAll('[data-qkey]').forEach((b) =>
      b.addEventListener('click', () => {
        state.quizAnswers[b.dataset.qkey] = b.dataset.qopt;
        renderCodeSidebar();
        renderQuizView();
      })
    );
    $('cp-quiz-reset')?.addEventListener('click', () => {
      grp.questions.forEach((_, i) => delete state.quizAnswers[`${grp.ch}:${i}`]);
      renderCodeSidebar();
      renderQuizView();
    });
  }

  /* ========================================================================
   * UNIFIED CTRL+K COMMAND PALETTE
   * ======================================================================== */
  function openSearch() {
    $('cp-search-modal').hidden = false;
    const inp = $('cp-search-input');
    inp.value = '';
    state.searchSel = 0;
    renderSearch('');
    setTimeout(() => inp.focus(), 10);
  }
  function closeSearch() {
    $('cp-search-modal').hidden = true;
  }

  function renderSearch(rawQ) {
    const q = norm(rawQ.trim());
    const hits = [];

    for (const p of allParts) {
      if (!q || norm(`${p.title} ${p.goal} ${p.chTitle}`).includes(q)) {
        hits.push({ badge: 'Bài giảng', title: p.title, sub: p.chTitle, run: () => openLecture(p.id) });
      }
    }
    for (const l of WB?.lessons || []) {
      if (!q || norm(`${l.title} ${l.summary} ${l.ref}`).includes(q)) {
        hits.push({ badge: 'Mô phỏng 2.5D', title: l.title, sub: l.ref, run: () => openSimulation(l.id, 0) });
      }
      if (q) {
        l.steps.forEach((s, si) => {
          if (norm(`${s.short} ${s.title}`).includes(q)) {
            hits.push({ badge: 'Bước mô phỏng', title: `${l.title} → ${s.short}`, sub: s.title, run: () => openSimulation(l.id, si) });
          }
        });
      }
    }
    for (const f of P.figures || []) {
      if (!q || norm(`${f.title} ${f.partTitle} ${f.aria}`).includes(q)) {
        hits.push({ badge: 'Sơ đồ SVG', title: f.title, sub: f.partTitle, run: () => openDiagram(f.id) });
      }
    }
    for (const c of P.codeLabs || []) {
      if (!q || norm(`${c.partTitle} ${c.relPath} ${(c.fileNames || []).join(' ')}`).includes(q)) {
        hits.push({ badge: 'Mã nguồn', title: c.partTitle, sub: c.relPath, run: () => openCodeLab(c.id) });
      }
    }
    if (q) {
      for (const g of P.glossary || []) {
        if (norm(`${g.term} ${g.origin} ${g.meaning}`).includes(q)) {
          hits.push({
            badge: 'Thuật ngữ',
            title: `${g.term}${g.origin ? ` (${g.origin})` : ''}`,
            sub: g.meaning.slice(0, 90),
            run: () => {
              state.diagView = 'glossary';
              state.diagFilter = g.term;
              if ($('cp-diag-filter')) $('cp-diag-filter').value = g.term;
              switchMode('diagrams');
            }
          });
        }
      }
    }

    state.searchHits = hits.slice(0, 32);
    state.searchSel = Math.min(state.searchSel, Math.max(0, state.searchHits.length - 1));
    const resEl = $('cp-search-results');
    resEl.innerHTML = state.searchHits.map((h, i) => `
      <button type="button" class="wb-search-hit ${i === state.searchSel ? 'is-sel' : ''}" data-sidx="${i}">
        <span class="wb-search-hit__top"><span class="cp-mini-tag" style="margin-right:6px">${esc(h.badge)}</span>${esc(h.title)}</span>
        <span class="wb-search-hit__sub">${esc(h.sub)}</span>
      </button>`).join('') || '<p style="padding:14px;font-size:13px;color:var(--wb-muted)">Không tìm thấy kết quả phù hợp.</p>';

    resEl.querySelectorAll('[data-sidx]').forEach((b) =>
      b.addEventListener('click', () => {
        const hit = state.searchHits[Number(b.dataset.sidx)];
        closeSearch();
        if (hit) hit.run();
      })
    );
  }

  /* ── Internal QA Modal (debug only) ── */
  function openQaModal() {
    if (!P.qa) return;
    $('cp-qa-body').innerHTML = `
      <div>
        <h3 style="margin:0 0 8px;font-size:14px">Định mức chất lượng (${P.qa.quotas.length} chỉ tiêu)</h3>
        <table class="cp-qa-table">
          <thead><tr><th>Mã</th><th>Yêu cầu</th><th>Định mức</th><th>Kế hoạch</th><th>Hiện có</th><th>Kết quả</th></tr></thead>
          <tbody>${P.qa.quotas.map((r) => `<tr><td>${esc(r.ma)}</td><td>${esc(r.yeu_cau)}</td><td>${esc(r.muc)}</td><td>${esc(r.ke_hoach)}</td><td>${esc(r.hien_co)}</td><td><b>${esc(r.ket_qua)}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div>
        <h3 style="margin:0 0 8px;font-size:14px">Hồ sơ bàn giao QĐ 2830 (${P.qa.deliverables.length} hạng mục)</h3>
        <table class="cp-qa-table">
          <thead><tr><th>Mã</th><th>Hạng mục</th><th>Định dạng</th><th>Trạng thái</th></tr></thead>
          <tbody>${P.qa.deliverables.map((r) => `<tr><td>${esc(r.ma)}</td><td>${esc(r.hang_muc)}</td><td>${esc(r.dinh_dang)}</td><td>${esc(r.trang_thai)}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
    $('cp-qa-modal').hidden = false;
  }

  /* ── Route Hash Initialization ── */
  function applyHashRoute() {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw || raw === 'overview') {
      state.lectureView = 'overview';
      switchMode('lectures', false);
      return;
    }
    const [head, arg1, arg2] = raw.split('/');
    if (head === 'lectures') {
      state.lectureView = arg1 && partById[arg1] ? arg1 : 'overview';
      switchMode('lectures', false);
    } else if (head === 'simulations' || head === 'workbench') {
      if (arg1 && getSimLesson(arg1)) state.simLessonId = arg1;
      state.simStepIdx = Math.max(0, Number(arg2) || 0);
      switchMode('simulations', false);
    } else if (head === 'diagrams') {
      state.diagView = 'svg';
      if (arg1 && figById[arg1]) state.figId = arg1;
      switchMode('diagrams', false);
    } else if (head === 'glossary') {
      state.diagView = 'glossary';
      switchMode('diagrams', false);
    } else if (head === 'code') {
      state.codeView = 'labs';
      const cid = [arg1, arg2, raw.split('/').slice(3).join('/')].filter(Boolean).join('/');
      if (cid && codeById[cid]) state.codeId = cid;
      switchMode('code', false);
    } else if (head === 'quiz') {
      state.codeView = 'quiz';
      if (arg1 && Number(arg1)) state.quizCh = Number(arg1);
      switchMode('code', false);
    } else if (partById[head]) {
      state.lectureView = head;
      switchMode('lectures', false);
    } else {
      state.lectureView = 'overview';
      switchMode('lectures', false);
    }
  }

  /* ── Event Wiring ── */
  function bindEvents() {
    document.querySelectorAll('.cp-nav__item').forEach((btn) =>
      btn.addEventListener('click', () => switchMode(btn.dataset.mode))
    );
    document.querySelectorAll('[data-jump-mode]').forEach((btn) =>
      btn.addEventListener('click', () => switchMode(btn.dataset.jumpMode))
    );
    $('cp-brand-home')?.addEventListener('click', (e) => {
      e.preventDefault();
      state.lectureView = 'overview';
      switchMode('lectures');
    });
    $('cp-open-overview')?.addEventListener('click', () => {
      state.lectureView = 'overview';
      switchMode('lectures');
    });

    $('cp-theme-btn')?.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
    $('cp-menu-btn')?.addEventListener('click', () => setDrawer(true));
    $('cp-sidebar-close')?.addEventListener('click', () => setDrawer(false));
    $('cp-drawer-backdrop')?.addEventListener('click', () => setDrawer(false));

    $('cp-lec-filter')?.addEventListener('input', (e) => { state.lecFilter = e.target.value; renderLectureSidebar(); });
    $('wb-filter-input')?.addEventListener('input', (e) => { state.simFilter = e.target.value; renderSimSidebar(); });
    $('cp-diag-filter')?.addEventListener('input', (e) => {
      state.diagFilter = e.target.value;
      renderDiagSidebar();
      if (state.diagView === 'glossary') renderDiagMain();
    });
    $('cp-code-filter')?.addEventListener('input', (e) => { state.codeFilter = e.target.value; renderCodeSidebar(); });

    document.querySelectorAll('[data-diag-view]').forEach((b) =>
      b.addEventListener('click', () => {
        state.diagView = b.dataset.diagView;
        renderDiagSidebar();
        renderDiagMain();
        syncHash();
      })
    );
    document.querySelectorAll('[data-code-view]').forEach((b) =>
      b.addEventListener('click', () => {
        state.codeView = b.dataset.codeView;
        renderCodeSidebar();
        renderCodeMain();
        syncHash();
      })
    );

    // Mode 2 simulation controls
    $('wb-prev-step')?.addEventListener('click', () => {
      const lesson = getSimLesson(state.simLessonId);
      if (!lesson) return;
      if (state.simStepIdx > 0) openSimulation(lesson.id, state.simStepIdx - 1);
      else {
        const li = WB.lessons.findIndex((l) => l.id === lesson.id);
        if (li > 0) openSimulation(WB.lessons[li - 1].id, WB.lessons[li - 1].steps.length - 1);
      }
    });
    $('wb-next-step')?.addEventListener('click', () => {
      const lesson = getSimLesson(state.simLessonId);
      if (!lesson) return;
      if (state.simStepIdx < lesson.steps.length - 1) openSimulation(lesson.id, state.simStepIdx + 1);
      else {
        const li = WB.lessons.findIndex((l) => l.id === lesson.id);
        if (li < WB.lessons.length - 1) openSimulation(WB.lessons[li + 1].id, 0);
      }
    });
    $('wb-replay-btn')?.addEventListener('click', () => stage && stage.replay());
    $('wb-pause-btn')?.addEventListener('click', () => {
      if (!stage) return;
      const p = stage.setPaused(!stage.paused);
      $('wb-pause-btn').textContent = p ? '▶ Tiếp tục' : '⏸ Tạm dừng';
    });
    $('wb-reset-view')?.addEventListener('click', () => stage && stage.fit(true));
    $('wb-tts-btn')?.addEventListener('click', toggleSpeech);

    // Search modal
    $('cp-search-btn')?.addEventListener('click', openSearch);
    $('cp-search-modal')?.addEventListener('click', (e) => { if (e.target === $('cp-search-modal')) closeSearch(); });
    $('cp-search-input')?.addEventListener('input', (e) => { state.searchSel = 0; renderSearch(e.target.value); });
    $('cp-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); state.searchSel = Math.min(state.searchHits.length - 1, state.searchSel + 1); renderSearch(e.target.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); state.searchSel = Math.max(0, state.searchSel - 1); renderSearch(e.target.value); }
      else if (e.key === 'Enter' && state.searchHits[state.searchSel]) { e.preventDefault(); const h = state.searchHits[state.searchSel]; closeSearch(); h.run(); }
    });

    // QA modal
    $('cp-qa-btn')?.addEventListener('click', openQaModal);
    $('cp-qa-close')?.addEventListener('click', () => { $('cp-qa-modal').hidden = true; });
    $('cp-qa-modal')?.addEventListener('click', (e) => { if (e.target === $('cp-qa-modal')) $('cp-qa-modal').hidden = true; });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if ($('cp-search-modal').hidden) openSearch(); else closeSearch();
        return;
      }
      if (e.key === 'Escape') {
        closeSearch();
        if ($('cp-qa-modal')) $('cp-qa-modal').hidden = true;
        setDrawer(false);
        return;
      }
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (!$('cp-search-modal').hidden) return;
      if (state.mode === 'simulations') {
        if (e.key === 'ArrowRight') { e.preventDefault(); $('wb-next-step')?.click(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); $('wb-prev-step')?.click(); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); stage && stage.replay(); }
        else if (e.key === ' ') { e.preventDefault(); $('wb-pause-btn')?.click(); }
      }
    });

    // Listen for watched progress from embedded lecture iframe
    global.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'PROGRESS_UPDATE') {
        renderLectureSidebar();
        if (state.lectureView !== 'overview') {
          const btn = $('cp-toggle-done');
          if (btn) { btn.classList.add('cp-pill--primary'); btn.textContent = '✓ Đã xem'; }
        }
      }
    });

    global.addEventListener('hashchange', applyHashRoute);
  }

  function boot() {
    loadSimDone();
    applyTheme(state.theme);
    bindEvents();
    applyHashRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
