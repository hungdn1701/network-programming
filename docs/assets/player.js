// Trình chiếu bản xem trước: slide chạy theo giọng đọc, hình hiện dần theo câu mốc, câu hỏi dừng chờ chọn.
// Dữ liệu (DATA) do tools/preview.py sinh từ script.md; file này dùng chung cho mọi video.
(() => {
  const D = DATA, S = D.scenes;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), khung = $('.khung-169'), audio = new Audio();
  let i = 0, phan = 1, cho = false, daBatDau = false, lang = null;  // lang: {bd: performance.now(), hen: timeout}
  let ccOn = true;
  let tmTimer = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const doDai = c => c.dur + (c.dur2 || 0) + (c.lang || 0);
  function boLang() { if (lang) { clearTimeout(lang.hen); lang = null; } }

  // Lưu tiến độ xem vào localStorage theo mã học phần (bgs_watched_<ma_hp>)
  const [maHp, maV] = (D.ma || '').split('_');
  const storageKey = maHp ? `bgs_watched_${maHp}` : null;
  function ghiTienDo(done = false) {
    if (!storageKey || !maV) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const data = raw ? JSON.parse(raw) : { watched: {} };
      if (!data.watched || typeof data.watched !== 'object') data.watched = {};
      const prev = data.watched[maV] || {};
      data.watched[maV] = {
        ts: Date.now(),
        tieu_de: D.tieu_de || maV,
        done: Boolean(done || prev.done)
      };
      data.last = { ma: maV, tieu_de: D.tieu_de || maV, ts: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (_) {}
  }

  try {
    ccOn = localStorage.getItem('bgs_cc') !== '0';
  } catch (_) {}

  function coGian() {  // vừa khung và căn giữa (toàn màn hình có thể khác tỉ lệ 16:9)
    const w = khung.clientWidth, h = khung.clientHeight, s = Math.min(w / 1920, h / 1080);
    stage.style.transform = `translate(${(w - 1920 * s) / 2}px, ${(h - 1080 * s) / 2}px) scale(${s})`;
  }
  window.addEventListener('resize', coGian); coGian();

  // Tự ẩn thanh điều khiển nổi trong chế độ toàn màn hình
  function resetTmTimer() {
    document.body.classList.remove('tm-an-dk');
    if (tmTimer) { clearTimeout(tmTimer); tmTimer = null; }
    if (document.body.classList.contains('toan-man') && !audio.paused && !cho) {
      tmTimer = setTimeout(() => {
        if (document.body.classList.contains('toan-man') && !audio.paused && !cho) {
          document.body.classList.add('tm-an-dk');
        }
      }, 2600);
    }
  }
  khung.addEventListener('mousemove', resetTmTimer);
  khung.addEventListener('touchstart', resetTmTimer, { passive: true });

  function toanMan(bat) {
    document.body.classList.toggle('toan-man', bat);
    if (bat && khung.requestFullscreen) {
      khung.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')?.catch(() => {})).catch(() => {});
    } else if (!bat && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (bat) resetTmTimer();
    else {
      if (tmTimer) { clearTimeout(tmTimer); tmTimer = null; }
      document.body.classList.remove('tm-an-dk');
    }
    coGian();
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove('toan-man', 'tm-an-dk');
      if (tmTimer) { clearTimeout(tmTimer); tmTimer = null; }
    } else {
      resetTmTimer();
    }
    coGian();
  });

  function hien(id) { stage.querySelectorAll('.slide').forEach(s => s.classList.toggle('active', s.id === id)); }
  function buoc(id, k) {
    const sec = document.getElementById(id);
    if (sec) sec.querySelectorAll('[data-s]').forEach(el => { el.style.opacity = (+el.dataset.s <= k) ? '1' : '0'; });
  }

  // Phụ đề đồng bộ cho cả ngoài khung và trong chế độ toàn màn hình
  function setPhuDe(htmlStr) {
    const pd = $('#phu-de'), pdTm = $('#phu-de-tm');
    if (pd) pd.innerHTML = htmlStr;
    if (pdTm) {
      pdTm.innerHTML = htmlStr;
      pdTm.setAttribute('data-empty', htmlStr && htmlStr.trim() ? '0' : '1');
    }
  }

  function syncCcUI() {
    const pd = $('#phu-de'), pdTm = $('#phu-de-tm');
    if (pd) pd.classList.toggle('cc-off', !ccOn);
    if (pdTm) pdTm.classList.toggle('cc-off', !ccOn);
    ['#bat-cc', '#bat-cc-tm'].forEach(sel => {
      const btn = $(sel);
      if (btn) btn.setAttribute('aria-pressed', ccOn ? 'true' : 'false');
    });
  }
  syncCcUI();

  function syncMuteUI() {
    const icon = audio.muted ? '🔇' : '🔊';
    ['#am-thanh', '#am-thanh-tm'].forEach(sel => {
      const btn = $(sel);
      if (btn) {
        btn.textContent = icon;
        btn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
      }
    });
  }
  syncMuteUI();

  function syncPlayUI(playing) {
    const icon = playing ? '⏸' : '▶';
    if ($('#chay')) $('#chay').textContent = icon;
    if ($('#chay-tm')) $('#chay-tm').textContent = icon;
  }

  // Danh sách phân cảnh
  const ds = $('#ds-canh');
  S.forEach((c, k) => {
    const li = document.createElement('li');
    const badge = c.loai === 'cau-hoi' ? '<span class="badge-ch">Câu hỏi</span>' : '';
    li.innerHTML = `<span class="sc-idx">${k + 1}</span><span class="t">${fmt(c.start)}</span><span class="sc-ten">${esc(c.ten)}</span>${badge}`;
    li.onclick = () => {
      daBatDau = true;
      if ($('#bat-dau')) $('#bat-dau').hidden = true;
      nap(k, 1, true);
    };
    ds.appendChild(li);
  });

  // Mốc phân cảnh trên thanh tiến độ
  function veMoc(bar) {
    if (!bar || !D.tong) return;
    S.slice(1).forEach(c => {
      const tick = document.createElement('span');
      tick.className = 'moc-canh';
      tick.style.left = `${(100 * c.start / D.tong).toFixed(3)}%`;
      bar.appendChild(tick);
    });
  }
  veMoc($('#thanh'));
  veMoc($('#thanh-tm'));

  function scrollSidebarActive() {
    const activeLi = ds.children[i];
    if (!activeLi) return;
    const top = activeLi.offsetTop;
    const bottom = top + activeLi.offsetHeight;
    if (top < ds.scrollTop) {
      ds.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' });
    } else if (bottom > ds.scrollTop + ds.clientHeight) {
      ds.scrollTo({ top: bottom - ds.clientHeight + 8, behavior: 'smooth' });
    }
  }

  function nap(k, p, chay) {
    boLang();
    i = Math.max(0, Math.min(S.length - 1, k)); phan = p; cho = false;
    const c = S[i], id = p === 2 ? c.slide2 : c.slide;
    hien(id);
    if (c.cues && c.cues.length) buoc(id, 0); else buoc(id, Infinity);
    stage.classList.remove('cho-chon');
    document.body.classList.remove('dang-cho');
    stage.querySelectorAll('.da-chon').forEach(e => e.classList.remove('da-chon'));
    $('#h5p').hidden = true;
    $('#the-gv').hidden = c.loai !== 'mo-dau';
    audio.src = p === 2 ? c.audio2 : c.audio;
    audio.playbackRate = +$('#toc').value;
    [...ds.children].forEach((li, n) => li.classList.toggle('dang', n === i));
    scrollSidebarActive();
    document.querySelectorAll('.canh-kb').forEach((card, n) => card.classList.toggle('dang', n === i));
    if (chay && $('#kb-tu-cuon')?.checked) {
      const card = document.getElementById(`kb-canh-${i}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    $('#dung div').textContent = c.dung || '—';
    setPhuDe('');
    if (chay) {
      ghiTienDo(false);
      audio.play().catch(() => {});
    }
  }

  function choChon() {
    const c = S[i], sec = document.getElementById(c.slide);
    cho = true; $('#h5p').hidden = false; stage.classList.add('cho-chon');
    document.body.classList.add('dang-cho');
    setPhuDe('');
    resetTmTimer();
    sec.querySelectorAll('.lua-chon > div').forEach(o => {
      o.onclick = () => {
        if (!cho) return;
        cho = false; o.classList.add('da-chon');
        setTimeout(() => nap(i, 2, true), 700);
      };
    });
  }
  $('#bo-qua').onclick = () => { if (cho) nap(i, 2, true); };

  const sau = () => {
    if (i + 1 < S.length) {
      nap(i + 1, 1, true);
    } else {
      syncPlayUI(false);
      ghiTienDo(true);
    }
  };
  audio.onended = () => {
    const c = S[i];
    if (c.loai === 'cau-hoi' && phan === 1) { choChon(); return; }
    const giay = c.loai === 'cau-hoi' ? 0.6 : (c.lang || 0);
    setPhuDe(giay > 1 ? `<span class="lang">· lặng ${Math.round(giay)} giây ·</span>` : '');
    lang = { bd: performance.now(), giay, hen: setTimeout(() => { lang = null; sau(); }, 1000 * giay / audio.playbackRate) };
    syncPlayUI(true);
  };
  audio.onplay = () => { syncPlayUI(true); ghiTienDo(false); resetTmTimer(); };
  audio.onpause = () => { syncPlayUI(false); resetTmTimer(); };

  function phuDe(words, t) {
    if (!words || !words.length) return;
    let k = 0;
    while (k + 1 < words.length && words[k + 1][0] <= t) k++;
    const cau = words[k][2];
    setPhuDe(words.filter(w => w[2] === cau)
      .map(w => w === words[k] ? `<span class="dang-doc">${esc(w[1])}</span>` : esc(w[1])).join(' '));
  }

  function nhip() {
    const c = S[i], t = audio.currentTime || 0;
    if (phan === 1 && c.cues && c.cues.length) buoc(c.slide, c.cues.filter(x => x <= t + 0.05).length);
    if (!cho && !lang) phuDe(phan === 2 ? c.words2 : c.words, t);
    const qua = lang ? Math.min(lang.giay, (performance.now() - lang.bd) / 1000 * audio.playbackRate) : 0;
    const da = c.start + (phan === 2 ? c.dur + (c.lang || 0) : 0) + (lang ? c.dur + (c.dur2 || 0) - (phan === 2 ? c.dur : 0) + qua : t);
    const pct = D.tong ? Math.min(100, Math.max(0, 100 * da / D.tong)) : 0;
    const timeText = `${fmt(da)} / ${fmt(D.tong)}`;
    if ($('#da-chay')) $('#da-chay').style.width = `${pct}%`;
    if ($('#da-chay-tm')) $('#da-chay-tm').style.width = `${pct}%`;
    if ($('#gio')) $('#gio').textContent = timeText;
    if ($('#gio-tm')) $('#gio-tm').textContent = timeText;
    requestAnimationFrame(nhip);
  }

  $('#bat-dau').onclick = () => { $('#bat-dau').hidden = true; daBatDau = true; nap(0, 1, true); };
  const togglePlay = () => {
    if (!daBatDau) return $('#bat-dau').onclick();
    if (cho) return;
    if (lang) { boLang(); return sau(); }  // đang lặng: bỏ qua khoảng lặng
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  };
  $('#chay').onclick = togglePlay;
  if ($('#chay-tm')) $('#chay-tm').onclick = togglePlay;

  const prevScene = () => { daBatDau = true; if ($('#bat-dau')) $('#bat-dau').hidden = true; nap(i - 1, 1, true); };
  const nextScene = () => { daBatDau = true; if ($('#bat-dau')) $('#bat-dau').hidden = true; nap(i + 1, 1, true); };
  $('#lui').onclick = prevScene;
  $('#toi').onclick = nextScene;
  if ($('#lui-tm')) $('#lui-tm').onclick = prevScene;
  if ($('#toi-tm')) $('#toi-tm').onclick = nextScene;

  $('#toc').onchange = () => { audio.playbackRate = +$('#toc').value; };

  const toggleMute = () => { audio.muted = !audio.muted; syncMuteUI(); };
  if ($('#am-thanh')) $('#am-thanh').onclick = toggleMute;
  if ($('#am-thanh-tm')) $('#am-thanh-tm').onclick = toggleMute;

  const toggleCc = () => {
    ccOn = !ccOn;
    try { localStorage.setItem('bgs_cc', ccOn ? '1' : '0'); } catch (_) {}
    syncCcUI();
  };
  if ($('#bat-cc')) $('#bat-cc').onclick = toggleCc;
  if ($('#bat-cc-tm')) $('#bat-cc-tm').onclick = toggleCc;

  $('#toan-man').onclick = () => toanMan(true);
  $('#thoat-tm').onclick = e => { e.stopPropagation(); toanMan(false); };
  if ($('#thoat-tm-bar')) $('#thoat-tm-bar').onclick = e => { e.stopPropagation(); toanMan(false); };

  khung.addEventListener('click', e => {  // toàn màn hình: chạm slide để chạy/dừng (trừ thanh điều khiển & câu hỏi)
    if (document.body.classList.contains('toan-man') &&
        !e.target.closest('.lua-chon, #dk-tm, #thoat-tm, #h5p, #bat-dau')) {
      togglePlay();
    }
  });

  function seekToBar(e, bar) {
    const r = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const t = D.tong * ratio;
    let k = S.findIndex(c => c.start + doDai(c) > t);
    if (k < 0) k = S.length - 1;
    daBatDau = true;
    if ($('#bat-dau')) $('#bat-dau').hidden = true;
    nap(k, 1, true);
    audio.currentTime = Math.min(Math.max(0, t - S[k].start), S[k].dur);
  }
  $('#thanh').onclick = e => seekToBar(e, e.currentTarget);
  if ($('#thanh-tm')) $('#thanh-tm').onclick = e => seekToBar(e, e.currentTarget);

  // Tooltip xem trước thời gian & tên phân cảnh khi rê chuột trên thanh tiến độ
  const tip = $('#thanh-tip');
  if (tip && $('#thanh')) {
    $('#thanh').addEventListener('mousemove', e => {
      const bar = e.currentTarget, r = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const t = D.tong * ratio;
      let k = S.findIndex(c => c.start + doDai(c) > t);
      if (k < 0) k = S.length - 1;
      tip.textContent = `${fmt(t)} · ${S[k].ten}`;
      tip.style.left = `${Math.min(Math.max(60, e.clientX - r.left), Math.max(60, r.width - 60))}px`;
      tip.hidden = false;
    });
    $('#thanh').addEventListener('mouseleave', () => { tip.hidden = true; });
  }

  // Popover phím tắt
  const btnPt = $('#nut-phim-tat'), popPt = $('#phim-tat-popover');
  if (btnPt && popPt) {
    btnPt.onclick = e => {
      e.stopPropagation();
      popPt.hidden = !popPt.hidden;
    };
    document.addEventListener('click', e => {
      if (!popPt.hidden && !e.target.closest('#phim-tat-popover, #nut-phim-tat')) {
        popPt.hidden = true;
      }
    });
  }

  function tuaTrongCanh(delta) {
    if (!daBatDau || cho || lang) return;
    const dur = Number.isFinite(audio.duration) ? audio.duration : S[i].dur;
    const next = audio.currentTime + delta;
    if (next < 0) audio.currentTime = 0;
    else if (next >= dur && i + 1 < S.length) nap(i + 1, 1, true);
    else audio.currentTime = Math.min(dur, next);
  }

  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); nextScene(); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); prevScene(); }
    else if (e.code === 'KeyJ') { e.preventDefault(); tuaTrongCanh(-5); }
    else if (e.code === 'KeyL') { e.preventDefault(); tuaTrongCanh(5); }
    else if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
    else if (e.code === 'KeyC') { e.preventDefault(); toggleCc(); }
    else if (e.code === 'KeyF') { e.preventDefault(); toanMan(!document.body.classList.contains('toan-man')); }
    else if (e.key === '?' && popPt) { e.preventDefault(); popPt.hidden = !popPt.hidden; }
    else if (e.code === 'Escape' && popPt && !popPt.hidden) { popPt.hidden = true; }
  });

  // Sao chép an toàn (kể cả khi mở bằng file://)
  function copyText(text, onOk) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onOk).catch(() => fallbackCopy(text, onOk));
    } else {
      fallbackCopy(text, onOk);
    }
  }
  function fallbackCopy(text, onOk) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); onOk(); } catch (_) {}
    document.body.removeChild(ta);
  }

  window.playerNap = (k) => {
    daBatDau = true;
    const btn = $('#bat-dau');
    if (btn) btn.hidden = true;
    nap(k, 1, true);
    const card = document.getElementById(`kb-canh-${k}`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.copyCanh = (k, btn) => {
    const card = document.getElementById(`kb-canh-${k}`);
    if (!card) return;
    const tieuDe = card.querySelector('h3') ? card.querySelector('h3').innerText.trim() : '';
    const tg = card.querySelector('.canh-tg') ? card.querySelector('.canh-tg').innerText.trim() : '';
    const thoai = card.querySelector('.kb-thoai') ? card.querySelector('.kb-thoai').innerText.trim() : '';
    const dung = card.querySelector('.kb-dung') ? card.querySelector('.kb-dung').innerText.trim() : '';

    let text = `## [${tg}] ${tieuDe}\n\n${thoai}`;
    if (dung) text += `\n\n> ${dung}`;

    copyText(text, () => {
      const old = btn.textContent;
      btn.textContent = '✓ Đã chép!';
      btn.style.color = '#2F855A';
      setTimeout(() => { btn.textContent = old; btn.style.color = ''; }, 1500);
    });
  };

  window.copyMa = (btn) => {
    const maWrap = btn.closest('.kb-slide-ma');
    const codeEl = maWrap ? maWrap.querySelector('pre code') : null;
    if (!codeEl) return;
    copyText(codeEl.textContent, () => {
      const old = btn.textContent;
      btn.textContent = '✓ Đã chép mã!';
      btn.style.color = '#2F855A';
      setTimeout(() => { btn.textContent = old; btn.style.color = ''; }, 1500);
    });
  };

  const btnAll = document.getElementById('btn-copy-toan-bo');
  if (btnAll) {
    btnAll.onclick = () => {
      const cards = document.querySelectorAll('.canh-kb');
      const lines = [`# ${D.ma} · ${D.tieu_de}\n`];
      cards.forEach(card => {
        const tieuDe = card.querySelector('h3') ? card.querySelector('h3').innerText.trim() : '';
        const tg = card.querySelector('.canh-tg') ? card.querySelector('.canh-tg').innerText.trim() : '';
        const thoai = card.querySelector('.kb-thoai') ? card.querySelector('.kb-thoai').innerText.trim() : '';
        const dung = card.querySelector('.kb-dung') ? card.querySelector('.kb-dung').innerText.trim() : '';
        lines.push(`### [${tg}] ${tieuDe}\n\n${thoai}`);
        if (dung) lines.push(`\n> ${dung}`);
        lines.push('\n---\n');
      });
      copyText(lines.join('\n'), () => {
        const old = btnAll.textContent;
        btnAll.textContent = '✓ Đã chép toàn bộ!';
        btnAll.style.background = '#2F855A';
        setTimeout(() => { btnAll.textContent = old; btnAll.style.background = ''; }, 2000);
      });
    };
  }

  // Tìm kiếm trong toàn văn kịch bản
  const kbSearch = $('#kb-tim-kiem'), kbClear = $('#kb-tim-xoa'), kbCount = $('#kb-tim-dem'), kbEmpty = $('#kb-rong');
  if (kbSearch) {
    const cards = [...document.querySelectorAll('.canh-kb')];
    const locKb = () => {
      const q = kbSearch.value.trim().toLowerCase();
      if (kbClear) kbClear.hidden = !q;
      let shown = 0;
      cards.forEach(card => {
        const match = !q || card.textContent.toLowerCase().includes(q);
        card.hidden = !match;
        if (match) shown++;
      });
      if (kbCount) kbCount.textContent = q ? `${shown} / ${cards.length} phân cảnh` : `${cards.length} phân cảnh`;
      if (kbEmpty) kbEmpty.hidden = shown > 0;
    };
    kbSearch.addEventListener('input', locKb);
    if (kbClear) kbClear.onclick = () => { kbSearch.value = ''; locKb(); kbSearch.focus(); };
    locKb();
  }

  nap(0, 1, false);
  requestAnimationFrame(nhip);
})();
