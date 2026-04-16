const api = new APIService(CONFIG.API_KEY, CONFIG.BASE_URL, CONFIG.LANGUAGE);

const CARDS_COUNT = 4;

const state = {
  trendingWindow: 'day',
  moviesGenre:    '',
  tvSort:         'vote_average.desc',
  searchResults:  [],
  searchGenre:    null,
  searchYear:     '',
};

const $ = id => document.getElementById(id);

const trendingGrid         = $('trending-grid');
const moviesGrid           = $('movies-grid');
const tvshowsGrid          = $('tvshows-grid');
const trendingError        = $('trending-error');
const moviesError          = $('movies-error');
const tvshowsError         = $('tvshows-error');
const searchForm           = $('search-form');
const searchInput          = $('search-input');
const searchResultsSection = $('section-search-results');
const searchResultsGrid    = $('search-results-grid');
const searchQueryLabel     = $('search-query-label');
const searchNoResults      = $('search-no-results');
const searchFiltersPanel   = $('search-filters-panel');
const searchGenreChips     = $('search-genre-chips');
const filterYearInput      = $('filter-year');
const movieGenreFilters    = $('movie-genre-filters');
const burgerBtn            = $('burger-btn');
const mainNav              = $('main-nav');

/* ── Skeletons ── */
function renderSkeletons(grid, count = CARDS_COUNT) {
  grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(count);
}

/* ── Render cards ── */
function renderCards(grid, items, forceType = null, limit = CARDS_COUNT) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = '<p class="no-results">Aucun contenu à afficher.</p>';
    return;
  }

  const filtered = items.filter(i => (forceType || i.media_type || 'movie') !== 'person');
  const top      = filtered.slice(0, limit);

  const fragment = document.createDocumentFragment();
  top.forEach((item, index) => {
    const type = forceType || item.media_type || 'movie';
    const card = new MovieCard(item, type);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = card.render();
    const el = wrapper.firstElementChild;
    el.style.animationDelay = `${index * 0.06}s`;
    fragment.appendChild(el);
  });
  grid.appendChild(fragment);
}

function toggleError(el, show) {
  el.classList.toggle('hidden', !show);
}

/* ── Chargements sections ── */
async function loadTrending() {
  try {
    toggleError(trendingError, false);
    renderSkeletons(trendingGrid);
    const data = await api.getTrending('all', state.trendingWindow);
    renderCards(trendingGrid, data.results);
  } catch {
    trendingGrid.innerHTML = '';
    toggleError(trendingError, true);
  }
}

async function loadMovies() {
  try {
    toggleError(moviesError, false);
    renderSkeletons(moviesGrid);
    const data = await api.getPopularMovies(1, state.moviesGenre);
    renderCards(moviesGrid, data.results, 'movie');
  } catch {
    moviesGrid.innerHTML = '';
    toggleError(moviesError, true);
  }
}

async function loadTVShows() {
  try {
    toggleError(tvshowsError, false);
    renderSkeletons(tvshowsGrid);
    const data = await api.getPopularTVShows(1, state.tvSort);
    renderCards(tvshowsGrid, data.results, 'tv');
  } catch {
    tvshowsGrid.innerHTML = '';
    toggleError(tvshowsError, true);
  }
}

/* ── Genres films (filtres sections) ── */
function addGenreButton(container, id, name, section) {
  const btn = document.createElement('button');
  btn.className = 'tab-btn';
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', 'false');
  btn.dataset.genreId = id;
  btn.dataset.section = section;
  btn.textContent = name;
  container.appendChild(btn);
}

async function loadMovieGenres() {
  try {
    const data = await api.getMovieGenres();
    data.genres.slice(0, 5).forEach(g => addGenreButton(movieGenreFilters, g.id, g.name, 'movies'));
  } catch {
  }
}

/* ── Genres pour le panneau de recherche ── */
async function loadSearchGenres() {
  if (searchGenreChips.children.length > 0) return;
  try {
    const [moviesData, tvData] = await Promise.all([
      api.getMovieGenres(),
      api.getTVGenres(),
    ]);
    const seen = new Set();
    const genres = [];
    [...moviesData.genres, ...tvData.genres].forEach(g => {
      if (!seen.has(g.name)) {
        seen.add(g.name);
        genres.push(g);
      }
    });
    genres.forEach(g => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-chip';
      btn.dataset.genreId = g.id;
      btn.textContent = g.name;
      searchGenreChips.appendChild(btn);
    });
  } catch {
  }
}

/* ── Panneau filtres : afficher / masquer ── */
function showFiltersPanel() {
  searchFiltersPanel.classList.remove('hidden');
  loadSearchGenres();
}

function hideFiltersPanel() {
  searchFiltersPanel.classList.add('hidden');
}

searchInput.addEventListener('focus', showFiltersPanel);

document.addEventListener('click', e => {
  const heroBody = document.querySelector('.hero-body');
  if (heroBody && !heroBody.contains(e.target)) {
    hideFiltersPanel();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideFiltersPanel();
});

/* ── Clic sur un chip genre ── */
searchGenreChips.addEventListener('click', e => {
  const chip = e.target.closest('.search-chip');
  if (!chip) return;

  const genreId = Number(chip.dataset.genreId);
  if (state.searchGenre === genreId) {
    state.searchGenre = null;
    chip.classList.remove('active');
  } else {
    searchGenreChips.querySelectorAll('.search-chip').forEach(c => c.classList.remove('active'));
    state.searchGenre = genreId;
    chip.classList.add('active');
  }

  if (state.searchResults.length > 0) applySearchFilters();
});

/* ── Changement année ── */
filterYearInput.addEventListener('input', () => {
  state.searchYear = filterYearInput.value.trim();
  if (state.searchResults.length > 0) applySearchFilters();
});

/* ── Appliquer les filtres genre + année sur les résultats ── */
function applySearchFilters() {
  let items = [...state.searchResults];

  if (state.searchGenre) {
    items = items.filter(i =>
      Array.isArray(i.genre_ids) && i.genre_ids.includes(state.searchGenre)
    );
  }

  if (state.searchYear) {
    const year = parseInt(state.searchYear, 10);
    if (!isNaN(year)) {
      items = items.filter(i => {
        const date = i.release_date || i.first_air_date || '';
        return date.startsWith(String(year));
      });
    }
  }

  searchNoResults.classList.add('hidden');
  searchResultsGrid.innerHTML = '';

  if (items.length === 0) {
    searchNoResults.textContent = 'Aucun résultat pour ces filtres.';
    searchNoResults.classList.remove('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  items.slice(0, 20).forEach((item, index) => {
    const type = item.media_type || 'movie';
    const card = new MovieCard(item, type);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = card.render();
    const el = wrapper.firstElementChild;
    el.style.animationDelay = `${index * 0.04}s`;
    fragment.appendChild(el);
  });
  searchResultsGrid.appendChild(fragment);
}

/* ── Afficher la section résultats ── */
function showSearchResults(query, items) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelector('.hero')?.classList.add('hidden');
  searchResultsSection.classList.remove('hidden');
  searchQueryLabel.textContent = `"${query}"`;
  searchNoResults.classList.add('hidden');

  state.searchResults = (items || []).filter(i => i.media_type !== 'person');
  applySearchFilters();
}

function resetSearch() {
  searchInput.value  = '';
  state.searchResults = [];
  state.searchGenre   = null;
  state.searchYear    = '';
  filterYearInput.value = '';
  searchGenreChips.querySelectorAll('.search-chip').forEach(c => c.classList.remove('active'));
  searchResultsSection.classList.add('hidden');
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('hidden'));
  document.querySelector('.hero')?.classList.remove('hidden');
}

/* ── Formulaire recherche ── */
searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) { resetSearch(); return; }

  hideFiltersPanel();

  try {
    renderSkeletons(searchResultsGrid, 8);
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.querySelector('.hero')?.classList.add('hidden');
    searchResultsSection.classList.remove('hidden');
    searchQueryLabel.textContent = `"${query}"`;
    searchNoResults.classList.add('hidden');

    const data = await api.searchMulti(query);
    showSearchResults(query, data.results);
  } catch {
    searchResultsGrid.innerHTML = '';
    searchNoResults.textContent = 'Une erreur est survenue lors de la recherche.';
    searchNoResults.classList.remove('hidden');
  }
});

searchInput.addEventListener('input', () => {
  if (searchInput.value.trim() === '') resetSearch();
});

/* ── Délégation clics filtres sections ── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;

  const container = btn.closest('.filter-tabs');
  if (!container) return;

  container.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  const section = btn.dataset.section;

  if (section === 'trending') {
    state.trendingWindow = btn.dataset.window;
    loadTrending();
  } else if (section === 'tvshows') {
    state.tvSort = btn.dataset.sort;
    loadTVShows();
  } else if (section === 'movies') {
    state.moviesGenre = btn.dataset.genreId || '';
    loadMovies();
  }
});

/* ── Bannière hero ── */
function loadHero() {
  const heroBackdrop = $('hero-backdrop');
  if (!heroBackdrop) return;
  heroBackdrop.style.backgroundImage =
    `url('https://geekylaloutre.fr/wp-content/uploads/2023/12/Marvel_0-680x350.jpg')`;
}

/* ── Menu burger ── */
if (burgerBtn && mainNav) {
  burgerBtn.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    burgerBtn.setAttribute('aria-expanded', isOpen);
    burgerBtn.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });

  document.addEventListener('click', e => {
    if (!burgerBtn.contains(e.target) && !mainNav.contains(e.target)) {
      mainNav.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', 'false');
      burgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
  });
}

/* ── Param ?search= depuis detail.html ── */
function handleUrlSearch() {
  const q = new URLSearchParams(window.location.search).get('search');
  if (q) {
    searchInput.value = q;
    api.searchMulti(q)
      .then(d => showSearchResults(q, d.results))
      .catch(() => {});
  }
}

/* ── Init ── */
async function init() {
  loadHero();
  await Promise.all([loadTrending(), loadTVShows(), loadMovies(), loadMovieGenres()]);
  handleUrlSearch();
}

init();
