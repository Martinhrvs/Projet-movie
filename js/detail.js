const apiDetail = new APIService(CONFIG.API_KEY, CONFIG.BASE_URL, CONFIG.LANGUAGE);
const $ = id => document.getElementById(id);

const spinner     = $('loading-spinner');
const errBox      = $('global-error');
const errMsg      = $('global-error-msg');
const content     = $('detail-content');
const backdrop    = $('detail-backdrop');
const poster      = $('detail-poster');
const ratingCircle= $('detail-rating');
const titleEl     = $('detail-title');
const metaLine    = $('detail-meta-line');
const overviewEl  = $('detail-overview');
const castGrid    = $('cast-grid');
const castSection = $('detail-cast-section');
const burgerBtn   = $('burger-btn');
const mainNav     = $('main-nav');

function showError(msg) {
  spinner.classList.add('hidden');
  errMsg.textContent = msg || 'Une erreur est survenue.';
  errBox.classList.remove('hidden');
}

function showContent() {
  spinner.classList.add('hidden');
  content.classList.remove('hidden');
}

function imgUrl(path, size) {
  return path ? `${CONFIG.IMAGE_BASE_URL}/${size}${path}` : null;
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtRuntime(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
}

function buildMeta(data, type) {
  const parts = [];
  const date = fmtDate(data.release_date || data.first_air_date);
  if (date) parts.push(date);
  if (data.genres?.length) parts.push(data.genres.map(g => g.name).join(', '));
  if (type === 'movie' && data.runtime) parts.push(fmtRuntime(data.runtime));
  else if (type === 'tv' && data.episode_run_time?.[0]) parts.push(fmtRuntime(data.episode_run_time[0]));
  return parts.join(' - ');
}

function renderCast(cast) {
  castGrid.innerHTML = '';
  if (!cast?.length) { castSection.classList.add('hidden'); return; }

  const fragment = document.createDocumentFragment();
  cast.slice(0, 8).forEach((actor, i) => {
    const photoUrl = imgUrl(actor.profile_path, CONFIG.PROFILE_SIZE);
    const card = document.createElement('div');
    card.className = 'cast-card';
    card.setAttribute('role', 'listitem');
    card.style.animationDelay = `${i * 0.05}s`;

    const photoHtml = photoUrl
      ? `<img src="${photoUrl}" alt="${actor.name || 'Acteur'}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'cast-placeholder\\'><i class=\\'fa-solid fa-user\\'></i></div>'" />`
      : `<div class="cast-placeholder"><i class="fa-solid fa-user"></i></div>`;

    card.innerHTML = `
      <div class="cast-photo-wrap">${photoHtml}</div>
      <div class="cast-info">
        <p class="cast-name" title="${actor.name || ''}">${actor.name || '—'}</p>
        <p class="cast-character" title="${actor.character || ''}">${actor.character || ''}</p>
      </div>`;
    fragment.appendChild(card);
  });
  castGrid.appendChild(fragment);
}

async function loadDetail(id, type) {
  try {
    const [data, credits] = await Promise.all([
      type === 'movie' ? apiDetail.getMovieDetails(id) : apiDetail.getTVDetails(id),
      apiDetail.getCredits(id, type),
    ]);

    const title = data.title || data.name || 'Titre inconnu';
    document.title = `${title} – CinéDB`;

    if (data.backdrop_path) {
      backdrop.style.backgroundImage = `url('${imgUrl(data.backdrop_path, CONFIG.BACKDROP_SIZE)}')`;
    }

    const posterUrl = imgUrl(data.poster_path, 'w500');
    if (posterUrl) {
      poster.src = posterUrl;
      poster.alt = `Affiche de ${title}`;
      poster.onerror = () => {
        poster.outerHTML = `<div class="poster-placeholder" style="height:277px"><i class="fa-solid fa-image"></i><span>Pas d'image</span></div>`;
      };
    } else {
      poster.outerHTML = `<div class="poster-placeholder" style="height:277px"><i class="fa-solid fa-image"></i><span>Pas d'image</span></div>`;
    }

    const r = data.vote_average ? Math.round(data.vote_average * 10) : null;
    ratingCircle.textContent = r !== null ? `${r}%` : '—';

    titleEl.textContent    = title;
    metaLine.textContent   = buildMeta(data, type);
    overviewEl.textContent = data.overview || 'Aucun synopsis disponible.';

    renderCast(credits.cast || []);
    showContent();
  } catch {
    showError('Impossible de charger les informations. Veuillez réessayer.');
  }
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
}

/* ── Init ── */
function init() {
  const params = new URLSearchParams(window.location.search);
  const id   = params.get('id');
  const type = params.get('type') || 'movie';

  if (!id || isNaN(Number(id))) { showError('Identifiant invalide.'); return; }
  if (!['movie', 'tv'].includes(type)) { showError('Type de contenu inconnu.'); return; }

  loadDetail(Number(id), type);
}

init();
