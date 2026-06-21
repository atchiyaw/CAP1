(function () {
  'use strict';

  const policyChildren = [
    { id: 'sec-policy', label: 'Policy Statement' },
    { id: 'sec-objectives', label: 'Objectives' },
    { id: 'sec-scope', label: 'Scope & Coverage' },
    { id: 'sec-general', label: 'General Guidelines' },
    { id: 'sec-grouping', label: 'Grouping Guidelines' },
    { id: 'sched', label: 'Schedule of Activities' },
    { id: 'defense', label: 'Defense Stages Overview' },
    { id: 'manuscript', label: 'Manuscript Sections' },
    { id: 'sec-docdev', label: 'Documentation & System' },
    { id: 'sec-conduct', label: 'Attendance & Submission' },
    { id: 'sec-eval', label: 'Evaluation Guidelines' },
    { id: 'sec-grounds', label: 'Grounds for Re-Defense' },
    { id: 'sec-ethics', label: 'Ethics & Final Output' }
  ];

  const navItems = [
    { id: 'governing-policies', label: 'Governing Policies', icon: 'scroll-text', children: policyChildren },
    { id: 'groupings', label: 'Groupings', icon: 'users' },
    { id: 'concept-defense', label: 'Concept Defense', icon: 'lightbulb' },
    { id: 'title-defense', label: 'Title Defense', icon: 'presentation' },
    { id: 'progress-report-1', label: 'Progress Report 1', icon: 'bar-chart-3' },
    { id: 'progress-report-2', label: 'Progress Report 2', icon: 'bar-chart-4' },
    { id: 'final-defense', label: 'Final Defense', icon: 'award' },
    { id: 'forms', label: 'Forms', icon: 'file-text' },
    { id: 'capstone-template', label: 'Capstone Template', icon: 'layout-template' }
  ];

  const sideNav = document.getElementById('sideNav');
  const navList = document.createElement('ol');
  navList.className = 'side-list';
  sideNav.appendChild(navList);
  const navLinks = [];

  navItems.forEach(function (item) {
    const li = document.createElement('li');
    li.className = 'side-item' + (item.children ? ' has-children open' : '');

    if (item.children) {
      li.innerHTML =
        '<div class="side-row">' +
          '<a class="side-link side-parent" href="#' + item.id + '">' +
            '<i data-lucide="' + item.icon + '"></i><span>' + item.label + '</span>' +
          '</a>' +
          '<button type="button" class="side-chevron" aria-label="Toggle ' + item.label + ' subsections" aria-expanded="true"></button>' +
        '</div>' +
        '<ol class="side-sub"></ol>';

      const sub = li.querySelector('.side-sub');
      const chevron = li.querySelector('.side-chevron');
      const parentLink = li.querySelector('.side-parent');

      chevron.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = li.classList.toggle('open');
        chevron.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      navLinks.push(parentLink);

      item.children.forEach(function (child) {
        const subLi = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'side-sublink';
        a.href = '#' + child.id;
        a.textContent = child.label;
        subLi.appendChild(a);
        sub.appendChild(subLi);
        navLinks.push(a);
      });
    } else {
      const a = document.createElement('a');
      a.className = 'side-link';
      a.href = '#' + item.id;
      a.innerHTML = '<i data-lucide="' + item.icon + '"></i><span>' + item.label + '</span>';
      li.appendChild(a);
      navLinks.push(a);
    }

    navList.appendChild(li);
  });

  /* ---------- Sidebar toggle ---------- */
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarScrim = document.getElementById('sidebarScrim');
  const siteHeader = document.getElementById('siteHeader');
  const SIDEBAR_KEY = 'cap1-sidebar-open';
  const isMobile = function () { return window.innerWidth <= 960; };

  function setSidebarOpen(open, persist) {
    document.body.classList.toggle('sidebar-open', open);
    document.body.classList.toggle('sidebar-closed', !open);
    sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (persist) localStorage.setItem(SIDEBAR_KEY, open ? '1' : '0');
    if (!isMobile()) sidebarScrim.classList.remove('show');
    else sidebarScrim.classList.toggle('show', open);
    document.body.style.overflow = (isMobile() && open) ? 'hidden' : '';
  }

  const stored = localStorage.getItem(SIDEBAR_KEY);
  if (stored === '0') setSidebarOpen(false, false);
  else if (isMobile()) setSidebarOpen(false, false);
  else setSidebarOpen(true, false);

  sidebarToggle.addEventListener('click', function () {
    const open = !document.body.classList.contains('sidebar-open');
    setSidebarOpen(open, true);
  });

  sidebarScrim.addEventListener('click', function () {
    setSidebarOpen(false, true);
  });

  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (isMobile()) setSidebarOpen(false, true);
    });
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) {
      sidebarScrim.classList.remove('show');
      document.body.style.overflow = '';
    }
  });

  /* ---------- Lucide icons ---------- */
  function initIcons() {
    if (window.lucide) lucide.createIcons();
  }
  initIcons();

  document.querySelectorAll('.page-hero .reveal').forEach(function (el) {
    el.classList.add('visible');
  });
  document.querySelectorAll('.section-nested').forEach(function (el) {
    el.classList.add('reveal');
  });

  /* ---------- Reveal on scroll ---------- */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) { revealObs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- Scroll: progress, scrollspy, to-top ---------- */
  const progressBar = document.getElementById('progressBar');
  const toTop = document.getElementById('toTop');
  const sections = navItems.flatMap(function (item) {
    const ids = [item.id];
    if (item.children) ids.push.apply(ids, item.children.map(function (c) { return c.id; }));
    return ids;
  }).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function onScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docH > 0 ? (scrollTop / docH) * 100 : 0) + '%';
    siteHeader.classList.toggle('scrolled', scrollTop > 10);
    toTop.classList.toggle('show', scrollTop > 500);

    let activeId = sections.length ? sections[0].id : null;
    const offset = 100;
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= offset) activeId = sec.id;
    });

    navLinks.forEach(function (a) {
      const href = a.getAttribute('href').slice(1);
      const activeEl = document.getElementById(activeId);
      const isDirect = href === activeId;
      const isParentOfActive = a.classList.contains('side-parent') &&
        activeEl && activeEl.dataset.group === href;
      a.classList.toggle('active', isDirect || isParentOfActive);
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

  /* ---------- Meter animation ---------- */
  const meters = document.querySelectorAll('.meter');
  if ('IntersectionObserver' in window) {
    const mo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          const val = e.target.getAttribute('data-value');
          e.target.querySelector('span').style.width = val + '%';
          mo.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    meters.forEach(function (m) { mo.observe(m); });
  } else {
    meters.forEach(function (m) {
      m.querySelector('span').style.width = m.getAttribute('data-value') + '%';
    });
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

  /* ---------- Discussion board ---------- */
  const STORAGE_KEY = 'cap1-discussions';
  const form = document.getElementById('discussForm');
  const list = document.getElementById('discussList');
  const dName = document.getElementById('dName');
  const dTopic = document.getElementById('dTopic');
  const dMessage = document.getElementById('dMessage');
  const charCount = document.getElementById('charCount');
  const avatarColors = ['#1a365d', '#2c5282', '#4a5568', '#2d3748'];

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
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
