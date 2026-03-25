class APIService {
  constructor(apiKey, baseUrl, language = 'fr-FR') {
    this._apiKey   = apiKey;
    this._baseUrl  = baseUrl;
    this._language = language;
  }

  async _fetchData(endpoint, params = {}) {
    const url = new URL(`${this._baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this._apiKey);
    url.searchParams.set('language', this._language);
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    return res.json();
  }

  getTrending(mediaType = 'all', timeWindow = 'day') {
    return this._fetchData(`/trending/${mediaType}/${timeWindow}`);
  }

  getPopularMovies(page = 1, genreId = '') {
    return this._fetchData('/discover/movie', {
      sort_by: 'popularity.desc',
      page,
      with_genres: genreId,
    });
  }

  getPopularTVShows(page = 1, sortBy = 'popularity.desc') {
    const params = { sort_by: sortBy, page };
    if (sortBy === 'vote_average.desc') params['vote_count.gte'] = 200;
    return this._fetchData('/discover/tv', params);
  }

  getMovieGenres() {
    return this._fetchData('/genre/movie/list');
  }

  getTVGenres() {
    return this._fetchData('/genre/tv/list');
  }

  searchMulti(query, page = 1) {
    return this._fetchData('/search/multi', { query, page });
  }

  getMovieDetails(id) {
    return this._fetchData(`/movie/${id}`);
  }

  getTVDetails(id) {
    return this._fetchData(`/tv/${id}`);
  }

  getCredits(id, type = 'movie') {
    return this._fetchData(`/${type}/${id}/credits`);
  }
}
