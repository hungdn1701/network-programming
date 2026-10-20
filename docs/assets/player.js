// Trình chiếu bản xem trước: slide chạy theo giọng đọc, hình hiện dần theo câu mốc, câu hỏi dừng chờ chọn.
// Dữ liệu (DATA) do tools/preview.py sinh từ script.md; file này dùng chung cho mọi video.
(() => {
  const D = DATA, S = D.scenes;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), khung = $('.khung-169'), audio = new Audio();
  let i = 0, phan = 1, cho = false, daBatDau = false, lang = null;  // lang: {bd: performance.now(), hen: timeout}

  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const doDai = c => c.dur + (c.dur2 || 0) + (c.lang || 0);
  function boLang() { if (lang) { clearTimeout(lang.hen); lang = null; } }

  function coGian() {  // vừa khung và căn giữa (toàn màn hình có thể khác tỉ lệ 16:9)
    const w = khung.clientWidth, h = khung.clientHeight, s = Math.min(w / 1920, h / 1080);
    stage.style.transform = `translate(${(w - 1920 * s) / 2}px, ${(h - 1080 * s) / 2}px) scale(${s})`;
  }
  window.addEventListener('resize', coGian); coGian();

  function toanMan(bat) {
    document.body.classList.toggle('toan-man', bat);
    if (bat && khung.requestFullscreen) {
      khung.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')?.catch(() => {})).catch(() => {});
    } else if (!bat && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    coGian();
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('toan-man');
    coGian();
  });

  function hien(id) { stage.querySelectorAll('.slide').forEach(s => s.classList.toggle('active', s.id === id)); }
  function buoc(id, k) {
    const sec = document.getElementById(id);
    if (sec) sec.querySelectorAll('[data-s]').forEach(el => { el.style.opacity = (+el.dataset.s <= k) ? '1' : '0'; });
  }

  // Danh sách phân cảnh
  const ds = $('#ds-canh');
  S.forEach((c, k) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="t">${fmt(c.start)}</span><span>${c.ten}</span>`;
    li.onclick = () => nap(k, 1, true);
    ds.appendChild(li);
  });

  function nap(k, p, chay) {
    boLang();
    i = Math.max(0, Math.min(S.length - 1, k)); phan = p; cho = false;
    const c = S[i], id = p === 2 ? c.slide2 : c.slide;
    hien(id);
    if (c.cues && c.cues.length) buoc(id, 0); else buoc(id, Infinity);
    stage.classList.remove('cho-chon');
    stage.querySelectorAll('.da-chon').forEach(e => e.classList.remove('da-chon'));
    $('#h5p').hidden = true;
    $('#the-gv').hidden = c.loai !== 'mo-dau';
    audio.src = p === 2 ? c.audio2 : c.audio;
    audio.playbackRate = +$('#toc').value;
    [...ds.children].forEach((li, n) => li.classList.toggle('dang', n === i));
    document.querySelectorAll('.canh-kb').forEach((card, n) => card.classList.toggle('dang', n === i));
    $('#dung div').textContent = c.dung || '—';
    $('#phu-de').textContent = '';
    if (chay) audio.play();
  }

  function choChon() {
    const c = S[i], sec = document.getElementById(c.slide);
    cho = true; $('#h5p').hidden = false; stage.classList.add('cho-chon');
    sec.querySelectorAll('.lua-chon > div').forEach(o => {
      o.onclick = () => {
        if (!cho) return;
        cho = false; o.classList.add('da-chon');
        setTimeout(() => nap(i, 2, true), 700);
      };
    });
  }
  $('#bo-qua').onclick = () => { if (cho) nap(i, 2, true); };

  const sau = () => { if (i + 1 < S.length) nap(i + 1, 1, true); else $('#chay').textContent = '▶'; };
  audio.onended = () => {
    const c = S[i];
    if (c.loai === 'cau-hoi' && phan === 1) { choChon(); return; }
    const giay = c.loai === 'cau-hoi' ? 0.6 : (c.lang || 0);
    $('#phu-de').innerHTML = giay > 1 ? `<span class="lang">· lặng ${Math.round(giay)} giây ·</span>` : '';
    lang = { bd: performance.now(), giay, hen: setTimeout(() => { lang = null; sau(); }, 1000 * giay / audio.playbackRate) };
    $('#chay').textContent = '⏸';
  };
  audio.onplay = () => { $('#chay').textContent = '⏸'; };
  audio.onpause = () => { $('#chay').textContent = '▶'; };

  function phuDe(words, t) {
    if (!words || !words.length) return;
    let k = 0;
    while (k + 1 < words.length && words[k + 1][0] <= t) k++;
    const cau = words[k][2];
    $('#phu-de').innerHTML = words.filter(w => w[2] === cau)
      .map(w => w === words[k] ? `<span class="dang-doc">${w[1]}</span>` : w[1]).join(' ');
  }

  function nhip() {
    const c = S[i], t = audio.currentTime;
    if (phan === 1 && c.cues && c.cues.length) buoc(c.slide, c.cues.filter(x => x <= t + 0.05).length);
    if (!cho && !lang) phuDe(phan === 2 ? c.words2 : c.words, t);
    const qua = lang ? Math.min(lang.giay, (performance.now() - lang.bd) / 1000 * audio.playbackRate) : 0;
    const da = c.start + (phan === 2 ? c.dur + (c.lang || 0) : 0) + (lang ? c.dur + (c.dur2 || 0) - (phan === 2 ? c.dur : 0) + qua : t);
    $('#da-chay').style.width = `${100 * da / D.tong}%`;
    $('#gio').textContent = `${fmt(da)} / ${fmt(D.tong)}`;
    requestAnimationFrame(nhip);
  }

  $('#bat-dau').onclick = () => { $('#bat-dau').hidden = true; daBatDau = true; nap(0, 1, true); };
  $('#chay').onclick = () => {
    if (!daBatDau) return $('#bat-dau').onclick();
    if (cho) return;
    if (lang) { boLang(); return sau(); }  // đang lặng: bỏ qua khoảng lặng
    audio.paused ? audio.play() : audio.pause();
  };
  $('#lui').onclick = () => nap(i - 1, 1, true);
  $('#toi').onclick = () => nap(i + 1, 1, true);
  $('#toc').onchange = () => { audio.playbackRate = +$('#toc').value; };
  $('#toan-man').onclick = () => toanMan(true);
  $('#thoat-tm').onclick = e => { e.stopPropagation(); toanMan(false); };
  stage.addEventListener('click', e => {  // toàn màn hình không có thanh điều khiển: chạm slide để chạy/dừng
    if (document.body.classList.contains('toan-man') && !e.target.closest('.lua-chon')) $('#chay').onclick();
  });
  $('#thanh').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect(), t = D.tong * (e.clientX - r.left) / r.width;
    let k = S.findIndex(c => c.start + doDai(c) > t); if (k < 0) k = S.length - 1;
    nap(k, 1, true);
    audio.currentTime = Math.min(Math.max(0, t - S[k].start), S[k].dur);
  };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); $('#chay').onclick(); }
    if (e.code === 'ArrowRight') $('#toi').onclick();
    if (e.code === 'ArrowLeft') $('#lui').onclick();
    if (e.code === 'KeyF') toanMan(!document.body.classList.contains('toan-man'));
  });

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

    navigator.clipboard.writeText(text).then(() => {
      const old = btn.textContent;
      btn.textContent = '✓ Đã chép!';
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
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        const old = btnAll.textContent;
        btnAll.textContent = '✓ Đã chép toàn bộ!';
        btnAll.style.background = '#2F855A';
        setTimeout(() => { btnAll.textContent = old; btnAll.style.background = ''; }, 2000);
      });
    };
  }

  nap(0, 1, false);
  requestAnimationFrame(nhip);
})();
