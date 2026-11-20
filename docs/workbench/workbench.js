/* ============================================================================
 * workbench.js — Course-Agnostic 3-Column Interactive 2.5D Workbench Controller
 * Shared across elearning-v2 courses (INT1433, INT11117, ...).
 * Consumes window.ELEARNING_COURSE (generated/authored per course).
 * ============================================================================ */
(function (global) {
  'use strict';

  const COURSE = global.ELEARNING_COURSE;
  if (!COURSE || !Array.isArray(COURSE.lessons) || !COURSE.lessons.length) {
    console.error('[Workbench] Missing window.ELEARNING_COURSE dataset.');
    return;
  }

  const STORAGE_THEME = 'ide-theme';
  const STORAGE_DONE = `bgs_wb_done_${COURSE.courseId}`;
  const STORAGE_LAST = `bgs_wb_last_${COURSE.courseId}`;

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const PHASE_LABEL = {
    setup:     'Khởi tạo',
    problem:   'Vấn đề',
    technique: 'Cơ chế',
    scale:     'Mở rộng & Tối ưu',
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
    poison: { label: 'Gói lỗi',       color: '#dc2626', sq: true  }
  };

  const state = {
    theme: 'light',
    openChs: new Set((COURSE.modules || []).map((m) => m.ch)),
    lessonId: COURSE.lessons[0].id,
    stepIdx: 0,
    visitedSteps: new Set([0]),
    prevMetrics: {},
    doneLessons: new Set(),
    filterText: '',
    drawerOpen: false,
    speaking: false,
    searchOpen: false,
    searchResults: [],
    searchSelIdx: 0
  };

  let stage = null;

  function loadPersisted() {
    try {
      const t = localStorage.getItem(STORAGE_THEME);
      if (t === 'dark' || t === 'light') state.theme = t;
      const doneRaw = localStorage.getItem(STORAGE_DONE);
      if (doneRaw) {
        const arr = JSON.parse(doneRaw);
        if (Array.isArray(arr)) arr.forEach((id) => state.doneLessons.add(id));
      }
    } catch (_) {}
  }

  function saveDone() {
    try {
      localStorage.setItem(STORAGE_DONE, JSON.stringify([...state.doneLessons]));
    } catch (_) {}
  }

  function saveLast() {
    try {
      localStorage.setItem(STORAGE_LAST, JSON.stringify({ lessonId: state.lessonId, stepIdx: state.stepIdx }));
    } catch (_) {}
  }

  function getLesson(id = state.lessonId) {
    return COURSE.lessons.find((l) => l.id === id) || COURSE.lessons[0];
  }

  function parseInitialRoute() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    const params = new URLSearchParams(window.location.search);
    const raw = hash || params.get('lesson') || '';
    if (raw) {
      const [lid, sRaw] = raw.split('/');
      const found = COURSE.lessons.find((l) => l.id === lid);
      if (found) {
        state.lessonId = found.id;
        const idx = parseInt(sRaw, 10);
        state.stepIdx = Number.isFinite(idx) && idx >= 0 && idx < found.steps.length ? idx : 0;
        return;
      }
    }
    try {
      const lastRaw = localStorage.getItem(STORAGE_LAST);
      if (lastRaw) {
        const last = JSON.parse(lastRaw);
        const found = COURSE.lessons.find((l) => l.id === last.lessonId);
        if (found) {
          state.lessonId = found.id;
          state.stepIdx = Math.min(Math.max(0, last.stepIdx || 0), found.steps.length - 1);
        }
      }
    } catch (_) {}
  }

  function applyTheme(next) {
    state.theme = next === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    try { localStorage.setItem(STORAGE_THEME, state.theme); } catch (_) {}
    const btn = document.getElementById('wb-theme-btn');
    if (btn) {
      btn.title = state.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
      btn.innerHTML = state.theme === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    if (stage) stage.setTheme(state.theme);
  }

  function stopTts() {
    state.speaking = false;
    try { if (global.speechSynthesis) global.speechSynthesis.cancel(); } catch (_) {}
    const btn = document.getElementById('wb-tts-btn');
    if (btn) {
      btn.classList.remove('is-speaking');
      btn.textContent = '🔊 Đọc bước này';
    }
  }

  function toggleTts() {
    if (state.speaking) {
      stopTts();
      return;
    }
    if (!global.speechSynthesis) return;
    const lesson = getLesson();
    const step = lesson.steps[state.stepIdx];
    const tmp = document.createElement('div');
    tmp.innerHTML = [step.title, ...(step.body || []), step.callout ? step.callout.text : ''].join('. ');
    const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    stopTts();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 1.04;
    u.onend = stopTts;
    u.onerror = stopTts;
    state.speaking = true;
    const btn = document.getElementById('wb-tts-btn');
    if (btn) {
      btn.classList.add('is-speaking');
      btn.textContent = '⏹ Dừng đọc';
    }
    global.speechSynthesis.speak(u);
  }

  function setDrawer(open) {
    state.drawerOpen = Boolean(open && global.innerWidth <= 980);
    const sb = document.getElementById('wb-sidebar');
    const bd = document.getElementById('wb-drawer-backdrop');
    if (sb) sb.classList.toggle('is-drawer-open', state.drawerOpen);
    if (bd) bd.hidden = !state.drawerOpen;
  }

  function renderSidebar() {
    const q = state.filterText.trim().toLowerCase();
    const container = document.getElementById('wb-sidebar-list');
    if (!container) return;

    const doneCount = state.doneLessons.size;
    const totalCount = COURSE.lessons.length;
    const pct = Math.round((doneCount / Math.max(1, totalCount)) * 100);
    const countEl = document.getElementById('wb-progress-count');
    const fillEl = document.getElementById('wb-progress-fill');
    if (countEl) countEl.textContent = `${doneCount}/${totalCount} xong`;
    if (fillEl) fillEl.style.width = `${pct}%`;

    let html = '';
    for (const mod of COURSE.modules || []) {
      const items = COURSE.lessons.filter((l) => {
        if (l.ch !== mod.ch) return false;
        if (!q) return true;
        return `${l.title} ${l.summary} ${l.ref}`.toLowerCase().includes(q);
      });
      if (!items.length) continue;
      const isOpen = q ? true : state.openChs.has(mod.ch);
      html += `<div class="wb-ch-group${isOpen ? ' is-open' : ''}" data-ch="${mod.ch}">
        <button type="button" class="wb-ch-btn" data-toggle-ch="${mod.ch}">
          <span class="wb-ch-chevron">▶</span>
          <span class="wb-ch-dot wb-ch-dot--${esc(mod.color || 'blue')}"></span>
          <span class="wb-ch-title">Ch.${mod.ch}: ${esc(mod.title)}</span>
          <span class="wb-ch-num">${items.length}</span>
        </button>
        <div class="wb-lesson-list">`;
      for (const l of items) {
        const active = l.id === state.lessonId;
        const done = state.doneLessons.has(l.id);
        html += `<button type="button" class="wb-lesson-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}" data-lesson="${esc(l.id)}">
          <span class="wb-lesson-item__status">${done ? '✓' : ''}</span>
          <span class="wb-lesson-item__meta">
            <span class="wb-lesson-item__title">${esc(l.title)}</span>
            <span class="wb-lesson-item__sub">${l.steps.length} bước · ${esc(l.level || 'Cơ bản')}</span>
          </span>
        </button>`;
      }
      html += '</div></div>';
    }
    container.innerHTML = html || '<p style="padding:12px;color:var(--wb-muted);font-size:12.5px;">Không có bài mô phỏng nào khớp từ khóa.</p>';
  }

  function renderStageAndRail(animateMorph = true) {
    stopTts();
    const lesson = getLesson();
    const step = lesson.steps[state.stepIdx] || lesson.steps[0];

    // Mark lesson done on final step
    state.visitedSteps.add(state.stepIdx);
    if (state.stepIdx === lesson.steps.length - 1 && !state.doneLessons.has(lesson.id)) {
      state.doneLessons.add(lesson.id);
      saveDone();
      renderSidebar();
    }
    saveLast();

    // Update URL hash quietly
    const nextHash = `#${lesson.id}/${state.stepIdx}`;
    if (window.location.hash !== nextHash) {
      try { history.replaceState(null, '', nextHash); } catch (_) {}
    }

    // Lesson header
    const crumbEl = document.getElementById('wb-lesson-crumb');
    const titleEl = document.getElementById('wb-lesson-title');
    const levelEl = document.getElementById('wb-lesson-level');
    const videoEl = document.getElementById('wb-video-btn');
    if (crumbEl) crumbEl.textContent = lesson.ref || `Chương ${lesson.ch}`;
    if (titleEl) titleEl.textContent = lesson.title;
    if (levelEl) levelEl.textContent = `${lesson.level || 'Cơ bản'} · ${lesson.steps.length} bước`;
    if (videoEl) {
      if (lesson.videoHref) {
        videoEl.href = lesson.videoHref;
        videoEl.textContent = '▶ Xem bài giảng gốc';
        videoEl.title = `Mở bài giảng: ${lesson.videoTitle || lesson.title}`;
        videoEl.hidden = false;
      } else {
        videoEl.hidden = true;
      }
    }

    // HUD metrics
    const hudEl = document.getElementById('wb-hud');
    if (hudEl) {
      const mVals = step.metrics || {};
      let hudHtml = '';
      for (const def of lesson.metrics || []) {
        const cur = mVals[def.id] || { val: '—', level: '' };
        const prevVal = state.prevMetrics[def.id];
        const changed = prevVal !== undefined && prevVal !== cur.val;
        const lvlCls = cur.level ? ` wb-hud-card--${cur.level}` : '';
        hudHtml += `<div class="wb-hud-card${lvlCls}${changed ? ' is-flash' : ''}">
          <div class="wb-hud-card__label">${esc(def.label)}</div>
          <div class="wb-hud-card__val">${esc(cur.val)}</div>
        </div>`;
      }
      hudEl.innerHTML = hudHtml;
      state.prevMetrics = {};
      for (const def of lesson.metrics || []) {
        state.prevMetrics[def.id] = (mVals[def.id] || {}).val;
      }
    }

    // Legend
    const legEl = document.getElementById('wb-legend');
    if (legEl) {
      const kinds = lesson.legend || ['req', 'res'];
      legEl.innerHTML = kinds
        .filter((k) => LEGEND_META[k])
        .map((k) => {
          const m = LEGEND_META[k];
          return `<span class="wb-legend-item"><span class="wb-legend-dot${m.sq ? ' wb-legend-dot--sq' : ''}" style="background:${m.color}"></span>${esc(m.label)}</span>`;
        })
        .join('');
    }

    // 2.5D IsoStage render
    if (stage && step.scene) {
      stage.renderScene(step.scene);
    }

    // Timeline stepper (numbered circular node rail — Designed to Scale / SOA style)
    const tlEl = document.getElementById('wb-timeline');
    if (tlEl) {
      const n = lesson.steps.length;
      const pct = n > 1 ? Math.round((state.stepIdx / (n - 1)) * 100) : 100;
      const btns = lesson.steps
        .map((st, i) => {
          const active = i === state.stepIdx;
          const visited = i < state.stepIdx || state.visitedSteps.has(i);
          return `<button type="button" class="wb-step-pill${active ? ' is-active' : ''}${visited ? ' is-visited' : ''}" data-step="${i}">
            <span class="wb-step-pill__idx">${i + 1}</span>
            <span class="wb-step-pill__label">${esc(st.short || `Bước ${i + 1}`)}</span>
          </button>`;
        })
        .join('');
      tlEl.innerHTML = `
        <div class="wb-timeline__head">
          <span class="wb-timeline__eyebrow">Trong bài này</span>
          <span class="wb-timeline__count">Bước ${state.stepIdx + 1} / ${n}<span class="wb-timeline__hint"> · phím ← → · R phát lại · Space tạm dừng</span></span>
        </div>
        <div class="wb-timeline__track" style="--n:${n}">
          <div class="wb-timeline__rail"><div class="wb-timeline__rail-fill" style="width:${pct}%"></div></div>
          <div class="wb-timeline__steps">${btns}</div>
        </div>`;
    }

    // Right rail narrative
    const phaseEl = document.getElementById('wb-phase-pill');
    if (phaseEl) {
      const ph = step.chapter || 'setup';
      phaseEl.className = `wb-phase-pill wb-phase-pill--${ph}`;
      phaseEl.textContent = `Bước ${state.stepIdx + 1}/${lesson.steps.length} · ${PHASE_LABEL[ph] || ph}`;
    }
    const stTitleEl = document.getElementById('wb-step-title');
    if (stTitleEl) stTitleEl.textContent = step.title;

    const bodyEl = document.getElementById('wb-step-body');
    if (bodyEl) {
      bodyEl.innerHTML = (step.body || []).map((p) => `<p>${p}</p>`).join('');
    }

    const calloutEl = document.getElementById('wb-callout');
    if (calloutEl) {
      if (step.callout && step.callout.text) {
        const k = step.callout.kind || 'insight';
        const tagText = k === 'warn' ? '⚠ Lưu ý kỹ thuật' : k === 'tip' ? '✓ Kinh nghiệm thực hành' : '💡 Điểm cốt lõi';
        calloutEl.className = `wb-callout wb-callout--${k}`;
        calloutEl.innerHTML = `<span class="wb-callout__tag">${tagText}</span><div>${step.callout.text}</div>`;
        calloutEl.hidden = false;
      } else {
        calloutEl.hidden = true;
      }
    }

    const changesEl = document.getElementById('wb-changes');
    if (changesEl) {
      if (Array.isArray(step.changes) && step.changes.length) {
        const lis = step.changes
          .map((line) => {
            const cls = line.startsWith('+') ? 'wb-change--add' : line.startsWith('!') || line.startsWith('-') ? 'wb-change--warn' : 'wb-change--mod';
            return `<li class="${cls}">${esc(line)}</li>`;
          })
          .join('');
        changesEl.innerHTML = `<div class="wb-section-lbl">Biến đổi ở bước này</div><ul>${lis}</ul>`;
        changesEl.hidden = false;
      } else {
        changesEl.hidden = true;
      }
    }

    const goalsEl = document.getElementById('wb-goals');
    if (goalsEl) {
      const goals = lesson.goals || [];
      if (goals.length) {
        const lis = goals
          .map((g) => {
            const ok = state.stepIdx >= g.step || state.doneLessons.has(lesson.id);
            return `<li class="wb-goal${ok ? ' is-done' : ''}">
              <span class="wb-goal__chk">${ok ? '✓' : ''}</span>
              <span>${esc(g.text)}</span>
            </li>`;
          })
          .join('');
        goalsEl.innerHTML = `<div class="wb-section-lbl">Mục tiêu nắm vững</div><ul>${lis}</ul>`;
        goalsEl.hidden = false;
      } else {
        goalsEl.hidden = true;
      }
    }

    const prevBtn = document.getElementById('wb-prev-step');
    const nextBtn = document.getElementById('wb-next-step');
    const lIdx = COURSE.lessons.findIndex((l) => l.id === lesson.id);
    if (prevBtn) {
      prevBtn.disabled = state.stepIdx === 0 && lIdx === 0;
      prevBtn.textContent = state.stepIdx === 0 && lIdx > 0 ? '← Bài trước' : '← Bước trước';
    }
    if (nextBtn) {
      const isLast = state.stepIdx === lesson.steps.length - 1;
      nextBtn.disabled = isLast && lIdx === COURSE.lessons.length - 1;
      nextBtn.textContent = isLast && lIdx < COURSE.lessons.length - 1 ? 'Bài tiếp theo →' : 'Bước tiếp →';
    }

    const railScroll = document.getElementById('wb-rail-scroll');
    if (railScroll) railScroll.scrollTop = 0;
  }

  function selectLesson(id, stepIdx = 0) {
    const lesson = COURSE.lessons.find((l) => l.id === id);
    if (!lesson) return;
    state.lessonId = lesson.id;
    state.stepIdx = Math.min(Math.max(0, stepIdx), lesson.steps.length - 1);
    state.visitedSteps = new Set([state.stepIdx]);
    state.prevMetrics = {};
    state.openChs.add(lesson.ch);
    setDrawer(false);
    renderSidebar();
    renderStageAndRail(false);
  }

  function goStep(delta) {
    const lesson = getLesson();
    const lIdx = COURSE.lessons.findIndex((l) => l.id === lesson.id);
    const next = state.stepIdx + delta;
    if (next >= 0 && next < lesson.steps.length) {
      state.stepIdx = next;
      renderStageAndRail(true);
    } else if (next >= lesson.steps.length && lIdx < COURSE.lessons.length - 1) {
      selectLesson(COURSE.lessons[lIdx + 1].id, 0);
    } else if (next < 0 && lIdx > 0) {
      const prevL = COURSE.lessons[lIdx - 1];
      selectLesson(prevL.id, prevL.steps.length - 1);
    }
  }

  /* ── Search Command Palette ── */
  function openSearch() {
    state.searchOpen = true;
    const modal = document.getElementById('wb-search-modal');
    const input = document.getElementById('wb-search-input');
    if (modal) modal.hidden = false;
    if (input) {
      input.value = '';
      updateSearch('');
      setTimeout(() => input.focus(), 10);
    }
  }

  function closeSearch() {
    state.searchOpen = false;
    const modal = document.getElementById('wb-search-modal');
    if (modal) modal.hidden = true;
  }

  function updateSearch(query) {
    const q = query.trim().toLowerCase();
    const hits = [];
    for (const l of COURSE.lessons) {
      if (!q || `${l.title} ${l.summary} ${l.ref}`.toLowerCase().includes(q)) {
        hits.push({ lessonId: l.id, stepIdx: 0, top: l.title, sub: `${l.ref} · ${l.steps.length} bước` });
      }
      if (q) {
        l.steps.forEach((st, idx) => {
          if (`${st.short} ${st.title}`.toLowerCase().includes(q)) {
            hits.push({ lessonId: l.id, stepIdx: idx, top: `${l.title} → ${st.title}`, sub: `Bước ${idx + 1}/${l.steps.length}` });
          }
        });
      }
    }
    state.searchResults = hits.slice(0, 24);
    state.searchSelIdx = 0;
    renderSearchResults();
  }

  function renderSearchResults() {
    const box = document.getElementById('wb-search-results');
    if (!box) return;
    if (!state.searchResults.length) {
      box.innerHTML = '<div style="padding:14px;text-align:center;color:var(--wb-muted);">Không tìm thấy kết quả phù hợp.</div>';
      return;
    }
    box.innerHTML = state.searchResults
      .map((h, i) => `<button type="button" class="wb-search-hit${i === state.searchSelIdx ? ' is-sel' : ''}" data-hit="${i}">
        <span class="wb-search-hit__top">${esc(h.top)}</span>
        <span class="wb-search-hit__sub">${esc(h.sub)}</span>
      </button>`)
      .join('');
  }

  function init() {
    loadPersisted();
    parseInitialRoute();
    applyTheme(state.theme);

    const host = document.getElementById('wb-stage-host');
    if (host && global.IsoStage) {
      stage = new global.IsoStage(host, { theme: state.theme });
      stage.onViewChange = (zoomed) => {
        const resetBtn = document.getElementById('wb-reset-view');
        if (resetBtn) resetBtn.hidden = !zoomed;
      };
    }

    renderSidebar();
    renderStageAndRail(false);

    // Event bindings
    const sbList = document.getElementById('wb-sidebar-list');
    if (sbList) {
      sbList.addEventListener('click', (e) => {
        const chBtn = e.target.closest('[data-toggle-ch]');
        if (chBtn) {
          const ch = Number(chBtn.dataset.toggleCh);
          if (state.openChs.has(ch)) state.openChs.delete(ch);
          else state.openChs.add(ch);
          renderSidebar();
          return;
        }
        const lBtn = e.target.closest('[data-lesson]');
        if (lBtn) selectLesson(lBtn.dataset.lesson, 0);
      });
    }

    const filterInput = document.getElementById('wb-filter-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        state.filterText = e.target.value;
        renderSidebar();
      });
    }

    const tlEl = document.getElementById('wb-timeline');
    if (tlEl) {
      tlEl.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-step]');
        if (!pill) return;
        state.stepIdx = Number(pill.dataset.step);
        renderStageAndRail(true);
      });
    }

    const prevBtn = document.getElementById('wb-prev-step');
    const nextBtn = document.getElementById('wb-next-step');
    if (prevBtn) prevBtn.addEventListener('click', () => goStep(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => goStep(1));

    const replayBtn = document.getElementById('wb-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        if (stage) stage.replay();
      });
    }

    const pauseBtn = document.getElementById('wb-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (!stage) return;
        const p = !stage.paused;
        stage.setPaused(p);
        pauseBtn.classList.toggle('is-active', p);
        pauseBtn.textContent = p ? '▶ Tiếp tục' : '⏸ Tạm dừng';
      });
    }

    const resetBtn = document.getElementById('wb-reset-view');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (stage) stage.fit(true);
      });
    }

    const ttsBtn = document.getElementById('wb-tts-btn');
    if (ttsBtn) ttsBtn.addEventListener('click', toggleTts);

    const themeBtn = document.getElementById('wb-theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));

    const menuBtn = document.getElementById('wb-menu-btn');
    const backdrop = document.getElementById('wb-drawer-backdrop');
    if (menuBtn) menuBtn.addEventListener('click', () => setDrawer(!state.drawerOpen));
    if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));

    const searchBtn = document.getElementById('wb-search-btn');
    const searchModal = document.getElementById('wb-search-modal');
    const searchInput = document.getElementById('wb-search-input');
    const searchResults = document.getElementById('wb-search-results');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    if (searchModal) {
      searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearch();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', (e) => updateSearch(e.target.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          state.searchSelIdx = Math.min(state.searchResults.length - 1, state.searchSelIdx + 1);
          renderSearchResults();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          state.searchSelIdx = Math.max(0, state.searchSelIdx - 1);
          renderSearchResults();
        } else if (e.key === 'Enter' && state.searchResults[state.searchSelIdx]) {
          e.preventDefault();
          const h = state.searchResults[state.searchSelIdx];
          closeSearch();
          selectLesson(h.lessonId, h.stepIdx);
        }
      });
    }
    if (searchResults) {
      searchResults.addEventListener('click', (e) => {
        const hit = e.target.closest('[data-hit]');
        if (!hit) return;
        const h = state.searchResults[Number(hit.dataset.hit)];
        if (h) {
          closeSearch();
          selectLesson(h.lessonId, h.stepIdx);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (state.searchOpen) closeSearch();
        else openSearch();
        return;
      }
      if (e.key === 'Escape') {
        if (state.searchOpen) closeSearch();
        if (state.drawerOpen) setDrawer(false);
        return;
      }
      if (state.searchOpen) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goStep(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goStep(-1); }
      else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (stage) stage.replay();
      }
      else if (e.key === ' ') {
        e.preventDefault();
        if (pauseBtn) pauseBtn.click();
      }
    });

    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace(/^#/, '');
      if (!hash) return;
      const [lid, sRaw] = hash.split('/');
      const found = COURSE.lessons.find((l) => l.id === lid);
      if (found) {
        const sIdx = parseInt(sRaw, 10);
        const nextIdx = Number.isFinite(sIdx) && sIdx >= 0 && sIdx < found.steps.length ? sIdx : 0;
        if (found.id !== state.lessonId || nextIdx !== state.stepIdx) {
          selectLesson(found.id, nextIdx);
        }
      }
    });

    // Expose tiny test hook for Playwright audit
    global.__WB = {
      selectLesson,
      getState: () => ({ lessonId: state.lessonId, stepIdx: state.stepIdx, theme: state.theme }),
      setTheme: applyTheme
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
