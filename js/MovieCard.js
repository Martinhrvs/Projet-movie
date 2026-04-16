class MovieCard {
  constructor(data, type) {
    this._data = data;
    this._type = type || data.media_type || 'movie';
  }

  get id()    { return this._data.id; }
  get type()  { return this._type; }
  get title() { return this._data.title || this._data.name || 'Titre inconnu'; }

  get year() {
    const d = this._data.release_date || this._data.first_air_date || '';
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  get rating() {
    return this._data.vote_average ? Math.round(this._data.vote_average * 10) : null;
  }

  _posterUrl() {
    return this._data.poster_path
      ? `${CONFIG.IMAGE_BASE_URL}/${CONFIG.POSTER_SIZE}${this._data.poster_path}`
      : null;
  }

  _detailUrl() {
    return `detail.html?id=${this.id}&type=${this._type}`;
  }

  render() {
    const posterUrl = this._posterUrl();
    const rating    = this.rating;

    const imgHtml = posterUrl
      ? `<img src="${posterUrl}" alt="Affiche de ${this._esc(this.title)}" class="card-poster" loading="lazy" onerror="MovieCard.handleImageError(this)" />`
      : MovieCard.placeholder();

    const ratingHtml = rating !== null
      ? `<span class="card-rating">${rating}%</span>`
      : '';

    return `
<article class="movie-card" role="listitem">
  <a href="${this._detailUrl()}" aria-label="${this._esc(this.title)}">
    <div class="card-poster-wrap">
      ${imgHtml}
      ${ratingHtml}
    </div>
    <div class="card-body">
      <p class="card-title" title="${this._esc(this.title)}">${this._esc(this.title)}</p>
      <p class="card-year">${this.year}</p>
    </div>
  </a>
</article>`.trim();
  }

  static placeholder() {
    return `<div class="poster-placeholder" aria-label="Pas d'affiche"><i class="fa-solid fa-image" aria-hidden="true"></i><span>Pas d'image</span></div>`;
  }

  static handleImageError(img) {
    const wrap = img.closest('.card-poster-wrap');
    if (!wrap) return;
    img.remove();
    const d = document.createElement('div');
    d.innerHTML = MovieCard.placeholder();
    wrap.prepend(d.firstElementChild);
  }

  _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
}
