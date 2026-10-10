// --- State Management ---
const state = {
    tracks: [],
    playlists: [],
    currentPlaylistId: null,
    playbackQueue: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0,
    audioContextInitialized: false,
    activeView: 'view-home',
    trackToAddId: null,
    identifiedYt: null,
    identifiedStream: null,
    trackToDeleteId: null,
    playlistToEditId: null,
    selectedTrackIds: new Set(),
    selectedFavIds: new Set(),
    selectedPlTrackIds: new Set(),
    deleteContext: null
};

// --- DOM Elements ---
const DOM = {
    audio: document.getElementById('audio-player'),
    navBtns: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view-section'),
    miniPlayer: document.getElementById('mini-player'),
    fullPlayerModal: document.getElementById('full-player-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    dndOverlay: document.getElementById('dnd-overlay'),
    libraryList: document.getElementById('library-list'),
    favoritesList: document.getElementById('favorites-list'),
    playlistsGrid: document.getElementById('playlists-grid'),
    playlistDetails: document.getElementById('playlist-details'),
    activePlaylistTitle: document.getElementById('active-playlist-title'),
    playlistTracksList: document.getElementById('playlist-tracks-list'),
    btnBackPlaylists: document.getElementById('btn-back-playlists'),
    fileInput: document.getElementById('file-input'),
    btnShowUrl: document.getElementById('btn-show-url'),
    urlInputContainer: document.getElementById('url-input-container'),
    urlInput: document.getElementById('url-input'),
    btnCheckUrl: document.getElementById('btn-check-url'),
    urlPreviewContainer: document.getElementById('url-preview-container'),
    urlPreviewTitle: document.getElementById('url-preview-title'),
    btnSubmitUrl: document.getElementById('btn-submit-url'),
    searchInput: document.getElementById('search-input'),
    playlistModal: document.getElementById('playlist-modal'),
    btnOpenCreatePlaylist: document.getElementById('btn-open-create-playlist'),
    modalPlaylistName: document.getElementById('modal-playlist-name'),
    btnCancelPlaylist: document.getElementById('btn-cancel-playlist'),
    btnConfirmPlaylist: document.getElementById('btn-confirm-playlist'),
    addToPlModal: document.getElementById('add-to-pl-modal'),
    modalPlaylistsContainer: document.getElementById('modal-playlists-container'),
    btnCancelAddPl: document.getElementById('btn-cancel-add-pl'),
    modalBtnFav: document.getElementById('modal-btn-fav'),
    modalIconFav: document.getElementById('modal-icon-fav'),
    modalBtnAddPl: document.getElementById('modal-btn-add-pl'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    btnNext: document.getElementById('btn-next'),
    btnPrev: document.getElementById('btn-prev'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnRepeat: document.getElementById('btn-repeat'),
    repeatBadge: document.getElementById('repeat-badge'),
    btnMute: document.getElementById('btn-mute'),
    iconVolume: document.getElementById('icon-volume'),
    volumeBar: document.getElementById('volume-bar'),
    progressBar: document.getElementById('progress-bar'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    trackTitle: document.getElementById('track-title'),
    trackArtist: document.getElementById('track-artist'),
    miniProgress: document.getElementById('mini-progress'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    miniIcon: document.getElementById('mini-icon'),
    miniBtnPlay: document.getElementById('mini-btn-play'),
    miniIconPlay: document.getElementById('mini-icon-play'),
    miniIconPause: document.getElementById('mini-icon-pause'),
    miniBtnNext: document.getElementById('mini-btn-next'),
    canvas: document.getElementById('visualizer'),
    visualizerStatus: document.getElementById('visualizer-status'),
    toastContainer: document.getElementById('toastContainer'),
    eqBandsContainer: document.getElementById('eq-bands-container'),
    eqPresets: document.getElementById('eq-presets'),
    dlUrlInput: document.getElementById('dl-url-input'),
    btnDlIdentify: document.getElementById('btn-dl-identify'),
    dlPreviewContainer: document.getElementById('dl-preview-container'),
    dlVideoTitle: document.getElementById('dl-video-title'),
    dlVideoIdLabel: document.getElementById('dl-video-id-label'),
    dlActionButtons: document.getElementById('dl-action-buttons'),
    btnDlConvert: document.getElementById('btn-dl-convert'),
    btnDlAddLibOnly: document.getElementById('btn-dl-add-lib-only'),
    dlProgressContainer: document.getElementById('dl-progress-container'),
    dlProgressBar: document.getElementById('dl-progress-bar'),
    dlProgressText: document.getElementById('dl-progress-text'),
    dlDownloadContainer: document.getElementById('dl-download-container'),
    btnDlDownload: document.getElementById('btn-dl-download'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    miniThumbContainer: document.getElementById('mini-thumb-container'),
    visualizerThumb: document.getElementById('visualizer-thumb'),
    btnSpeed: document.getElementById('btn-speed'),
    volumeIndicator: document.getElementById('volume-indicator'),
    volIndicatorIcon: document.getElementById('vol-indicator-icon'),
    volIndicatorText: document.getElementById('vol-indicator-text'),
};

// --- IndexedDB Wrapper ---
const DB_NAME = 'AuraAudioDB';
const DB_VERSION = 1;
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = event => reject(event.target.error);
        request.onsuccess = event => { db = event.target.result; resolve(); };
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
        };
    });
}

async function dbOp(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast text-sm text-white`;
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// --- Equalizer & Visualizer Setup ---
let audioCtx, analyser, source, dataArray, bufferLength;
const eqFrequencies = [60, 230, 910, 3600, 14000];
const eqFilters = [];
const eqPresetValues = {
    flat: [0, 0, 0, 0, 0],
    bassBoost: [8, 5, 0, -2, -4],
    trebleBoost: [-4, -2, 0, 5, 8],
    electronic: [6, 3, -2, 4, 6],
    vocal: [-2, 1, 6, 4, -1]
};

function buildEQUI() {
    DOM.eqBandsContainer.innerHTML = '';
    eqFrequencies.forEach((freq, index) => {
        const label = freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : freq;
        const html = `
                <div class="flex flex-col items-center gap-3 w-12 sm:w-16">
                    <span class="text-[10px] text-cyan-400 font-bold">+12</span>
                    <div class="h-32 flex items-center justify-center relative w-full">
                        <input type="range" class="eq-slider absolute w-32 -rotate-90 origin-center" min="-12" max="12" step="0.5" value="0" data-index="${index}">
                    </div>
                    <span class="text-[10px] text-violet-400 font-bold">-12</span>
                    <span class="text-xs text-slate-400 mt-2 font-medium">${label}</span>
                </div>
            `;
        DOM.eqBandsContainer.insertAdjacentHTML('beforeend', html);
    });

    document.querySelectorAll('.eq-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const idx = e.target.dataset.index;
            const val = parseFloat(e.target.value);
            if (eqFilters[idx]) eqFilters[idx].gain.value = val;
            DOM.eqPresets.value = 'custom';
        });
    });
}

function applyEQPreset(presetName) {
    const values = eqPresetValues[presetName] || eqPresetValues.flat;
    document.querySelectorAll('.eq-slider').forEach((slider, idx) => {
        slider.value = values[idx];
        if (eqFilters[idx]) eqFilters[idx].gain.value = values[idx];
    });
}

DOM.eqPresets.addEventListener('change', (e) => {
    if (e.target.value !== 'custom') applyEQPreset(e.target.value);
});

function initAudioContext() {
    if (state.audioContextInitialized) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        source = audioCtx.createMediaElementSource(DOM.audio);

        let prevNode = source;
        eqFrequencies.forEach(freq => {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.gain.value = 0;
            eqFilters.push(filter);
            prevNode.connect(filter);
            prevNode = filter;
        });

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        prevNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        state.audioContextInitialized = true;
        DOM.visualizerStatus.textContent = "Visualizer Active";
        DOM.visualizerStatus.classList.add('text-cyan-400');

        applyEQPreset(DOM.eqPresets.value);
        resizeCanvas();
        drawVisualizer();
    } catch (error) {
        console.error("Audio Context Init Error:", error);
    }
}

function resizeCanvas() {
    const parent = DOM.canvas.parentElement;
    DOM.canvas.width = parent.clientWidth;
    DOM.canvas.height = parent.clientHeight;
}
window.addEventListener('resize', () => {
    if (DOM.fullPlayerModal.classList.contains('open')) resizeCanvas();
});

let currentHeights = null;
const canvasCtx = DOM.canvas.getContext('2d');

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!state.audioContextInitialized) return;

    const width = DOM.canvas.width;
    const height = DOM.canvas.height;

    // Inisialisasi array tinggi jika belum ada atau ukurannya berubah
    if (!currentHeights || currentHeights.length !== bufferLength) {
        currentHeights = new Float32Array(bufferLength);
    }

    let hasActiveBars = false;

    if (state.isPlaying) {
        // Ambil data frekuensi asli dari analyser
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
            const targetHeight = (dataArray[i] / 255) * height;

            // Interpolasi (Lerp): Bergerak menuju target, baik saat naik maupun turun
            // Angka "0.2" adalah kecepatan respons. Ubah ke 0.3 atau 0.4 jika ingin lebih cepat/responsif,
            // atau 0.1 jika ingin lebih lambat/halus.
            currentHeights[i] += (targetHeight - currentHeights[i]) * 0.2;

            if (currentHeights[i] > 0.5) {
                hasActiveBars = true;
            }
        }
    } else {
        // Efek turun (decay) secara smooth saat di-pause
        for (let i = 0; i < bufferLength; i++) {
            if (currentHeights[i] > 0.5) {
                // Mengalikan dengan 0.85 untuk efek turun yang mulus (ease-out)
                currentHeights[i] *= 0.85;
                hasActiveBars = true;
            } else {
                currentHeights[i] = 0;
            }
        }
    }

    // Kalau lagu pause DAN semua bar sudah benar-benar turun ke 0, bersihkan canvas dan hentikan render frame
    if (!state.isPlaying && !hasActiveBars) {
        canvasCtx.clearRect(0, 0, width, height);
        return;
    }

    // Gambar ke canvas
    canvasCtx.clearRect(0, 0, width, height);
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = currentHeights[i];

        if (barHeight > 0) {
            const gradient = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#06b6d4');
            gradient.addColorStop(1, '#8b5cf6');
            canvasCtx.fillStyle = gradient;
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
            canvasCtx.fill();
        }
        x += barWidth;
    }
}

// --- Helper YouTube Extractor ---
async function fetchYoutubeData(url) {
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(ytRegExp);
    const ytId = (match && match[2].length === 11) ? match[2] : null;
    if (!ytId) return null;

    const apiKey = '292ccd4233mshdb583dc9b29cf34p128bd2jsn36ab6878050f';
    const apiHost = 'youtube-mp36.p.rapidapi.com';
    const apiUrl = `https://${apiHost}/dl?id=${ytId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': apiHost
            }
        });

        const data = await response.json();

        if (data.status === "ok" && data.link) {
            return {
                id: ytId,
                title: data.title || `YouTube Audio (${ytId})`,
                streamUrl: data.link,
                cover: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` // Tambahan thumbnail cover
            };
        } else {
            console.error("Gagal mengambil data dari API:", data);
            return null;
        }
    } catch (e) {
        console.error("Error fetching YouTube API:", e);
        return null;
    }
}

// --- Navigation ---
function switchView(viewId) {
    DOM.views.forEach(v => v.classList.remove('active'));
    DOM.navBtns.forEach(btn => btn.classList.remove('active', 'bg-white/10', 'text-white'));
    DOM.navBtns.forEach(btn => btn.classList.add('text-slate-400'));

    document.getElementById(viewId).classList.add('active');
    const activeBtn = document.querySelector(`[data-target="${viewId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('active', 'bg-white/10', 'text-white');
    }
    state.activeView = viewId;
}

DOM.navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.target)));

// --- Track HTML Builder ---
function createTrackHTML(track, context = 'library', playlistId = null) {
    const isActive = state.playbackQueue[state.currentIndex]?.id === track.id;

    let iconBgColor = 'from-cyan-500/20 to-blue-500/20 text-cyan-400';
    let iconClass = 'ph-file-audio';
    let subtitle = 'Local File';

    if (track.type === 'youtube') {
        iconBgColor = 'from-amber-500/20 to-orange-500/20 text-amber-400';
        iconClass = 'ph-youtube-logo';
        subtitle = 'YouTube Stream';
    } else if (track.type === 'url') {
        iconBgColor = 'from-violet-500/20 to-purple-500/20 text-violet-400';
        iconClass = 'ph-globe';
        subtitle = 'External Stream';
    }

    let actionHtml = '';
    let checkboxHtml = '';

    if (context === 'library') {
        const isChecked = state.selectedTrackIds?.has(track.id) ? 'checked' : '';
        checkboxHtml = `<input type="checkbox" class="track-checkbox w-4 h-4 accent-cyan-500 rounded cursor-pointer mr-3 shrink-0" data-id="${track.id}" ${isChecked}>`;
        const heartClass = track.isFavorite ? 'ph-fill text-pink-500' : 'ph text-slate-400 hover:text-pink-400';
        actionHtml = `
                <button class="btn-fav p-2" data-id="${track.id}" title="Favorite"><i class="${heartClass} text-xl transition-colors"></i></button>
                <button class="btn-open-add-pl p-2 text-slate-400 hover:text-cyan-400 transition-colors" data-id="${track.id}" title="Add to Playlist"><i class="ph ph-plus text-xl"></i></button>
                <button class="btn-del-library p-2 text-slate-400 hover:text-red-400 transition-colors" data-id="${track.id}" title="Delete Permanently"><i class="ph ph-trash text-xl"></i></button>
            `;
    } else if (context === 'favorites') {
        const isChecked = state.selectedFavIds?.has(track.id) ? 'checked' : '';
        checkboxHtml = `<input type="checkbox" class="fav-checkbox w-4 h-4 accent-cyan-500 rounded cursor-pointer mr-3 shrink-0" data-id="${track.id}" ${isChecked}>`;
        actionHtml = `
                <button class="btn-fav p-2" data-id="${track.id}" title="Favorite"><i class="ph-fill text-pink-500 text-xl transition-colors"></i></button>
                <button class="btn-open-add-pl p-2 text-slate-400 hover:text-cyan-400 transition-colors" data-id="${track.id}" title="Add to Playlist"><i class="ph ph-plus text-xl"></i></button>
                <button class="btn-del-fav p-2 text-slate-400 hover:text-red-400 transition-colors" data-id="${track.id}" title="Remove from Favorites"><i class="ph ph-trash text-xl"></i></button>
            `;
    } else if (context === 'playlist') {
        const isChecked = state.selectedPlTrackIds?.has(track.id) ? 'checked' : '';
        checkboxHtml = `<input type="checkbox" class="pl-checkbox w-4 h-4 accent-cyan-500 rounded cursor-pointer mr-3 shrink-0" data-id="${track.id}" ${isChecked}>`;
        actionHtml = `
                <button class="btn-remove-from-playlist p-2 text-slate-400 hover:text-red-400 transition-colors" data-id="${track.id}" data-pid="${playlistId}" title="Remove from Playlist">
                    <i class="ph ph-x-circle text-xl"></i>
                </button>
            `;
    }

    return `
            <div class="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-white/10 border border-white/20 shadow-md' : 'glass-panel glass-hover'}" data-id="${track.id}">
                <div class="flex items-center gap-2 overflow-hidden flex-grow">
                    ${checkboxHtml}
                    <div class="flex items-center gap-4 overflow-hidden flex-grow track-play-trigger">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${iconBgColor} flex items-center justify-center shrink-0 relative shadow-inner border border-white/10 overflow-hidden">
        ${track.cover
            ? `<img src="${track.cover}" class="absolute inset-0 w-full h-full object-cover z-0">`
            : `<i class="ph ${iconClass} text-2xl relative z-10 ${isActive ? 'text-cyan-400' : 'group-hover:scale-110 transition-transform'}"></i>`
        }
        ${isActive && state.isPlaying
            ? `<div class="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-[2px] z-20">
                <div class="playing-indicator"><span></span><span></span><span></span></div>
            </div>`
            : ''
        }
    </div>
                        <div class="flex flex-col truncate">
                            <span class="text-sm font-semibold truncate ${isActive ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}">${track.name}</span>
                            <span class="text-xs text-slate-500 mt-0.5">${subtitle}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0 ml-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    ${actionHtml}
                </div>
            </div>
        `;
}

// --- Render Functions ---
function renderLibrary(query = '') {
    let filtered = state.tracks;
    if (query) {
        const q = query.toLowerCase();
        filtered = state.tracks.filter(t => t.name.toLowerCase().includes(q));
    }
    if (filtered.length === 0) {
        DOM.libraryList.innerHTML = `<div class="text-center text-slate-500 py-10">No tracks found. Drop audio files or add URL.</div>`;
        return;
    }
    DOM.libraryList.innerHTML = filtered.map(t => createTrackHTML(t, 'library')).join('');
    attachTrackListeners(DOM.libraryList, filtered);
}

function renderFavorites() {
    const favs = state.tracks.filter(t => t.isFavorite);
    if (favs.length === 0) {
        DOM.favoritesList.innerHTML = `<div class="text-center text-slate-500 py-10">No favorites yet.</div>`;
        return;
    }
    DOM.favoritesList.innerHTML = favs.map(t => createTrackHTML(t, 'favorites')).join('');
    attachTrackListeners(DOM.favoritesList, favs);
}

function renderPlaylists() {
    if (state.playlists.length === 0) {
        DOM.playlistsGrid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-10">No playlists created.</div>`;
        return;
    }
    DOM.playlistsGrid.innerHTML = state.playlists.map(pl => `
            <div class="glass-panel glass-hover p-5 rounded-2xl cursor-pointer flex flex-col gap-3 group transition-all" data-pid="${pl.id}">
                <div class="flex justify-between items-start">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-violet-400 group-hover:text-cyan-400 group-hover:scale-110 transition-all border border-white/5 shadow-inner">
                        <i class="ph ph-playlist text-2xl"></i>
                    </div>
                    <button class="btn-del-pl text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-pid="${pl.id}">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </div>
                <div>
                    <h4 class="text-white font-bold text-lg truncate group-hover:text-cyan-100">${pl.name}</h4>
                    <p class="text-slate-400 text-xs">${pl.trackIds.length} Tracks</p>
                </div>
            </div>
        `).join('');

    DOM.playlistsGrid.querySelectorAll('.glass-panel').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-del-pl')) openPlaylist(card.dataset.pid);
        });
    });

    DOM.playlistsGrid.querySelectorAll('.btn-del-pl').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.playlistToEditId = parseInt(btn.dataset.pid);
            state.deleteContext = 'delete-playlist';
            document.getElementById('delete-modal-title').textContent = "Delete Playlist?";
            document.getElementById('delete-modal-desc').textContent = "This playlist will be deleted. The tracks inside will remain safe in your Library.";
            DOM.deleteConfirmModal.classList.add('active');
        });
    });
}

function openPlaylist(id) {
    id = parseInt(id);
    const pl = state.playlists.find(p => p.id === id);
    if (!pl) return;

    state.currentPlaylistId = id;
    state.selectedPlTrackIds.clear(); // Reset pilihan hanya saat baru membuka playlist

    DOM.activePlaylistTitle.textContent = pl.name;
    DOM.playlistsGrid.classList.add('hidden');
    DOM.btnOpenCreatePlaylist.classList.add('hidden');
    DOM.playlistDetails.classList.remove('hidden');
    renderPlaylistTracks(pl);
}

function renderPlaylistTracks(pl) {
    updatePlaylistBatchUI(pl.trackIds.length);

    const tracksInPl = pl.trackIds.map(tid => state.tracks.find(t => t.id === tid)).filter(Boolean);
    let html = tracksInPl.length === 0
        ? `<div class="text-center text-slate-500 py-6 text-sm">Playlist is empty. Add some tracks!</div>`
        : tracksInPl.map(t => createTrackHTML(t, 'playlist', pl.id)).join('');

    // Tombol pemicu Modal Add to Playlist
    html += `
            <div class="mt-6 flex justify-center">
                <button id="btn-open-add-tracks-modal" class="glass-panel glass-hover px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                    <i class="ph ph-plus-circle text-xl"></i> Add Tracks to Playlist
                </button>
            </div>
        `;

    DOM.playlistTracksList.innerHTML = html;
    attachTrackListeners(DOM.playlistTracksList, tracksInPl, pl.id);

    // Pasang event klik ke tombol add
    const btnOpenModal = document.getElementById('btn-open-add-tracks-modal');
    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => openAddTracksModal(pl));
    }
}

// --- Modal Add Tracks to Playlist Logic ---
let tempSelectedTracksForModal = new Set(); // State sementara untuk modal

function openAddTracksModal(pl) {
    tempSelectedTracksForModal.clear(); // Reset pilihan modal
    const availableTracks = state.tracks.filter(t => !pl.trackIds.includes(t.id));
    const listContainer = document.getElementById('modal-available-tracks-list');
    const selectAllCb = document.getElementById('modal-select-all-tracks');
    const countLabel = document.getElementById('modal-selected-tracks-count');
    const confirmBtn = document.getElementById('btn-confirm-add-tracks');

    selectAllCb.checked = false;
    countLabel.textContent = '0 selected';

    if (availableTracks.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-slate-500 py-6 text-sm">All library tracks are already in this playlist.</div>`;
        confirmBtn.classList.add('hidden');
        selectAllCb.disabled = true;
    } else {
        confirmBtn.classList.remove('hidden');
        selectAllCb.disabled = false;

        // Render lagu yang tersedia
        listContainer.innerHTML = availableTracks.map(t => `
                <label class="flex items-center justify-between p-3 rounded-xl cursor-pointer glass-panel glass-hover transition-all">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <input type="checkbox" class="modal-track-cb w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0" value="${t.id}">
                        <div class="flex flex-col truncate">
                            <span class="text-sm font-semibold text-slate-200 truncate">${t.name}</span>
                            <span class="text-xs text-slate-500 mt-0.5">${t.type === 'local' ? 'Local File' : 'Stream URL'}</span>
                        </div>
                    </div>
                </label>
            `).join('');

        // Listener Checkbox Satuan di dalam Modal
        listContainer.querySelectorAll('.modal-track-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.value);
                if (e.target.checked) tempSelectedTracksForModal.add(id);
                else tempSelectedTracksForModal.delete(id);

                countLabel.textContent = `${tempSelectedTracksForModal.size} selected`;
                selectAllCb.checked = tempSelectedTracksForModal.size === availableTracks.length;
            });
        });
    }

    document.getElementById('add-tracks-modal').classList.add('active');
}

// Event Listener Utama Modal
document.getElementById('btn-close-add-tracks')?.addEventListener('click', () => {
    document.getElementById('add-tracks-modal').classList.remove('active');
});

// Pilih Semua di dalam Modal
document.getElementById('modal-select-all-tracks')?.addEventListener('change', (e) => {
    const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
    if (!pl) return;
    const availableTracks = state.tracks.filter(t => !pl.trackIds.includes(t.id));
    const checkboxes = document.querySelectorAll('.modal-track-cb');

    if (e.target.checked) {
        availableTracks.forEach(t => tempSelectedTracksForModal.add(t.id));
        checkboxes.forEach(cb => cb.checked = true);
    } else {
        tempSelectedTracksForModal.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }
    document.getElementById('modal-selected-tracks-count').textContent = `${tempSelectedTracksForModal.size} selected`;
});

// Eksekusi Tambah ke Playlist
document.getElementById('btn-confirm-add-tracks')?.addEventListener('click', async () => {
    if (tempSelectedTracksForModal.size === 0 || !state.currentPlaylistId) return;
    const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
    if (pl) {
        pl.trackIds.push(...Array.from(tempSelectedTracksForModal));
        await dbOp('playlists', 'readwrite', s => s.put(pl));
        renderPlaylistTracks(pl);
        renderPlaylists();
        showToast(`${tempSelectedTracksForModal.size} track(s) added to playlist`);
    }
    document.getElementById('add-tracks-modal').classList.remove('active');
});

function refreshAllViews() {
    renderLibrary(DOM.searchInput.value);
    renderFavorites();
    renderPlaylists();
    if (state.currentPlaylistId) {
        const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (pl) renderPlaylistTracks(pl);
    }
    updateModalPlayerActionUI();
}

function updateModalPlayerActionUI() {
    const currentTrack = state.playbackQueue[state.currentIndex];
    if (currentTrack) {
        DOM.modalIconFav.className = currentTrack.isFavorite ? "ph-fill ph-heart text-2xl text-pink-500" : "ph ph-heart text-2xl";
    }
}

// --- Playlist Management Logic ---
DOM.btnBackPlaylists.addEventListener('click', () => {
    DOM.playlistDetails.classList.add('hidden');
    DOM.playlistsGrid.classList.remove('hidden');
    DOM.btnOpenCreatePlaylist.classList.remove('hidden');
    state.currentPlaylistId = null;
});

DOM.btnOpenCreatePlaylist.addEventListener('click', () => {
    DOM.modalPlaylistName.value = '';
    DOM.playlistModal.classList.add('active');
});

DOM.btnCancelPlaylist.addEventListener('click', () => DOM.playlistModal.classList.remove('active'));

DOM.btnConfirmPlaylist.addEventListener('click', async () => {
    const name = DOM.modalPlaylistName.value.trim();
    if (name) {
        const pl = { id: Date.now(), name, trackIds: [] };
        await dbOp('playlists', 'readwrite', s => s.put(pl));
        state.playlists.push(pl);
        DOM.playlistModal.classList.remove('active');
        renderPlaylists();
        showToast("Playlist created");
    }
});

// Fungsi Open Modal Add to Playlist (Untuk Tombol +)
function openAddToPlaylistModal(trackId) {
    state.trackToAddId = trackId;
    if (state.playlists.length === 0) { showToast("Create a playlist first!", "error"); return; }
    DOM.modalPlaylistsContainer.innerHTML = state.playlists.map(pl => `
            <div class="glass-panel glass-hover p-3 rounded-xl cursor-pointer flex items-center justify-between add-to-pl-item" data-pid="${pl.id}">
                <span class="text-sm font-medium text-white">${pl.name}</span>
                <span class="text-xs text-slate-400">${pl.trackIds.length} tracks</span>
            </div>
        `).join('');

    DOM.modalPlaylistsContainer.querySelectorAll('.add-to-pl-item').forEach(item => {
        item.addEventListener('click', async () => {
            const pid = parseInt(item.dataset.pid);
            const pl = state.playlists.find(p => p.id === pid);
            if (pl && !pl.trackIds.includes(state.trackToAddId)) {
                pl.trackIds.push(state.trackToAddId);
                await dbOp('playlists', 'readwrite', s => s.put(pl));
                renderPlaylists();
                if (state.currentPlaylistId === pid) renderPlaylistTracks(pl);
                showToast("Added to playlist");
            } else {
                showToast("Track already in playlist");
            }
            DOM.addToPlModal.classList.remove('active');
        });
    });
    DOM.addToPlModal.classList.add('active');
}
DOM.btnCancelAddPl.addEventListener('click', () => DOM.addToPlModal.classList.remove('active'));

// --- Batch Select UI Updaters ---
function updateBatchBarUI(filteredTracksLength) {
    const batchBar = document.getElementById('batch-actions-bar');
    const count = state.selectedTrackIds.size;
    if (count > 0 && state.activeView === 'view-home') {
        batchBar.classList.remove('hidden'); batchBar.classList.add('flex');
    } else {
        batchBar.classList.add('hidden');
    }
    document.getElementById('selected-count').textContent = `${count} selected`;
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = filteredTracksLength > 0 && count === filteredTracksLength;
}

function updateFavoritesBatchUI(favsLength) {
    const bar = document.getElementById('batch-actions-bar-favorites');
    const count = state.selectedFavIds.size;
    if (count > 0 && state.activeView === 'view-favorites') {
        bar.classList.remove('hidden'); bar.classList.add('flex');
    } else {
        bar.classList.add('hidden');
    }
    document.getElementById('selected-count-favorites').textContent = `${count} selected`;
    const selectAll = document.getElementById('select-all-checkbox-favorites');
    if (selectAll) selectAll.checked = favsLength > 0 && count === favsLength;
}

function updatePlaylistBatchUI(plTracksLength) {
    const bar = document.getElementById('batch-actions-bar-playlist');
    const count = state.selectedPlTrackIds.size;
    if (count > 0 && state.currentPlaylistId !== null) {
        bar.classList.remove('hidden'); bar.classList.add('flex');
    } else {
        bar.classList.add('hidden');
    }
    document.getElementById('selected-count-playlist').textContent = `${count} selected`;
    const selectAll = document.getElementById('select-all-checkbox-playlist');
    if (selectAll) selectAll.checked = plTracksLength > 0 && count === plTracksLength;
}

// --- Attach Listeners to List Items ---
function attachTrackListeners(container, trackList, playlistId = null) {
    // 1. Play Trigger
    container.querySelectorAll('.track-play-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const id = parseInt(trigger.closest('[data-id]').dataset.id);
            const idx = trackList.findIndex(t => t.id === id);
            if (idx !== -1) {
                // Gunakan spread operator [...] untuk membuat copy array terpisah
                state.playbackQueue = [...trackList];
                loadTrack(idx);
            }
        });
    });

    // 2. Tombol Favorite (Heart)
    container.querySelectorAll('.btn-fav').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const track = state.tracks.find(t => t.id === id);
            if (track) {
                track.isFavorite = !track.isFavorite;
                await dbOp('tracks', 'readwrite', s => s.put(track));
                refreshAllViews();
                showToast(track.isFavorite ? "Added to Favorites" : "Removed from Favorites");
            }
        });
    });

    // 3. Tombol Tambah ke Playlist (+)
    container.querySelectorAll('.btn-open-add-pl').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddToPlaylistModal(parseInt(btn.dataset.id));
        });
    });

    // 4. Hapus Permanen dari Library (Single)
    container.querySelectorAll('.btn-del-library').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.trackToDeleteId = parseInt(btn.dataset.id);
            state.deleteContext = 'single-library';
            document.getElementById('delete-modal-title').textContent = "Delete Track Permanently?";
            document.getElementById('delete-modal-desc').textContent = "This track will be permanently removed from your library and playlists.";
            DOM.deleteConfirmModal.classList.add('active');
        });
    });

    // 5. Hapus dari Favorit (Single)
    container.querySelectorAll('.btn-del-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.trackToDeleteId = parseInt(btn.dataset.id);
            state.deleteContext = 'single-fav';
            document.getElementById('delete-modal-title').textContent = "Remove from Favorites?";
            document.getElementById('delete-modal-desc').textContent = "This track will be removed from your favorites list (the track will stay in your Library).";
            DOM.deleteConfirmModal.classList.add('active');
        });
    });

    // 6. Hapus dari Playlist (Single)
    container.querySelectorAll('.btn-remove-from-playlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.trackToDeleteId = parseInt(btn.dataset.id);
            state.playlistToEditId = parseInt(btn.dataset.pid);
            state.deleteContext = 'single-pl';
            document.getElementById('delete-modal-title').textContent = "Remove from Playlist?";
            document.getElementById('delete-modal-desc').textContent = "This track will be removed from this playlist (the track will stay in your Library).";
            DOM.deleteConfirmModal.classList.add('active');
        });
    });

    // --- CHECKBOX LISTENERS UNTUK BATCH ---
    // Checkbox Library
    container.querySelectorAll('.track-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = parseInt(cb.dataset.id);
            if (cb.checked) state.selectedTrackIds.add(id);
            else state.selectedTrackIds.delete(id);
            updateBatchBarUI(trackList.length);
        });
    });

    // Checkbox Favorites
    container.querySelectorAll('.fav-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = parseInt(cb.dataset.id);
            if (cb.checked) state.selectedFavIds.add(id);
            else state.selectedFavIds.delete(id);
            updateFavoritesBatchUI(trackList.length);
        });
    });

    // Checkbox Playlist
    container.querySelectorAll('.pl-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = parseInt(cb.dataset.id);
            if (cb.checked) state.selectedPlTrackIds.add(id);
            else state.selectedPlTrackIds.delete(id);
            updatePlaylistBatchUI(trackList.length);
        });
    });
}

// --- Select All Checkboxes Events ---
const selectAllCheckbox = document.getElementById('select-all-checkbox');
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        const query = DOM.searchInput.value.toLowerCase();
        const filtered = query ? state.tracks.filter(t => t.name.toLowerCase().includes(query)) : state.tracks;
        if (e.target.checked) filtered.forEach(t => state.selectedTrackIds.add(t.id));
        else state.selectedTrackIds.clear();
        renderLibrary(DOM.searchInput.value);
        updateBatchBarUI(filtered.length);
    });
}

const selectAllFav = document.getElementById('select-all-checkbox-favorites');
if (selectAllFav) {
    selectAllFav.addEventListener('change', (e) => {
        const favs = state.tracks.filter(t => t.isFavorite);
        if (e.target.checked) favs.forEach(t => state.selectedFavIds.add(t.id));
        else state.selectedFavIds.clear();
        renderFavorites();
        updateFavoritesBatchUI(favs.length);
    });
}

const selectAllPl = document.getElementById('select-all-checkbox-playlist');
if (selectAllPl) {
    selectAllPl.addEventListener('change', (e) => {
        const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (!pl) return;
        const tracksInPl = pl.trackIds.map(tid => state.tracks.find(t => t.id === tid)).filter(Boolean);
        if (e.target.checked) tracksInPl.forEach(t => state.selectedPlTrackIds.add(t.id));
        else state.selectedPlTrackIds.clear();
        renderPlaylistTracks(pl);
        updatePlaylistBatchUI(tracksInPl.length);
    });
}

// --- Modal Delete & Batch Triggers ---
DOM.btnCancelDelete.addEventListener('click', () => {
    DOM.deleteConfirmModal.classList.remove('active');
    state.deleteContext = null;
    state.trackToDeleteId = null;
    state.playlistToEditId = null;
});

const btnDeleteSelected = document.getElementById('btn-delete-selected');
if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', () => {
        if (state.selectedTrackIds.size === 0) return;
        state.deleteContext = 'batch-home';
        document.getElementById('delete-modal-title').textContent = `Delete ${state.selectedTrackIds.size} Track(s)?`;
        document.getElementById('delete-modal-desc').textContent = "Selected tracks will be permanently removed from your library and playlists.";
        DOM.deleteConfirmModal.classList.add('active');
    });
}

const btnDeleteFavs = document.getElementById('btn-delete-selected-favorites');
if (btnDeleteFavs) {
    btnDeleteFavs.addEventListener('click', () => {
        if (state.selectedFavIds.size === 0) return;
        state.deleteContext = 'batch-fav';
        document.getElementById('delete-modal-title').textContent = `Remove from Favorites?`;
        document.getElementById('delete-modal-desc').textContent = `${state.selectedFavIds.size} selected track(s) will be removed from your favorites. (Tracks will not be deleted from your Library)`;
        DOM.deleteConfirmModal.classList.add('active');
    });
}

const btnRemovePl = document.getElementById('btn-remove-selected-playlist');
if (btnRemovePl) {
    btnRemovePl.addEventListener('click', () => {
        if (state.selectedPlTrackIds.size === 0 || !state.currentPlaylistId) return;
        state.deleteContext = 'batch-pl';
        document.getElementById('delete-modal-title').textContent = `Remove from Playlist?`;
        document.getElementById('delete-modal-desc').textContent = `${state.selectedPlTrackIds.size} selected track(s) will be removed from this playlist. (Tracks will not be deleted from your Library)`;
        DOM.deleteConfirmModal.classList.add('active');
    });
}

async function deleteTrackFully(id) {
    await dbOp('tracks', 'readwrite', s => s.delete(id));
    state.tracks = state.tracks.filter(t => t.id !== id);

    for (let pl of state.playlists) {
        if (pl.trackIds.includes(id)) {
            pl.trackIds = pl.trackIds.filter(tid => tid !== id);
            await dbOp('playlists', 'readwrite', s => s.put(pl));
        }
    }
    if (state.playbackQueue[state.currentIndex]?.id === id) {
        pauseAudio();
        DOM.miniPlayer.classList.remove('visible');
    }
}

DOM.btnConfirmDelete.addEventListener('click', async () => {
    if (state.deleteContext === 'single-library') {
        if (state.trackToDeleteId) {
            await deleteTrackFully(state.trackToDeleteId);
            showToast("Track permanently deleted");
        }
    }
    else if (state.deleteContext === 'single-fav') {
        if (state.trackToDeleteId) {
            const track = state.tracks.find(t => t.id === state.trackToDeleteId);
            if (track) {
                track.isFavorite = false;
                await dbOp('tracks', 'readwrite', s => s.put(track));
                showToast("Removed from Favorites");
            }
        }
    }
    else if (state.deleteContext === 'single-pl') {
        if (state.trackToDeleteId && state.playlistToEditId) {
            const pl = state.playlists.find(p => p.id === state.playlistToEditId);
            if (pl) {
                pl.trackIds = pl.trackIds.filter(id => id !== state.trackToDeleteId);
                await dbOp('playlists', 'readwrite', s => s.put(pl));
                showToast("Removed from Playlist");
            }
        }
    }
    else if (state.deleteContext === 'batch-home') {
        for (let id of state.selectedTrackIds) {
            await deleteTrackFully(id);
        }
        state.selectedTrackIds.clear();
        document.getElementById('batch-actions-bar').classList.add('hidden');
        showToast("Selected track(s) deleted");
    }
    else if (state.deleteContext === 'batch-fav') {
        for (let id of state.selectedFavIds) {
            const track = state.tracks.find(t => t.id === id);
            if (track) {
                track.isFavorite = false;
                await dbOp('tracks', 'readwrite', s => s.put(track));
            }
        }
        state.selectedFavIds.clear();
        const favBar = document.getElementById('batch-actions-bar-favorites');
        if (favBar) favBar.classList.add('hidden');
        showToast("Track(s) removed from Favorites");
    }
    else if (state.deleteContext === 'batch-pl') {
        const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (pl) {
            pl.trackIds = pl.trackIds.filter(id => !state.selectedPlTrackIds.has(id));
            await dbOp('playlists', 'readwrite', s => s.put(pl));
            state.selectedPlTrackIds.clear();
        }
        showToast("Track(s) removed from Playlist");
    }

    // TAMBAHKAN KODE INI SEBELUM refreshAllViews()
    else if (state.deleteContext === 'delete-playlist') {
        if (state.playlistToEditId) {
            state.playlists = state.playlists.filter(p => p.id !== state.playlistToEditId);
            await dbOp('playlists', 'readwrite', s => s.delete(state.playlistToEditId));

            // Jika kita sedang membuka playlist yang dihapus, otomatis kembali ke Grid Playlist
            if (state.currentPlaylistId === state.playlistToEditId) {
                DOM.playlistDetails.classList.add('hidden');
                DOM.playlistsGrid.classList.remove('hidden');
                DOM.btnOpenCreatePlaylist.classList.remove('hidden');
                state.currentPlaylistId = null;
            }
            showToast("Playlist deleted successfully");
        }
    }

    refreshAllViews();
    DOM.deleteConfirmModal.classList.remove('active');
    state.deleteContext = null;
    state.trackToDeleteId = null;
    state.playlistToEditId = null;
});

// --- URL & Download Logic ---
function toggleInputButtons(inputId, pasteBtnId, actionBtnId, clearBtnId) {
    const input = document.getElementById(inputId);
    const pasteBtn = document.getElementById(pasteBtnId);
    const actionBtn = document.getElementById(actionBtnId);
    const clearBtn = document.getElementById(clearBtnId);

    if (input.value.trim().length > 0) {
        pasteBtn.classList.add('hidden');
        actionBtn.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
    } else {
        pasteBtn.classList.remove('hidden');
        actionBtn.classList.add('hidden');
        clearBtn.classList.add('hidden');
    }
}

['url-input', 'dl-url-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
        if (id === 'url-input') toggleInputButtons('url-input', 'btn-paste-url', 'btn-check-url', 'btn-clear-url');
        else toggleInputButtons('dl-url-input', 'btn-paste-dl', 'btn-dl-identify', 'btn-clear-dl-url');
    });
});

document.getElementById('btn-paste-url')?.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('url-input').value = text;
        toggleInputButtons('url-input', 'btn-paste-url', 'btn-check-url', 'btn-clear-url');
    } catch (e) { showToast("Failed to paste from clipboard.", "error"); }
});

document.getElementById('btn-paste-dl')?.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('dl-url-input').value = text;
        toggleInputButtons('dl-url-input', 'btn-paste-dl', 'btn-dl-identify', 'btn-clear-dl-url');
    } catch (e) { showToast("Failed to paste from clipboard.", "error"); }
});

document.getElementById('btn-clear-url')?.addEventListener('click', () => {
    document.getElementById('url-input').value = '';
    toggleInputButtons('url-input', 'btn-paste-url', 'btn-check-url', 'btn-clear-url');
});
document.getElementById('btn-clear-dl-url')?.addEventListener('click', () => {
    document.getElementById('dl-url-input').value = '';
    toggleInputButtons('dl-url-input', 'btn-paste-dl', 'btn-dl-identify', 'btn-clear-dl-url');
});

DOM.btnShowUrl.addEventListener('click', () => {
    DOM.urlInputContainer.classList.toggle('hidden');
    DOM.urlInputContainer.classList.toggle('flex');
    if (!DOM.urlInputContainer.classList.contains('hidden')) DOM.urlInput.focus();
});

DOM.btnCheckUrl.addEventListener('click', async () => {
    const url = DOM.urlInput.value.trim();
    if (!url) return;
    showToast("Checking URL...");

    let title = 'External Stream';
    let type = 'url';
    let finalUrl = url;
    let cover = null;

    const ytData = await fetchYoutubeData(url);
    if (ytData) {
        type = 'youtube';
        title = ytData.title;
        finalUrl = ytData.streamUrl;
        cover = ytData.cover;
    } else {
        const nameMatch = url.match(/\/([^\/?#]+)$/i);
        if (nameMatch) { try { title = decodeURIComponent(nameMatch[1]); } catch (e) { } }
    }

    state.identifiedStream = { title, url: finalUrl, type, cover };
    DOM.urlPreviewTitle.textContent = title;
    DOM.urlPreviewContainer.classList.remove('hidden');
    DOM.urlPreviewContainer.classList.add('flex');
});

DOM.btnSubmitUrl.addEventListener('click', async () => {
    if (!state.identifiedStream) return;
    const track = { id: Date.now(), name: state.identifiedStream.title, type: state.identifiedStream.type, url: state.identifiedStream.url, cover: state.identifiedStream.cover, isFavorite: false };
    await dbOp('tracks', 'readwrite', s => s.put(track));
    state.tracks.push(track);

    DOM.urlInput.value = '';
    DOM.urlPreviewContainer.classList.add('hidden');
    DOM.urlInputContainer.classList.add('hidden');
    state.identifiedStream = null;
    renderLibrary();
    showToast("Added to Library!");
});

DOM.btnDlIdentify.addEventListener('click', async () => {
    const url = DOM.dlUrlInput.value.trim();
    if (!url) { showToast("Please enter a YouTube URL first", "error"); return; }
    showToast("Identifying YouTube video...");
    const ytData = await fetchYoutubeData(url);
    if (!ytData) { showToast("Invalid YouTube URL", "error"); return; }
    state.identifiedYt = ytData;
    DOM.dlVideoTitle.textContent = ytData.title;
    DOM.dlVideoIdLabel.textContent = `ID: ${ytData.id}`;

    // Ganti icon pulse jadi thumbnail youtube
    const iconContainer = DOM.dlPreviewContainer.querySelector('.w-16.h-16');
    if (iconContainer) {
        iconContainer.innerHTML = `<img src="${ytData.cover}" class="w-full h-full object-cover rounded-xl" />`;
    }

    DOM.dlActionButtons.classList.remove('hidden');
    DOM.dlActionButtons.classList.add('flex');
    DOM.dlProgressContainer.classList.add('hidden');
    DOM.dlDownloadContainer.classList.add('hidden');
    DOM.dlPreviewContainer.classList.remove('hidden');
    DOM.dlPreviewContainer.classList.add('flex');
    showToast("Video identified successfully!");
});

DOM.btnDlConvert.addEventListener('click', async () => {
    if (!state.identifiedYt) return;

    DOM.dlActionButtons.classList.add('hidden');
    DOM.dlProgressContainer.classList.remove('hidden');
    DOM.dlProgressContainer.classList.add('flex');
    DOM.dlProgressBar.style.width = '100%';
    DOM.dlProgressText.textContent = '100%';

    // Berhubung API sudah mengonversi saat proses identifikasi/fetch, 
    // kita tinggal tampilkan tombol download & siapkan link-nya.
    setTimeout(() => {
        DOM.dlProgressContainer.classList.add('hidden');
        DOM.dlDownloadContainer.classList.remove('hidden');
        DOM.dlDownloadContainer.classList.add('flex');

        DOM.btnDlDownload.href = state.identifiedYt.streamUrl;
        DOM.btnDlDownload.download = `${state.identifiedYt.title}.mp3`;
        showToast("Conversion complete! Ready for Download & Streaming.");
    }, 500);
});

DOM.btnDlAddLibOnly.addEventListener('click', async () => {
    if (!state.identifiedYt) return;
    const track = { id: Date.now(), name: state.identifiedYt.title, type: 'youtube', url: state.identifiedYt.streamUrl, cover: state.identifiedYt.cover, isFavorite: false };
    await dbOp('tracks', 'readwrite', s => s.put(track));
    state.tracks.push(track);
    renderLibrary();
    showToast("Successfully added to Library!");
    DOM.dlUrlInput.value = '';
    DOM.dlPreviewContainer.classList.add('hidden');
    state.identifiedYt = null;
    switchView('view-home');
});

// --- Core Audio Playback ---
async function loadTrack(index) {
    if (index < 0 || index >= state.playbackQueue.length) return;
    state.currentIndex = index;
    const track = state.playbackQueue[index];

    try {
        let src = track.url;
        if (track.type === 'local' && track.blob) {
            if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
            track.objectUrl = URL.createObjectURL(track.blob);
            src = track.objectUrl;
        }
        DOM.audio.src = src;
        DOM.trackTitle.textContent = track.name;
        DOM.trackArtist.textContent = track.type === 'local' ? "Local File" : (track.type === 'youtube' ? "YouTube Stream" : "Stream URL");
        DOM.miniTitle.textContent = track.name;
        DOM.miniArtist.textContent = DOM.trackArtist.textContent;
        if (track.cover) {
            // Tampilkan di Mini player
            DOM.miniThumbContainer.innerHTML = `<img src="${track.cover}" class="w-full h-full object-cover">`;
            // Tampilkan background di Full player visualizer
            DOM.visualizerThumb.src = track.cover;
            DOM.visualizerThumb.classList.remove('hidden');
        } else {
            // Kembalikan ke ikon default kalau gaada gambar
            DOM.miniThumbContainer.innerHTML = `<i class="${track.type === 'local' ? 'ph ph-file-audio text-2xl text-cyan-400' : (track.type === 'youtube' ? 'ph ph-youtube-logo text-2xl text-amber-400' : 'ph ph-globe text-2xl text-violet-400')} animate-pulse" id="mini-icon"></i>`;
            // Sembunyikan background di Full Player
            DOM.visualizerThumb.src = '';
            DOM.visualizerThumb.classList.add('hidden');
        }

        setPlayerBackground(track.cover);

        DOM.miniPlayer.classList.add('visible');
        refreshAllViews();
        updateMarqueeEffect('mini-title-container', 'mini-title');
        updateMarqueeEffect('modal-title-container', 'track-title');
        playAudio();
    } catch (err) {
        showToast("Error loading track", "error");
    }
}

function playAudio() {
    if (!state.audioContextInitialized) initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    DOM.audio.play().then(() => {
        state.isPlaying = true;
        updatePlayPauseUI();
    }).catch(e => {
        showToast("Playback blocked. Tap play.", "error");
        state.isPlaying = false;
        updatePlayPauseUI();
    });
}

function pauseAudio() {
    DOM.audio.pause();
    state.isPlaying = false;
    updatePlayPauseUI();
}

function togglePlayPause(e) {
    if (e) e.stopPropagation();
    if (state.playbackQueue.length === 0) return;
    if (state.isPlaying) pauseAudio();
    else playAudio();
}

function updatePlayPauseUI() {
    if (state.isPlaying) {
        DOM.iconPlay.classList.add('hidden'); DOM.iconPause.classList.remove('hidden');
        DOM.miniIconPlay.classList.add('hidden'); DOM.miniIconPause.classList.remove('hidden');
    } else {
        DOM.iconPlay.classList.remove('hidden'); DOM.iconPause.classList.add('hidden');
        DOM.miniIconPlay.classList.remove('hidden'); DOM.miniIconPause.classList.add('hidden');
    }
    refreshAllViews();
}

function playNext(e) {
    if (e) e.stopPropagation();
    if (state.playbackQueue.length === 0) return;
    let nextIdx = state.currentIndex + 1;
    if (state.isShuffle) nextIdx = Math.floor(Math.random() * state.playbackQueue.length);
    else if (nextIdx >= state.playbackQueue.length) nextIdx = (state.repeatMode === 1) ? 0 : -1;
    if (nextIdx !== -1) loadTrack(nextIdx);
    else pauseAudio();
}

function playPrev(e) {
    if (e) e.stopPropagation();
    if (state.playbackQueue.length === 0) return;
    if (DOM.audio.currentTime > 3) {
        DOM.audio.currentTime = 0;
    } else {
        let prevIdx = state.currentIndex - 1;
        if (prevIdx < 0) prevIdx = state.playbackQueue.length - 1;
        loadTrack(prevIdx);
    }
}

DOM.miniPlayer.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    DOM.fullPlayerModal.classList.add('open');
    if (state.audioContextInitialized) resizeCanvas();
    setTimeout(() => updateMarqueeEffect('modal-title-container', 'track-title'), 100);
});
DOM.btnCloseModal.addEventListener('click', () => DOM.fullPlayerModal.classList.remove('open'));

DOM.btnPlayPause.addEventListener('click', togglePlayPause);
DOM.miniBtnPlay.addEventListener('click', togglePlayPause);
DOM.btnNext.addEventListener('click', playNext);
DOM.miniBtnNext.addEventListener('click', playNext);
DOM.btnPrev.addEventListener('click', playPrev);
document.getElementById('mini-btn-prev').addEventListener('click', (e) => { e.stopPropagation(); playPrev(); });

// Tombol Fav Modal Full Player
DOM.modalBtnFav.addEventListener('click', async () => {
    const currentTrack = state.playbackQueue[state.currentIndex];
    if (currentTrack) {
        currentTrack.isFavorite = !currentTrack.isFavorite;
        await dbOp('tracks', 'readwrite', s => s.put(currentTrack));
        refreshAllViews();
        showToast(currentTrack.isFavorite ? "Added to Favorites" : "Removed from Favorites");
    }
});

// Tombol Plus Modal Full Player
DOM.modalBtnAddPl.addEventListener('click', () => {
    const currentTrack = state.playbackQueue[state.currentIndex];
    if (currentTrack) {
        openAddToPlaylistModal(currentTrack.id);
    } else {
        showToast("Please play a track first", "error");
    }
});

DOM.audio.addEventListener('timeupdate', () => {
    if (!DOM.audio.duration) return;
    const pct = (DOM.audio.currentTime / DOM.audio.duration) * 100;
    DOM.progressBar.value = pct;
    DOM.miniProgress.style.width = `${pct}%`;
    DOM.timeCurrent.textContent = formatTime(DOM.audio.currentTime);
    updateSliderBackground(DOM.progressBar, pct, 100);
});

DOM.progressBar.addEventListener('input', (e) => {
    if (!DOM.audio.duration) return;
    DOM.audio.currentTime = (e.target.value / 100) * DOM.audio.duration;
    updateSliderBackground(DOM.progressBar, e.target.value, 100);
});

DOM.audio.addEventListener('loadedmetadata', () => DOM.timeTotal.textContent = formatTime(DOM.audio.duration));
DOM.audio.addEventListener('ended', () => {
    if (state.repeatMode === 2) {
        DOM.audio.currentTime = 0;
        playAudio();
    } else {
        playNext();
    }
});

// --- Deteksi aksi Play/Pause dari sistem operasi atau Headset Bluetooth ---
DOM.audio.addEventListener('play', () => {
    state.isPlaying = true;
    updatePlayPauseUI();
});

DOM.audio.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseUI();
});

DOM.progressBar.addEventListener('input', (e) => {
    if (!DOM.audio.duration) return;
    DOM.audio.currentTime = (e.target.value / 100) * DOM.audio.duration;
});

// --- Marquee & Volume ---
let miniPauseTimer = null;
let modalPauseTimer = null;

function setupMarqueeLoop(containerId, textId, isModal = false) {
    const container = document.getElementById(containerId);
    const text = document.getElementById(textId);
    if (!container || !text) return;
    if (isModal) { if (modalPauseTimer) clearTimeout(modalPauseTimer); }
    else { if (miniPauseTimer) clearTimeout(miniPauseTimer); }
    container.classList.remove('is-long', 'paused-at-edge');

    requestAnimationFrame(() => {
        if (text.scrollWidth > container.clientWidth) {
            container.classList.add('is-long');
            let loopCount = 0;
            const oldHandler = container._animationHandler;
            if (oldHandler) text.removeEventListener('animationiteration', oldHandler);
            const animationHandler = () => {
                if (container.matches(':hover')) return;
                loopCount++;
                if (loopCount >= 4) {
                    loopCount = 0;
                    container.classList.add('paused-at-edge');
                    const timer = setTimeout(() => {
                        container.classList.remove('paused-at-edge');
                    }, 10000);
                    if (isModal) modalPauseTimer = timer;
                    else miniPauseTimer = timer;
                }
            };
            text.addEventListener('animationiteration', animationHandler);
            container._animationHandler = animationHandler;
        }
    });
}

function updateMarqueeEffect(containerId, textId) {
    setupMarqueeLoop(containerId, textId, containerId.includes('modal'));
}

function setVolume(vol) {
    DOM.audio.volume = vol;
    DOM.volumeBar.value = vol * 100;

    // Panggil update background untuk volume bar
    updateSliderBackground(DOM.volumeBar, vol * 100, 100);

    if (vol === 0) DOM.iconVolume.className = 'ph ph-speaker-x text-xl';
    else if (vol < 0.5) DOM.iconVolume.className = 'ph ph-speaker-low text-xl';
    else DOM.iconVolume.className = 'ph ph-speaker-high text-xl';
}

// Inisialisasi warna volume bar di awal load app
updateSliderBackground(DOM.volumeBar, DOM.volumeBar.value, 100);

DOM.volumeBar.addEventListener('input', (e) => setVolume(e.target.value / 100));
const volumeDrawer = document.getElementById('volume-drawer');
DOM.btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.innerWidth < 640) { volumeDrawer.classList.toggle('mobile-open'); return; }
    if (DOM.audio.volume > 0) {
        DOM.audio.dataset.savedVolume = DOM.audio.volume;
        setVolume(0);
    } else {
        setVolume(DOM.audio.dataset.savedVolume || 1);
    }
});

window.addEventListener('click', (e) => {
    if (!e.target.closest('.volume-wrapper')) volumeDrawer.classList.remove('mobile-open');
});

DOM.btnShuffle.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    DOM.btnShuffle.classList.toggle('active-btn', state.isShuffle);
    showToast(state.isShuffle ? "Shuffle On" : "Shuffle Off");
});

DOM.btnRepeat.addEventListener('click', () => {
    state.repeatMode = (state.repeatMode + 1) % 3;
    if (state.repeatMode === 0) {
        DOM.btnRepeat.classList.remove('active-btn');
        DOM.repeatBadge.classList.add('hidden');
        showToast("Repeat Off");
    } else if (state.repeatMode === 1) {
        DOM.btnRepeat.classList.add('active-btn');
        DOM.repeatBadge.classList.add('hidden');
        showToast("Repeat All");
    } else {
        DOM.btnRepeat.classList.add('active-btn');
        DOM.repeatBadge.classList.remove('hidden');
        showToast("Repeat One");
    }
});

DOM.searchInput.addEventListener('input', (e) => renderLibrary(e.target.value));

async function handleFiles(files) {
    let addedCount = 0;

    // Fungsi bantuan untuk membaca ID3 tags (cover dll)
    const getCoverArt = (file) => new Promise((resolve) => {
        window.jsmediatags.read(file, {
            onSuccess: function (tag) {
                const picture = tag.tags.picture;
                if (picture) {
                    // Convert array buffer to base64
                    let base64String = "";
                    for (let i = 0; i < picture.data.length; i++) {
                        base64String += String.fromCharCode(picture.data[i]);
                    }
                    resolve(`data:${picture.format};base64,${btoa(base64String)}`);
                } else {
                    resolve(null);
                }
            },
            onError: function () {
                resolve(null);
            }
        });
    });

    showToast(`Processing ${files.length} file(s)...`); // Feedback visual karena ekstraksi foto memakan sedikit waktu

    for (let file of files) {
        if (!file.type.startsWith('audio/')) continue;

        // Ekstrak cover
        const coverUrl = await getCoverArt(file);

        const track = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: 'local',
            blob: file,
            cover: coverUrl, // <-- Simpan thumbnail ke track object
            isFavorite: false
        };
        await dbOp('tracks', 'readwrite', s => s.put(track));
        state.tracks.push(track);
        addedCount++;
    }
    if (addedCount > 0) {
        renderLibrary();
        showToast(`Added ${addedCount} local track(s)`);
    }
}

DOM.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
});

window.addEventListener('dragover', (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) DOM.dndOverlay.classList.add('active'); });
DOM.dndOverlay.addEventListener('dragleave', (e) => { e.preventDefault(); DOM.dndOverlay.classList.remove('active'); });
DOM.dndOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dndOverlay.classList.remove('active');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
        if (state.activeView !== 'view-home') switchView('view-home');
    }
});

async function bootApp() {
    try {
        await initDB();
        state.tracks = await dbOp('tracks', 'readonly', s => s.getAll());
        state.playlists = await dbOp('playlists', 'readonly', s => s.getAll());
        buildEQUI();

        // --- TAMBAHKAN DUA BARIS INI ---
        // Membuat UI tombol repeat otomatis menyala (karena defaultnya autoplay next)
        DOM.btnRepeat.classList.add('active-btn');
        DOM.repeatBadge.classList.add('hidden');

        refreshAllViews();
        switchView('view-home');
    } catch (err) {
        showToast("Failed to load local database", "error");
    }
}

// --- Fungsi Update Warna Gradasi Slider ---
function updateSliderBackground(slider, value, max) {
    const pct = (value / max) * 100;
    // Gradasi cyan-500 (#06b6d4) ke violet-500 (#8b5cf6)
    slider.style.background = `linear-gradient(to right, #06b6d4 0%, #8b5cf6 ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%, rgba(255, 255, 255, 0.1) 100%)`;
}

// --- Fungsi Ekstrak Warna Dominan & Update Background ---
function setPlayerBackground(imgSrc) {
    if (!imgSrc) {
        DOM.fullPlayerModal.style.background = ''; // Reset ke default
        return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Hindari block CORS dari YouTube
    img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        // Gambar gambar dalam ukuran 1x1 pixel untuk dapatkan rata-rata warnanya
        ctx.drawImage(img, 0, 0, 1, 1);
        try {
            const data = ctx.getImageData(0, 0, 1, 1).data;
            const r = data[0], g = data[1], b = data[2];
            // Terapkan warna sebagai efek cahaya (radial-gradient) di atas
            DOM.fullPlayerModal.style.background = `radial-gradient(circle at 50% 0%, rgba(${r}, ${g}, ${b}, 0.5) 0%, rgba(15, 23, 42, 1) 80%)`;
        } catch (e) {
            DOM.fullPlayerModal.style.background = '';
        }
    };
    img.src = imgSrc;
}

// ==========================================
// --- PLAYBACK SPEED & KEYBOARD CONTROLS ---
// ==========================================

// ==========================================
// --- PLAYBACK SPEED POPUP CONTROL ---
// ==========================================
let currentSpeed = 1;
const btnSpeed = document.getElementById('btn-speed');
const speedMenu = document.getElementById('speed-menu');
const speedOpts = document.querySelectorAll('.speed-opt');

// Tampilkan / Sembunyikan popup saat tombol ditekan
btnSpeed?.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.toggle('hidden');
    speedMenu.classList.toggle('flex');
});

// Aksi ketika salah satu pilihan kecepatan diklik
speedOpts.forEach(opt => {
    opt.addEventListener('click', (e) => {
        e.stopPropagation();
        currentSpeed = parseFloat(opt.dataset.speed);
        DOM.audio.playbackRate = currentSpeed;
        btnSpeed.textContent = currentSpeed + 'x';

        // Atur ulang warna/highlight opsi yang aktif
        speedOpts.forEach(o => {
            o.classList.remove('text-cyan-400', 'font-bold', 'bg-white/5', 'active-speed');
            o.classList.add('text-slate-300');
        });
        opt.classList.remove('text-slate-300');
        opt.classList.add('text-cyan-400', 'font-bold', 'bg-white/5', 'active-speed');

        // Tutup popup
        speedMenu.classList.add('hidden');
        speedMenu.classList.remove('flex');

        showToast(`Speed: ${currentSpeed}x`);
    });
});

// Tutup menu jika user klik di sembarang tempat di luar popup
document.addEventListener('click', (e) => {
    if (speedMenu && !speedMenu.contains(e.target) && e.target !== btnSpeed) {
        speedMenu.classList.add('hidden');
        speedMenu.classList.remove('flex');
    }
});

// Jaga kecepatan lagu tetap sama meskipun lanjut ke lagu berikutnya
DOM.audio.addEventListener('play', () => {
    DOM.audio.playbackRate = currentSpeed;
});

// 2. Logika Pop-up Indikator Volume
let volToastTimer = null;
function adjustVolumeUI(change) {
    let newVol = DOM.audio.volume + change;
    newVol = Math.max(0, Math.min(1, newVol)); // Pastikan antara 0 - 1

    setVolume(newVol); // Panggil fungsi bawaan buat ubah slider dan audio

    if (DOM.volumeIndicator) {
        const volPct = Math.round(newVol * 100);
        DOM.volIndicatorText.textContent = volPct + '%';

        if (volPct === 0) DOM.volIndicatorIcon.className = 'ph ph-speaker-x text-4xl text-cyan-400';
        else if (volPct < 50) DOM.volIndicatorIcon.className = 'ph ph-speaker-low text-4xl text-cyan-400';
        else DOM.volIndicatorIcon.className = 'ph ph-speaker-high text-4xl text-cyan-400';

        DOM.volumeIndicator.classList.remove('hidden', 'opacity-0');
        DOM.volumeIndicator.classList.add('flex', 'opacity-100');

        clearTimeout(volToastTimer);
        volToastTimer = setTimeout(() => {
            DOM.volumeIndicator.classList.remove('opacity-100');
            DOM.volumeIndicator.classList.add('opacity-0');
            setTimeout(() => DOM.volumeIndicator.classList.add('hidden'), 300);
        }, 1000); // Hilang setelah 1 detik
    }
}

// 3. Global Keyboard Shortcuts
let seekInterval = null;
let isSeekingKey = false;
let keydownTime = 0;
const SEEK_HOLD_THRESHOLD = 200; // ms ditekan untuk dihitung "Hold"

window.addEventListener('keydown', (e) => {
    // Abaikan jika user sedang mengetik di input text/search
    const activeTag = document.activeElement.tagName;
    const inInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    // === ESCAPE: Keluar/Tutup Modal ===
    if (e.key === 'Escape') {
        DOM.fullPlayerModal.classList.remove('open');
        DOM.playlistModal.classList.remove('active');
        DOM.addToPlModal.classList.remove('active');
        DOM.deleteConfirmModal.classList.remove('active');
        document.getElementById('add-tracks-modal')?.classList.remove('active');
        return;
    }

    // === ENTER: Konfirmasi "Oke/Create/Hapus" di Modal Aktif ===
    if (e.key === 'Enter') {
        if (DOM.deleteConfirmModal.classList.contains('active')) {
            DOM.btnConfirmDelete.click();
            return;
        }
        if (DOM.playlistModal.classList.contains('active')) {
            DOM.btnConfirmPlaylist.click();
            return;
        }
        if (document.getElementById('add-tracks-modal')?.classList.contains('active')) {
            document.getElementById('btn-confirm-add-tracks')?.click();
            return;
        }

        // Enter saat mengetik URL YouTube agar langsung teridentifikasi
        if (inInput && document.activeElement === DOM.dlUrlInput) { DOM.btnDlIdentify.click(); return; }
        if (inInput && document.activeElement === DOM.urlInput) { DOM.btnCheckUrl.click(); return; }
    }

    // Jika user ngetik di input field, shortcut audio di bawah JANGAN jalan
    if (inInput) return;

    // === SPACE: Play / Pause ===
    if (e.code === 'Space') {
        e.preventDefault(); // Biar browser ga scroll ke bawah
        togglePlayPause();
    }

    // === PANAH ATAS / BAWAH: Volume ===
    if (e.code === 'ArrowUp') {
        e.preventDefault();
        adjustVolumeUI(0.05); // Naik 5%
    }
    if (e.code === 'ArrowDown') {
        e.preventDefault();
        adjustVolumeUI(-0.05); // Turun 5%
    }

    // === PANAH KANAN / KIRI: Next/Prev ATAU Maju/Mundur Durasi (Seek) ===
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        if (e.repeat) return; // Mencegah bawaan sistem yang nge-spam keydown
        isSeekingKey = true;
        keydownTime = Date.now();

        const direction = e.code === 'ArrowRight' ? 1 : -1;

        // Jika ditekan tahan lewati batas HOLD_THRESHOLD, ubah jadi fast-forward / rewind
        seekInterval = setTimeout(() => {
            seekInterval = setInterval(() => {
                if (DOM.audio.duration) {
                    DOM.audio.currentTime += 2 * direction; // Skip 2 detik per interval
                }
            }, 100);
        }, SEEK_HOLD_THRESHOLD);
    }
});

// Deteksi saat Panah dilepas
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        // Hentikan proses Fast Forward / Rewind
        clearTimeout(seekInterval);
        clearInterval(seekInterval);
        seekInterval = null;

        if (isSeekingKey) {
            isSeekingKey = false;
            const pressDuration = Date.now() - keydownTime;

            // Jika dilepas cepet (kurang dari threshold Hold), jalankan Next / Prev
            if (pressDuration < SEEK_HOLD_THRESHOLD) {
                if (e.code === 'ArrowRight') playNext();
                if (e.code === 'ArrowLeft') playPrev();
            }
        }
    }
});

window.addEventListener('DOMContentLoaded', bootApp);