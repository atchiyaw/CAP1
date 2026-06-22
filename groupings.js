/**
 * Groupings dashboard — loads data/groupings.json and renders stats + sortable table.
 */
(function () {
  const SECTION_ORDER = { BSIT3A: 0, BSIT3B: 1, BSIT3C: 2, BSIT3D: 3, BSIT3E: 4 };

  const dashboardEl = document.getElementById('groupingsDashboard');
  const controlsEl = document.getElementById('groupingsControls');
  const tableWrapEl = document.getElementById('groupingsTableWrap');
  const tableBodyEl = document.getElementById('groupingsTableBody');
  const sortEl = document.getElementById('groupingsSort');
  const filterEl = document.getElementById('groupingsFilter');
  const reservedEl = document.getElementById('groupingsShowReserved');

  if (!dashboardEl) return;

  let groups = [];
  let sortBy = 'section';
  let filterSection = 'all';
  let showReserved = false;

  function ordinal(n) {
    if (n == null) return '—';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' Presenter';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function techBadge(tech) {
    if (!tech || tech === '—') return '';
    return `<span class="tech-badge">${escapeHtml(tech)}</span>`;
  }

  function computeStats(list) {
    const techCounts = {};
    list.forEach((g) => {
      const tech = g.titleDefenseTechnology || 'Unspecified';
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    });
    const sections = new Set(list.map((g) => g.section));
    const sortedTech = Object.entries(techCounts).sort((a, b) => b[1] - a[1]);
    return {
      totalGroups: list.length,
      totalSections: sections.size,
      totalTitleDefense: list.length,
      techCounts: sortedTech,
      topTech: sortedTech.slice(0, 4),
    };
  }

  function renderDashboard(list) {
    const stats = computeStats(list);
    const topCards = stats.topTech
      .map(
        ([tech, count]) => `
        <div class="groupings-stat-card groupings-stat-tech">
          <span class="groupings-stat-value">${count}</span>
          <span class="groupings-stat-label">${escapeHtml(tech)}</span>
        </div>`
      )
      .join('');

    const allTechPills = stats.techCounts
      .map(([tech, count]) => `<span class="tech-pill">${escapeHtml(tech)} <strong>${count}</strong></span>`)
      .join('');

    dashboardEl.innerHTML = `
      <div class="groupings-stat-grid">
        <div class="groupings-stat-card groupings-stat-primary">
          <span class="groupings-stat-value">${stats.totalGroups}</span>
          <span class="groupings-stat-label">Total Groups</span>
        </div>
        <div class="groupings-stat-card">
          <span class="groupings-stat-value">${stats.totalSections}</span>
          <span class="groupings-stat-label">Sections</span>
        </div>
        <div class="groupings-stat-card">
          <span class="groupings-stat-value">${stats.totalTitleDefense}</span>
          <span class="groupings-stat-label">Title Defense Papers</span>
        </div>
        ${topCards}
      </div>
      <div class="groupings-tech-breakdown">
        <span class="groupings-tech-breakdown-label">Technology breakdown (Title Defense only)</span>
        <div class="groupings-tech-pills">${allTechPills}</div>
      </div>`;
  }

  function sortGroups(list) {
    const copy = [...list];
    if (sortBy === 'section') {
      copy.sort(
        (a, b) =>
          (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99) ||
          a.groupNumber - b.groupNumber
      );
    } else if (sortBy === 'presenter') {
      copy.sort((a, b) => (a.presenter || '').localeCompare(b.presenter || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'technology') {
      copy.sort(
        (a, b) =>
          (a.titleDefenseTechnology || '').localeCompare(b.titleDefenseTechnology || '', undefined, {
            sensitivity: 'base',
          }) || (a.titleDefenseTitle || '').localeCompare(b.titleDefenseTitle || '', undefined, { sensitivity: 'base' })
      );
    }
    return copy;
  }

  function filterGroups(list) {
    if (filterSection === 'all') return list;
    return list.filter((g) => g.section === filterSection);
  }

  function renderConceptCell(group) {
    const td = group.concepts.find((c) => c.titleDefense) || group.concepts[0];
    let html = `
      <div class="concept-title-defense">
        <span class="concept-td-badge">Title Defense</span>
        <span class="concept-title">${escapeHtml(td?.title || group.titleDefenseTitle || '—')}</span>
        ${techBadge(td?.technology || group.titleDefenseTechnology)}
      </div>`;

    if (showReserved) {
      const reserved = group.concepts.filter((c) => !c.titleDefense);
      reserved.forEach((c) => {
        const isPlaceholder = c.title.startsWith('Reserved Concept');
        html += `
          <div class="concept-reserved${isPlaceholder ? ' concept-reserved-empty' : ''}">
            <span class="concept-reserved-label">Reserved · Concept ${c.slot}</span>
            <span class="concept-title">${escapeHtml(c.title)}</span>
            ${techBadge(c.technology)}
          </div>`;
      });
    }
    return html;
  }

  function renderTable(list) {
    const filtered = filterGroups(list);
    const sorted = sortGroups(filtered);
    tableBodyEl.innerHTML = sorted
      .map(
        (g) => `
      <tr class="groupings-row">
        <td data-label="Section"><span class="section-tag">${escapeHtml(g.section)}</span></td>
        <td data-label="Group #">${g.groupNumber}</td>
        <td data-label="Presenter">${escapeHtml(g.presenter || '—')}</td>
        <td data-label="Title Defense Concept" class="concept-cell">${renderConceptCell(g)}</td>
        <td data-label="Proponents" class="proponents-cell">${escapeHtml((g.proponents || []).join(', ') || '—')}</td>
        <td data-label="Order" class="order-cell">${escapeHtml(ordinal(g.presenterOrder))}</td>
      </tr>`
      )
      .join('');

    if (window.lucide) lucide.createIcons();
  }

  function refresh() {
    renderDashboard(groups);
    renderTable(groups);
  }

  function bindControls() {
    sortEl.addEventListener('change', () => {
      sortBy = sortEl.value;
      refresh();
    });
    filterEl.addEventListener('change', () => {
      filterSection = filterEl.value;
      refresh();
    });
    reservedEl.addEventListener('change', () => {
      showReserved = reservedEl.checked;
      refresh();
    });
  }

  async function init() {
    try {
      const res = await fetch('data/groupings.json');
      if (!res.ok) throw new Error('Failed to load groupings data');
      const data = await res.json();
      groups = data.groups || [];
      controlsEl.hidden = false;
      tableWrapEl.hidden = false;
      bindControls();
      refresh();
    } catch (err) {
      dashboardEl.innerHTML = `<p class="groupings-error">Unable to load groupings data. ${escapeHtml(err.message)}</p>`;
    }
  }

  init();
})();
