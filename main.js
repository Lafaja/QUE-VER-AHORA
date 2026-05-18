// =========================================================================
// 🔑 CONFIGURACIÓN API
// =========================================================================
const API_KEY = '26a39484247de9013a5ee834ea498cdf'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const isDemoMode = API_KEY === 'TU_API_KEY_AQUI' || API_KEY === '';

// =========================================================================
// ESTADO GLOBAL
// =========================================================================
let usersDB = JSON.parse(localStorage.getItem('cinematch_users')) || [];
let currentUser = null; // null = Invitado
let currentAuthMode = 'login';
let genresMap = {};
let currentTab = 'estrenos';
let currentType = 'movie'; // 'movie' o 'tv'
let selectedGenres = []; // Array de IDs de géneros seleccionados
let explorarPage = 1;
let recomendacionPage = 1;
let isLoadingMore = false;

// Datos Dummy para Modo Demo
const demoMovies = [
    { id: 27205, title: 'Inception', vote_average: 8.4, genre_ids: [28, 878, 12], poster_path: '/edv5CZvWj09upOsy2Y6IwObsVNl.jpg' },
    { id: 155, title: 'The Dark Knight', vote_average: 8.5, genre_ids: [18, 28, 80, 53], poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
    { id: 157336, title: 'Interstellar', vote_average: 8.4, genre_ids: [12, 18, 878], poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
    { id: 496243, title: 'Parasite', vote_average: 8.5, genre_ids: [35, 53, 18], poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
    { id: 299534, title: 'Avengers: Endgame', vote_average: 8.3, genre_ids: [12, 878, 28], poster_path: '/or06FN3Dka5tukK1e9sl16pB3iy.jpg' },
    { id: 550, title: 'Fight Club', vote_average: 8.4, genre_ids: [18], poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg' },
    { id: 680, title: 'Pulp Fiction', vote_average: 8.5, genre_ids: [53, 80], poster_path: '/d5iIlFn5s0ImszYzBPb8SPFPzX.jpg' },
    { id: 13, title: 'Forrest Gump', vote_average: 8.5, genre_ids: [35, 18, 10749], poster_path: '/h5J4W4veyxMXDMjeNxZI46MtHNS.jpg' },
    { id: 238, title: 'The Godfather', vote_average: 8.7, genre_ids: [18, 80], poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
    { id: 603, title: 'The Matrix', vote_average: 8.2, genre_ids: [28, 878], poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg' }
];
const demoGenres = { 28: 'Acción', 12: 'Aventura', 35: 'Comedia', 80: 'Crimen', 18: 'Drama', 53: 'Suspense', 878: 'Ciencia ficción', 10749: 'Romance' };

// =========================================================================
// UI HEADER & NAVEGACIÓN
// =========================================================================
function renderHeader() {
    const container = document.getElementById('user-menu-container');
    if (currentUser) {
        container.innerHTML = `
            <span>Hola, <strong>${currentUser.username}</strong></span>
            <button class="btn-logout" onclick="logout()">Salir</button>
        `;
    } else {
        container.innerHTML = `
            <button class="btn-primary" style="padding: 10px 20px; font-size: 0.95rem;" onclick="openAuthModal('login')">Iniciar Sesión</button>
        `;
    }
}

let currentVistasFilter = 'all';
let currentPlatform = '';



function switchTab(tab) {
    currentTab = tab;
    const layout = document.querySelector('.layout');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const tabsContainer = document.querySelector('.tabs');
    
    // Configuración de Sidebar (Solo visible en Explorar)
    if (tab === 'explorar') {
        layout.classList.remove('sidebar-hidden');
        if (toggleBtn) toggleBtn.style.display = 'flex';
    } else {
        layout.classList.add('sidebar-hidden');
        if (toggleBtn) toggleBtn.style.display = 'none';
    }

    // Asegurar que todas las pestañas son visibles
    if (tabsContainer) tabsContainer.classList.remove('restricted-tabs');

    // Botones
    document.getElementById('btn-tab-estrenos').classList.toggle('active', tab === 'estrenos');
    if (document.getElementById('btn-tab-que-ver')) document.getElementById('btn-tab-que-ver').classList.toggle('active', tab === 'que-ver');
    document.getElementById('btn-tab-explorar').classList.toggle('active', tab === 'explorar');
    document.getElementById('btn-tab-recomendaciones').classList.toggle('active', tab === 'recomendaciones');
    document.getElementById('btn-tab-vistas').classList.toggle('active', tab === 'vistas');
    
    // Contenedores
    document.getElementById('tab-estrenos').classList.toggle('hidden', tab !== 'estrenos');
    if (document.getElementById('tab-que-ver')) document.getElementById('tab-que-ver').classList.toggle('hidden', tab !== 'que-ver');
    document.getElementById('tab-explorar').classList.toggle('hidden', tab !== 'explorar');
    document.getElementById('tab-recomendaciones').classList.toggle('hidden', tab !== 'recomendaciones');
    document.getElementById('tab-vistas').classList.toggle('hidden', tab !== 'vistas');

    if (tab === 'estrenos') loadEstrenos();
    if (tab === 'que-ver') loadQueVerAhora();
    if (tab === 'explorar') loadExplorar();
    if (tab === 'recomendaciones') loadRecomendaciones();
    if (tab === 'vistas') loadVistas();
}

function applyFilters() {
    switchTab('explorar');
}

function toggleSidebar() {
    const layout = document.querySelector('.layout');
    layout.classList.toggle('sidebar-hidden');
}

// =========================================================================
// AUTENTICACIÓN (MODAL)
// =========================================================================
function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    document.getElementById('auth-error').textContent = '';
}

function setAuthMode(mode) {
    currentAuthMode = mode;
    document.getElementById('toggle-login').classList.toggle('active', mode === 'login');
    document.getElementById('toggle-register').classList.toggle('active', mode === 'register');
    document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'Entrar' : 'Crear Cuenta';
    document.getElementById('auth-error').textContent = '';

    const groupName = document.getElementById('group-name');
    const inputName = document.getElementById('auth-name');
    if (mode === 'register') {
        groupName.classList.remove('hidden');
        inputName.setAttribute('required', 'true');
    } else {
        groupName.classList.add('hidden');
        inputName.removeAttribute('required');
    }
}

function handleAuth(e) {
    e.preventDefault();
    const emailVal = document.getElementById('auth-email').value.trim().toLowerCase();
    const passVal = document.getElementById('auth-password').value.trim();
    const nameVal = document.getElementById('auth-name') ? document.getElementById('auth-name').value.trim() : '';
    const errorDiv = document.getElementById('auth-error');

    if (currentAuthMode === 'register') {
        if (usersDB.find(u => u.email === emailVal)) {
            errorDiv.textContent = 'El email ya está registrado.';
            return;
        }
        const newUser = { 
            email: emailVal, 
            username: nameVal || emailVal.split('@')[0], 
            password: passVal, 
            seenMovies: [],
            watchLater: [] 
        };
        usersDB.push(newUser);
        saveDB();
        loginUser(newUser);
    } else {
        // Encontrar por email, o por si acaso hay cuentas antiguas, por username (retrocompatibilidad)
        const user = usersDB.find(u => (u.email === emailVal || u.username === emailVal) && u.password === passVal);
        if (user) {
            loginUser(user);
        } else {
            errorDiv.textContent = 'Email o contraseña incorrectos.';
        }
    }
}

function loginUser(user) {
    currentUser = user;
    localStorage.setItem('cinematch_active_user', user.email || user.username);
    closeAuthModal();
    renderHeader();
    
    // Recargar la vista actual para actualizar los botones "Visto"
    if (currentTab === 'explorar') loadExplorar();
    if (currentTab === 'estrenos') loadEstrenos();
    if (currentTab === 'recomendaciones') loadRecomendaciones();
    if (currentTab === 'vistas') loadVistas();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('cinematch_active_user');
    renderHeader();
    
    // Forzar recarga a explorar si estábamos en recomendaciones
    switchTab('explorar'); 
}

function saveDB() {
    if (currentUser) {
        const idx = usersDB.findIndex(u => (u.email && u.email === currentUser.email) || (!u.email && u.username === currentUser.username));
        if (idx > -1) usersDB[idx] = currentUser;
    }
    localStorage.setItem('cinematch_users', JSON.stringify(usersDB));
}

// =========================================================================
// PESTAÑA: EXPLORAR
// =========================================================================
async function fetchGenres() {
    try {
        const [movieRes, tvRes] = await Promise.all([
            fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=es-ES`),
            fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=es-ES`)
        ]);

        const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);
        
        // Mapear todos los géneros (algunos IDs pueden coincidir)
        movieData.genres.forEach(g => { genresMap[g.id] = g.name; });
        tvData.genres.forEach(g => { genresMap[g.id] = g.name; });

        // Poblamos con los géneros del tipo actual
        populateGenreChips(currentType === 'movie' ? movieData.genres : tvData.genres);
    } catch (e) { console.error('Error fetching genres:', e); }
}

async function toggleType(type) {
    if (currentType === type) return;
    currentType = type;
    selectedGenres = []; // Resetear géneros al cambiar de tipo
    
    document.getElementById('type-movie').classList.toggle('active', type === 'movie');
    document.getElementById('type-tv').classList.toggle('active', type === 'tv');
    
    // Actualizar géneros
    if (!isDemoMode) {
        const res = await fetch(`${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=es-ES`);
        const data = await res.json();
        populateGenreChips(data.genres);
    }
    
    loadExplorar();
}

function populateGenreChips(genresList) {
    const container = document.getElementById('genre-container');
    container.innerHTML = '';
    
    genresList.sort((a,b) => a.name.localeCompare(b.name)).forEach(g => {
        const chip = document.createElement('div');
        chip.className = 'genre-chip';
        chip.textContent = g.name;
        chip.onclick = () => toggleGenre(g.id, chip);
        container.appendChild(chip);
    });
}

function toggleGenre(id, chipElement) {
    const index = selectedGenres.indexOf(id);
    if (index === -1) {
        selectedGenres.push(id);
        chipElement.classList.add('active');
    } else {
        selectedGenres.splice(index, 1);
        chipElement.classList.remove('active');
    }
}

async function loadExplorar(append = false) {
    if (!append) {
        explorarPage = 1;
        const grid = document.getElementById('grid-explorar');
        grid.innerHTML = `<div class="loading">Buscando ${currentType === 'movie' ? 'películas' : 'series'}...</div>`;
    }
    
    if (isLoadingMore) return;
    isLoadingMore = true;

    const grid = document.getElementById('grid-explorar');
    
    // Añadir loader al final si estamos haciendo scroll
    if (append) {
        const loader = document.createElement('div');
        loader.className = 'bottom-loader';
        loader.id = 'infinite-scroll-loader';
        loader.textContent = 'Cargando más...';
        grid.appendChild(loader);
    }
    const platform = currentPlatform;
    const query = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : '';
    let movies = [];

    if (isDemoMode) {
        await new Promise(r => setTimeout(r, 400));
        movies = demoMovies.filter(m => {
            const title = m.title || m.name;
            if (query && !title.toLowerCase().includes(query.toLowerCase())) return false;
            if (selectedGenres.length > 0 && !selectedGenres.some(id => m.genre_ids.includes(id))) return false;
            return true;
        });
    } else {
        try {
            let data;
            const genresQuery = selectedGenres.join(',');
            
            if (query) {
                const res = await fetch(`${BASE_URL}/search/${currentType}?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=${explorarPage}`);
                data = await res.json();
                movies = data.results || [];
                
                if (selectedGenres.length > 0) {
                    movies = movies.filter(m => m.genre_ids && selectedGenres.some(id => m.genre_ids.includes(id)));
                }
            } else {
                let url = `${BASE_URL}/discover/${currentType}?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&page=${explorarPage}`;
                if (selectedGenres.length > 0) url += `&with_genres=${genresQuery}`;
                if (platform) url += `&with_watch_providers=${platform}&watch_region=ES`;

                const res = await fetch(url);
                data = await res.json();
                movies = data.results || [];
            }
        } catch (e) {
            if (!append) {
                grid.innerHTML = '<div class="loading" style="color: var(--danger)">Error al conectar con TMDB.</div>';
            }
            isLoadingMore = false;
            return;
        }
    }
    
    // Quitar loader si existe
    const loader = document.getElementById('infinite-scroll-loader');
    if (loader) loader.remove();

    renderMovies(movies, grid, false, append);
    isLoadingMore = false;
}

// =========================================================================
// PESTAÑA: ESTRENOS
// =========================================================================
async function loadEstrenos() {
    const container = document.getElementById('estrenos-rows-container');
    container.innerHTML = `<div class="loading">Organizando tops por categoría...</div>`;

    const movieGenres = [
        { id: 28, name: 'Acción' },
        { id: 35, name: 'Comedia' },
        { id: 10749, name: 'Romance' },
        { id: 9648, name: 'Misterio' }
    ];
    const tvGenres = [
        { id: 10759, name: 'Acción y Aventura' },
        { id: 35, name: 'Comedia' },
        { id: 18, name: 'Drama' },
        { id: 9648, name: 'Misterio' }
    ];

    if (isDemoMode) {
        container.innerHTML = '<h2>Películas</h2>';
        movieGenres.forEach(g => renderGenreRow(g.name, demoMovies.slice(0, 10), container));
        container.innerHTML += '<h2 style="margin-top: 40px">Series</h2>';
        tvGenres.forEach(g => renderGenreRow(g.name, demoMovies.slice(0, 10), container));
    } else {
        try {
            container.innerHTML = '';
            
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(today.getDate() - 30);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const dateGte = formatDate(lastMonth);
            const dateLte = formatDate(today);

            // Función interna para cargar un grupo de géneros
            const loadGroup = async (genres, type, label) => {
                const header = document.createElement('h1');
                header.className = 'section-title-estrenos';
                header.textContent = label;
                container.appendChild(header);

                const requests = genres.map(genre => {
                    let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&page=1&with_genres=${genre.id}`;
                    if (type === 'movie') {
                        url += `&primary_release_date.gte=${dateGte}&primary_release_date.lte=${dateLte}`;
                    } else {
                        url += `&first_air_date.gte=${dateGte}&first_air_date.lte=${dateLte}`;
                    }
                    return fetch(url).then(r => r.json()).then(data => ({ name: genre.name, movies: data.results.slice(0, 10) }));
                });

                const results = await Promise.all(requests);
                results.forEach(res => {
                    if (res.movies.length > 0) {
                        renderGenreRow(res.name, res.movies, container);
                    }
                });
            };

            await loadGroup(movieGenres, 'movie', 'Películas');
            await loadGroup(tvGenres, 'tv', 'Series');

        } catch (e) {
            container.innerHTML = '<div class="loading" style="color: var(--danger)">Error al cargar las categorías.</div>';
        }
    }
}

function renderGenreRow(title, movies, container) {
    const row = document.createElement('div');
    row.className = 'genre-row';
    
    const h2 = document.createElement('h2');
    h2.className = 'genre-row-title';
    h2.textContent = title;
    
    const grid = document.createElement('div');
    grid.className = 'horizontal-grid';
    
    row.appendChild(h2);
    row.appendChild(grid);
    container.appendChild(row);
    
    renderMovies(movies, grid, false, false);
}

async function loadQueVerAhora() {
    const grid = document.getElementById('grid-que-ver');
    
    // Si es la primera vez, cargar géneros en el select rápido
    const quickGenreSelect = document.getElementById('quick-genre');
    if (quickGenreSelect && quickGenreSelect.children.length <= 1) {
        Object.keys(genresMap).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = genresMap[id];
            quickGenreSelect.appendChild(opt);
        });
    }

    grid.innerHTML = `<div class="empty-state">
        <h3>¿No sabes qué ver?</h3>
        <p>Selecciona tus preferencias arriba y encontraremos algo perfecto para ti.</p>
    </div>`;
}

async function getQuickRecommendation() {
    const type = document.getElementById('quick-type').value;
    const genre = document.getElementById('quick-genre').value;
    const platform = document.getElementById('quick-platform').value;
    const grid = document.getElementById('grid-que-ver');

    grid.innerHTML = `<div class="loading">Buscando tus 5 recomendaciones ideales...</div>`;

    let results = [];
    if (isDemoMode) {
        await new Promise(r => setTimeout(r, 600));
        results = [...demoMovies].sort(() => Math.random() - 0.5).slice(0, 5);
    } else {
        try {
            // Pagina aleatoria para variar resultados (1-5)
            const randomPage = Math.floor(Math.random() * 5) + 1;
            let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&page=${randomPage}`;
            if (genre) url += `&with_genres=${genre}`;
            if (platform) url += `&with_watch_providers=${platform}&watch_region=ES`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            let rawResults = data.results || [];
            
            // Barajar resultados iniciales para dar variedad
            rawResults.sort(() => Math.random() - 0.5);

            // Aplicar afinidad según gustos
            if (currentUser && currentUser.seenMovies && currentUser.seenMovies.length > 0) {
                const counts = {};
                currentUser.seenMovies.forEach(m => {
                    if (m.genres) m.genres.forEach(g => counts[g] = (counts[g] || 0) + 1);
                });
                
                rawResults.forEach(m => {
                    // Score base por gustos + pequeño factor aleatorio para que no sea siempre lo mismo
                    const affinity = m.genre_ids.reduce((acc, gid) => acc + (counts[gid] || 0), 0);
                    m.finalScore = affinity + (Math.random() * 2); 
                });
                
                rawResults.sort((a, b) => b.finalScore - a.finalScore);
            }
            
            results = rawResults.slice(0, 5);
        } catch (e) {
            grid.innerHTML = '<div class="loading" style="color: var(--danger)">Error al conectar con TMDB.</div>';
            return;
        }
    }

    if (results.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No encontramos nada con esos filtros</h3><p>Intenta cambiar el género o la plataforma.</p></div>';
    }
}

// =========================================================================
// PESTAÑA: RECOMENDACIONES
// =========================================================================
async function loadRecomendaciones(append = false) {
    const grid = document.getElementById('grid-recomendaciones');
    
    if (!append) {
        recomendacionPage = 1;
        grid.innerHTML = '<div class="loading">Calculando tus mejores coincidencias...</div>';
    }
    
    if (!currentUser) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>¡Descubre tu CineMatch!</h3>
                <p>Crea una cuenta para que podamos analizar tus gustos y recomendarte qué ver.</p>
                <button class="btn-primary" onclick="openAuthModal('login')">Iniciar Sesión / Crear Cuenta</button>
            </div>
        `;
        return;
    }

    // 1. Verificar si hay usuario y si tiene historial
    if (!currentUser.seenMovies || currentUser.seenMovies.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Aún no tienes historial</h3>
                <p>Ve a la pestaña "Explorar" y marca algunas películas como "Vistas" para empezar.</p>
                <button class="btn-primary" onclick="switchTab('explorar')">Ir a Explorar</button>
            </div>
        `;
        return;
    }

    // 2. Identificar los likes más recientes para buscar similitudes
    const recentLikes = currentUser.seenMovies
        .filter(m => m.liked)
        .reverse()
        .slice(0, 5);

    // Si no hay likes, mostramos un mensaje invitando a dar like
    if (recentLikes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>¡Danos un ❤️ para empezar!</h3>
                <p>Para darte recomendaciones exactas, necesitamos saber qué películas te encantan.</p>
                <button class="btn-primary" onclick="switchTab('explorar')">Ver Películas</button>
            </div>
        `;
        return;
    }

    if (isLoadingMore && append) return;
    isLoadingMore = true;

    // Calcular pesos de géneros para el refinamiento final
    const genreWeights = {};
    currentUser.seenMovies.forEach(m => {
        const w = m.liked ? 10 : 2;
        if (m.genres) m.genres.forEach(gid => genreWeights[gid] = (genreWeights[gid] || 0) + w);
    });

    // Añadir loader al final si estamos haciendo scroll
    if (append) {
        const loader = document.createElement('div');
        loader.className = 'bottom-loader';
        loader.id = 'infinite-scroll-loader';
        loader.textContent = 'Calculando más para ti...';
        grid.appendChild(loader);
    }

    let candidateMovies = [];
    if (isDemoMode) {
        await new Promise(r => setTimeout(r, 600));
        candidateMovies = [...demoMovies].sort(() => Math.random() - 0.5);
    } else {
        try {
            // ALGORITMO AVANZADO: Buscamos recomendaciones basadas en cada Like reciente
            // Usamos la página actual para rotar entre los likes o pedir más páginas de cada uno
            const requests = recentLikes.map(fav => {
                const type = fav.movieData && fav.movieData.first_air_date ? 'tv' : 'movie';
                return fetch(`${BASE_URL}/${type}/${fav.id}/recommendations?api_key=${API_KEY}&language=es-ES&page=${recomendacionPage}`)
                    .then(r => r.json());
            });

            const results = await Promise.all(requests);
            results.forEach(data => {
                if (data.results) candidateMovies.push(...data.results);
            });

            // Si hay pocos resultados de recomendaciones directas, rellenamos con discover de los géneros top
            if (candidateMovies.length < 10) {
                const topGenres = Object.entries(genreWeights).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
                const res = await fetch(`${BASE_URL}/discover/${currentType}?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&with_genres=${topGenres.join(',')}&page=${recomendacionPage}`);
                const data = await res.json();
                if (data.results) candidateMovies.push(...data.results);
            }
        } catch (e) {
            console.error("Error en algoritmo:", e);
            isLoadingMore = false;
            return;
        }
    }

    const seenIds = currentUser.seenMovies.map(m => m.id);
    // Eliminar duplicados y vistos
    const uniqueCandidates = [];
    const usedIds = new Set();
    
    candidateMovies.forEach(m => {
        if (!seenIds.includes(m.id) && !usedIds.has(m.id)) {
            uniqueCandidates.push(m);
            usedIds.add(m.id);
        }
    });

    uniqueCandidates.forEach(movie => {
        let affinity = 0;
        if (movie.genre_ids) {
            movie.genre_ids.forEach(gid => {
                if (genreWeights[gid]) affinity += genreWeights[gid];
            });
        }
        // Score: afinidad de género + puntuación base
        movie.affinityScore = affinity + (movie.vote_average || 0);
    });

    const scores = uniqueCandidates.map(m => m.affinityScore || 0);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    const recommendedMovies = uniqueCandidates
        .sort((a, b) => b.affinityScore - a.affinityScore)
        .map(movie => {
            if (maxScore > 0 && movie.affinityScore >= maxScore * 0.8) {
                movie.isHighAffinity = true;
            }
            return movie;
        });

    // Quitar loader si existe
    const loader = document.getElementById('infinite-scroll-loader');
    if (loader) loader.remove();

    if (recommendedMovies.length === 0 && append && recomendacionPage < 20) {
        // Si no hay resultados en esta página pero estamos escrolleando,
        // intentamos automáticamente con la siguiente página (hasta un límite de 20)
        recomendacionPage++;
        isLoadingMore = false; 
        return loadRecomendaciones(true);
    }

    if (recommendedMovies.length === 0 && !append) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Necesitamos conocerte un poco más</h3>
                <p>Marca más contenido en "Explorar" para poder encontrar similitudes y nuevas recomendaciones.</p>
            </div>
        `;
    } else if (recommendedMovies.length > 0) {
        renderMovies(recommendedMovies, grid, true, append);
    }
    
    isLoadingMore = false;
}

// =========================================================================
// PESTAÑA: VISTAS (MI LISTA)
// =========================================================================
function filterVistas(filter) {
    currentVistasFilter = filter;
    document.getElementById('filter-all-seen').style.background = filter === 'all' ? 'var(--accent)' : 'transparent';
    document.getElementById('filter-all-seen').style.borderColor = filter === 'all' ? 'transparent' : 'rgba(0,0,0,0.1)';
    
    document.getElementById('filter-liked').style.background = filter === 'liked' ? 'var(--accent)' : 'transparent';
    document.getElementById('filter-liked').style.borderColor = filter === 'liked' ? 'transparent' : 'rgba(0,0,0,0.1)';
    
    if (document.getElementById('filter-later')) {
        document.getElementById('filter-later').style.background = filter === 'later' ? 'var(--accent)' : 'transparent';
        document.getElementById('filter-later').style.borderColor = filter === 'later' ? 'transparent' : 'rgba(0,0,0,0.1)';
    }
    
    loadVistas();
}

function loadVistas() {
    const grid = document.getElementById('grid-vistas');
    
    if (!currentUser) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Inicia sesión para ver tu lista</h3>
                <button class="btn-primary" onclick="openAuthModal('login')">Iniciar Sesión</button>
            </div>
        `;
        return;
    }

    if ((!currentUser.seenMovies || currentUser.seenMovies.length === 0) && (!currentUser.watchLater || currentUser.watchLater.length === 0)) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Aún no has visto nada</h3>
                <p>Ve a "Explorar" y marca tus primeros favoritos.</p>
                <button class="btn-primary" onclick="switchTab('explorar')">Explorar</button>
            </div>
        `;
        return;
    }

    let moviesToRender = [];

    if (currentVistasFilter === 'later') {
        moviesToRender = currentUser.watchLater || [];
    } else {
        moviesToRender = currentUser.seenMovies.filter(sm => {
            if (currentVistasFilter === 'liked') return sm.liked;
            return true; // 'all'
        }).map(sm => {
            const m = sm.movieData || {};
            return {
                id: sm.id,
                title: m.title || m.name || 'Título desconocido',
                vote_average: m.vote_average || 0,
                genre_ids: sm.genres || m.genre_ids || [],
                poster_path: m.poster_path || null
            };
        });
    }

    if (moviesToRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No hay películas aquí</h3>
            </div>
        `;
        return;
    }

    renderMovies(moviesToRender, grid, false);
}

// =========================================================================
// RENDERIZADO Y ACCIONES
// =========================================================================
function renderMovies(movies, gridElement, isRecommendationTab, append = false) {
    if (!append) gridElement.innerHTML = '';

    if (movies.length === 0) {
        if (!append) gridElement.innerHTML = '<div class="loading">No se encontraron películas.</div>';
        return;
    }
    
    movies.forEach(movie => {
        const seenObj = currentUser ? currentUser.seenMovies.find(sm => sm.id === movie.id) : null;
        const isSeen = !!seenObj;
        const isLiked = seenObj ? seenObj.liked : false;
        const isWatchLater = currentUser && currentUser.watchLater ? currentUser.watchLater.some(m => m.id === movie.id) : false;
        
        const movieTitle = movie.title || movie.name || 'Título desconocido';
        const genreNames = movie.genre_ids.map(id => genresMap[id]).filter(Boolean).slice(0, 3).join(', ');
        
        let scoreColor = 'var(--danger)';
        if (movie.vote_average >= 7) scoreColor = 'var(--success)';
        else if (movie.vote_average >= 5) scoreColor = 'var(--warning)';
        
        const posterSrc = movie.poster_path 
            ? `${IMAGE_BASE_URL}${movie.poster_path}` 
            : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750" fill="%23161925"%3E%3Crect width="100%25" height="100%25"/%3E%3Ctext x="50%25" y="50%25" fill="%238e95a5" font-family="sans-serif" font-size="24" text-anchor="middle"%3ESin P%C3%B3ster%3C/text%3E%3C/svg%3E';

        const showBadge = isRecommendationTab || movie.isHighAffinity;

        const card = document.createElement('div');
        card.className = `movie-card ${showBadge ? 'high-affinity' : ''}`;
        
        card.innerHTML = `
            <div class="poster" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(movieTitle + ' trailer')}', '_blank')" style="cursor: pointer">
                ${showBadge ? `<div class="affinity-badge">${isRecommendationTab ? 'Recomendada para ti' : 'Match Perfecto'}</div>` : ''}
                <img src="${posterSrc}" alt="${movieTitle}" loading="lazy">
                <div class="score" style="color: ${scoreColor}; border-color: ${scoreColor}">
                    ${(movie.vote_average || 0).toFixed(1)}
                </div>
            </div>
            <div class="info">
                <h3 class="title">${movieTitle}</h3>
                <p class="genres">${genreNames || 'Géneros desconocidos'}</p>
                <div class="card-actions">
                    <button class="btn-seen ${isSeen ? 'active' : ''}" 
                            data-id="${movie.id}" 
                            data-genres='${JSON.stringify(movie.genre_ids)}'
                            title="${isSeen ? 'Quitar de vistos' : 'Marcar como visto'}">
                        👁️
                    </button>
                    <button class="btn-like ${isLiked ? 'active' : ''}" 
                            data-id="${movie.id}" 
                            title="${isLiked ? 'Quitar de favoritas' : 'Me gusta'}">
                        ❤️
                    </button>
                    <button class="btn-later ${isWatchLater ? 'active' : ''}" 
                            data-id="${movie.id}" 
                            title="${isWatchLater ? 'Quitar de ver más tarde' : 'Ver más tarde'}">
                        🔖
                    </button>
                </div>
            </div>
        `;
        
        const btnSeen = card.querySelector('.btn-seen');
        btnSeen.addEventListener('click', () => {
            toggleSeen(movie.id, movie.genre_ids, btnSeen, movie);
            if (currentUser && (currentTab === 'recomendaciones' || currentTab === 'vistas')) {
                setTimeout(() => currentTab === 'vistas' ? loadVistas() : loadRecomendaciones(), 400);
            }
        });

        const btnLike = card.querySelector('.btn-like');
        btnLike.addEventListener('click', () => {
            toggleLike(movie.id, movie.genre_ids, btnLike, btnSeen, movie);
            if (currentUser && currentTab === 'vistas') {
                setTimeout(() => loadVistas(), 400);
            }
        });

        const btnLater = card.querySelector('.btn-later');
        btnLater.addEventListener('click', () => {
            toggleWatchLater(movie, btnLater);
            if (currentUser && currentTab === 'vistas') {
                setTimeout(() => loadVistas(), 400);
            }
        });
        
        gridElement.appendChild(card);
    });
}

function toggleSeen(id, genres, btn, movieObj) {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    const index = currentUser.seenMovies.findIndex(m => m.id === id);
    
    if (index === -1) {
        currentUser.seenMovies.push({ id, genres, liked: false, movieData: movieObj });
        btn.classList.add('active');
        btn.innerHTML = '👁️';
    } else {
        currentUser.seenMovies.splice(index, 1);
        btn.classList.remove('active');
        btn.innerHTML = '👁️';
        
        // Desmarcar like también visualmente
        const likeBtn = btn.nextElementSibling;
        if (likeBtn) likeBtn.classList.remove('active');
    }
    
    saveDB();
}

function toggleLike(id, genres, btnLike, btnSeen, movieObj) {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    let seenObj = currentUser.seenMovies.find(m => m.id === id);
    
    if (!seenObj) {
        // Al dar like, automáticamente se marca como vista
        seenObj = { id, genres, liked: true, movieData: movieObj };
        currentUser.seenMovies.push(seenObj);
        
        btnSeen.classList.add('active');
        btnSeen.innerHTML = '👁️';
        btnLike.classList.add('active');
    } else {
        seenObj.liked = !seenObj.liked;
        // Si es antiguo y no tenía movieData, se la añadimos
        if (!seenObj.movieData) seenObj.movieData = movieObj; 
        
        btnLike.classList.toggle('active', seenObj.liked);
    }
    
    saveDB();
}

function toggleWatchLater(movie, btn) {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    if (!currentUser.watchLater) currentUser.watchLater = [];
    
    const index = currentUser.watchLater.findIndex(m => m.id === movie.id);
    if (index === -1) {
        currentUser.watchLater.push({
            id: movie.id,
            title: movie.title || movie.name,
            poster_path: movie.poster_path,
            genre_ids: movie.genre_ids,
            vote_average: movie.vote_average || 0
        });
        btn.classList.add('active');
    } else {
        currentUser.watchLater.splice(index, 1);
        btn.classList.remove('active');
    }
    saveDB();
}

// =========================================================================
// INICIO
// =========================================================================
async function initApp() {
    // Comprobar si hay sesión activa persistente
    const activeIdentifier = localStorage.getItem('cinematch_active_user');
    if (activeIdentifier) {
        const user = usersDB.find(u => u.email === activeIdentifier || u.username === activeIdentifier);
        if (user) currentUser = user;
    }

    renderHeader();

    if (isDemoMode) {
        document.getElementById('demo-banner').style.display = 'block';
        genresMap = demoGenres;
        populateGenreSelect(Object.keys(demoGenres).map(id => ({ id: parseInt(id), name: demoGenres[id] })));
    } else {
        await fetchGenres();
    }

    // Inicializar botones de plataforma
    const platformBtns = document.querySelectorAll('.platform-btn');
    platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            platformBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPlatform = btn.getAttribute('data-id');
        });
    });

    // Arrancar directamente en la pestaña inicial
    switchTab('estrenos');

    // Inicializar búsqueda predictiva
    initPredictiveSearch();

    // Inicializar Scroll Infinito
    window.addEventListener('scroll', () => {
        if (currentTab !== 'explorar' && currentTab !== 'que-ver' && currentTab !== 'recomendaciones') return;
        
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const clientHeight = window.innerHeight;

        // Si estamos cerca del final (800px antes para mayor fluidez)
        if (scrollTop + clientHeight >= scrollHeight - 800) {
            if (!isLoadingMore) {
                if (currentTab === 'explorar') {
                    explorarPage++;
                    loadExplorar(true);
                }
                if (currentTab === 'recomendaciones') {
                    recomendacionPage++;
                    loadRecomendaciones(true);
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);

// =========================================================================
// 🔍 BÚSQUEDA PREDICTIVA
// =========================================================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initPredictiveSearch() {
    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');

    if (!searchInput || !suggestionsContainer) return;

    const handleInput = debounce(async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 3) {
            suggestionsContainer.classList.add('hidden');
            return;
        }

        if (isDemoMode) return;

        try {
            const res = await fetch(`${BASE_URL}/search/${currentType}?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1`);
            const data = await res.json();
            renderSuggestions(data.results.slice(0, 6));
        } catch (e) {
            console.error('Error buscando sugerencias:', e);
        }
    }, 300);

    searchInput.addEventListener('input', handleInput);

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.classList.add('hidden');
        }
    });
}

function renderSuggestions(results) {
    const container = document.getElementById('search-suggestions');
    if (results.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.innerHTML = '';
    results.forEach(item => {
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date || '';
        const year = date ? `(${date.split('-')[0]})` : '';
        
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <span class="suggestion-title">${title}</span>
            <span class="suggestion-meta">${currentType === 'movie' ? 'Película' : 'Serie'} ${year}</span>
        `;
        div.onclick = () => {
            document.getElementById('search-input').value = title;
            container.classList.add('hidden');
            applyFilters();
        };
        container.appendChild(div);
    });

    container.classList.remove('hidden');
}
