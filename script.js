(function () {
  'use strict';

  /* ---------- Build Table of Contents from sections ---------- */
  const tocData = [
    { id: 'sec-policy', num: 'I', label: 'Policy Statement' },
    { id: 'sec-objectives', num: 'II', label: 'Objectives' },
    { id: 'sec-scope', num: 'III', label: 'Scope & Coverage' },
    { id: 'sec-general', num: 'IV', label: 'General Guidelines' },
    { id: 'sec-grouping', num: 'V', label: 'Grouping' },
    { id: 'sched', num: 'VI', label: 'Schedule of Activities' },
    { id: 'defense', num: 'VII–VIII', label: 'Defense Stages' },
    { id: 'manuscript', num: 'IX', label: 'Manuscript Sections' },
    { id: 'sec-docdev', num: 'X–XII', label: 'Documentation & System' },
    { id: 'sec-conduct', num: 'XIII–XV', label: 'Attendance & Submission' },
    { id: 'sec-eval', num: 'XVI', label: 'Evaluation' },
    { id: 'sec-grounds', num: 'XVII', label: 'Grounds for Re-Defense' },
    { id: 'sec-ethics', num: 'XVIII–XXI', label: 'Ethics & Final Output' },
    { id: 'discussion', num: '✦', label: 'Discussion Board' }
  ];

  const toc = document.getElementById('toc');
  tocData.forEach(function (item) {
    const li = document.createElement('li');
    li.innerHTML = '<a href="#' + item.id + '"><span class="num">' + item.num + '</span>' + item.label + '</a>';
    toc.appendChild(li);
  });
  const tocLinks = Array.from(toc.querySelectorAll('a'));

  /* ---------- Mobile sidebar ---------- */
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  const menuToggle = document.getElementById('menuToggle');
  function closeSidebar() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  menuToggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    scrim.classList.toggle('show');
  });
  scrim.addEventListener('click', closeSidebar);
  tocLinks.forEach(function (a) { a.addEventListener('click', closeSidebar); });

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('cap1-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  themeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('cap1-theme', 'light'); }
    else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('cap1-theme', 'dark'); }
  });

  /* ---------- Reading progress + to-top + scrollspy ---------- */
  const progressBar = document.getElementById('progressBar');
  const toTop = document.getElementById('toTop');
  const sections = tocData.map(function (t) { return document.getElementById(t.id); }).filter(Boolean);

  function onScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docH > 0 ? (scrollTop / docH) * 100 : 0) + '%';
    toTop.classList.toggle('show', scrollTop > 500);

    let activeId = sections.length ? sections[0].id : null;
    const offset = 120;
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= offset) activeId = sec.id;
    });
    tocLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + activeId);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.acc-head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.parentElement.classList.toggle('open');
    });
  });
  const firstAcc = document.querySelector('.acc-item');
  if (firstAcc) firstAcc.classList.add('open');

  /* ---------- Meter animation on view ---------- */
  const meters = document.querySelectorAll('.meter');
  if ('IntersectionObserver' in window) {
    const mo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          const fill = e.target.querySelector('span');
          fill.style.width = e.target.getAttribute('data-value') + '%';
          mo.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    meters.forEach(function (m) { mo.observe(m); });
  } else {
    meters.forEach(function (m) { m.querySelector('span').style.width = m.getAttribute('data-value') + '%'; });
  }

  /* ---------- Search ---------- */
  const searchInput = document.getElementById('searchInput');
  const allSections = Array.from(document.querySelectorAll('.section'));
  const noResults = document.createElement('p');
  noResults.className = 'no-results';
  noResults.textContent = 'No sections match your search.';
  noResults.style.display = 'none';
  document.querySelector('.content').appendChild(noResults);

  function clearHighlights(el) {
    el.querySelectorAll('mark.hl').forEach(function (m) {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }
  function highlight(el, term) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'MARK') return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().indexOf(term) !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      const frag = document.createDocumentFragment();
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      let i = 0, idx;
      while ((idx = lower.indexOf(term, i)) !== -1) {
        if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
        const mark = document.createElement('mark');
        mark.className = 'hl';
        mark.textContent = text.slice(idx, idx + term.length);
        frag.appendChild(mark);
        i = idx + term.length;
      }
      if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  let searchTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 120);
  });
  function runSearch() {
    const term = searchInput.value.trim().toLowerCase();
    let visible = 0;
    allSections.forEach(function (sec) {
      clearHighlights(sec);
      if (!term) { sec.classList.remove('search-hidden'); visible++; return; }
      const match = sec.textContent.toLowerCase().indexOf(term) !== -1;
      sec.classList.toggle('search-hidden', !match);
      if (match) { visible++; highlight(sec, term); }
    });
    noResults.style.display = (term && visible === 0) ? 'block' : 'none';
  }

  /* ---------- Discussion board (localStorage) ---------- */
  const STORAGE_KEY = 'cap1-discussions';
  const form = document.getElementById('discussForm');
  const list = document.getElementById('discussList');
  const dName = document.getElementById('dName');
  const dTopic = document.getElementById('dTopic');
  const dMessage = document.getElementById('dMessage');
  const charCount = document.getElementById('charCount');
  const avatarColors = ['#4f46e5', '#7c3aed', '#0ea5a4', '#e2603b', '#0891b2', '#db2777', '#ca8a04'];

  function loadComments() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveComments(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function colorFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return avatarColors[Math.abs(h) % avatarColors.length];
  }

  function render() {
    const comments = loadComments();
    if (!comments.length) {
      list.innerHTML = '<div class="discuss-empty">No comments yet — be the first to start the discussion!</div>';
      return;
    }
    list.innerHTML = '';
    comments.slice().reverse().forEach(function (c) {
      const name = c.name || 'Anonymous';
      const initial = name.trim().charAt(0).toUpperCase() || 'A';
      const el = document.createElement('div');
      el.className = 'comment';
      el.innerHTML =
        '<div class="comment-avatar" style="background:' + colorFor(name) + '">' + escapeHtml(initial) + '</div>' +
        '<div class="comment-main">' +
          '<div class="comment-head">' +
            '<strong>' + escapeHtml(name) + '</strong>' +
            '<span class="comment-topic">' + escapeHtml(c.topic) + '</span>' +
            '<span class="comment-time">' + timeAgo(c.ts) + '</span>' +
            '<button class="comment-del" data-id="' + c.id + '" aria-label="Delete comment" title="Delete">✕</button>' +
          '</div>' +
          '<p class="comment-body">' + escapeHtml(c.message) + '</p>' +
        '</div>';
      list.appendChild(el);
    });
    list.querySelectorAll('.comment-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-id');
        saveComments(loadComments().filter(function (c) { return String(c.id) !== id; }));
        render();
      });
    });
  }

  dMessage.addEventListener('input', function () {
    charCount.textContent = dMessage.value.length + ' / 600';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const message = dMessage.value.trim();
    if (!message) return;
    const comments = loadComments();
    comments.push({
      id: Date.now() + '' + Math.floor(Math.random() * 1000),
      name: dName.value.trim().slice(0, 40),
      topic: dTopic.value,
      message: message,
      ts: Date.now()
    });
    saveComments(comments);
    dMessage.value = '';
    charCount.textContent = '0 / 600';
    render();
  });

  render();
})();
