 <script>
    
    function parseTumblrJson(text) {
        return JSON.parse(text.replace(/^var tumblr_api_read = /, '').replace(/;\s*$/, ''));
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;

    const savedTheme = localStorage.getItem('karsta-theme');
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', nextTheme);
        localStorage.setItem('karsta-theme', nextTheme);
    });

    // Shared helpers
    const regionFilter = document.getElementById('regionFilter');
    const allRegionLinks = document.querySelectorAll('.region-item a');
    const allSections = document.querySelectorAll('.region-section');
    const sectionHeaders = document.querySelectorAll('.region-section-header');

    function setSectionState(section, open) {
        const header = section.querySelector('.region-section-header');
        const toggle = header.querySelector('.section-toggle');
        header.setAttribute('aria-expanded', String(open));
        section.classList.toggle('collapsed', !open);
        toggle.textContent = open ? '–' : '+';
    }

    // Collapsible region groups
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.region-section');
            const isOpen = header.getAttribute('aria-expanded') === 'true';
            setSectionState(section, !isOpen);
        });
    });

    // Region search: opens sections with matches, collapses them when cleared
    regionFilter.addEventListener('input', () => {
        const query = regionFilter.value.trim().toLowerCase();

        allRegionLinks.forEach(link => {
            const label = link.dataset.regionName.toLowerCase();
            link.classList.toggle('is-hidden', Boolean(query) && !label.includes(query));
        });

        allSections.forEach(section => {
            const visibleLinks = section.querySelectorAll('.region-item a:not(.is-hidden)');
            section.classList.toggle('is-hidden', Boolean(query) && visibleLinks.length === 0);
            setSectionState(section, Boolean(query) && visibleLinks.length > 0);
        });
    });

    // Highlight the current tag page and open its section
    const currentPath = decodeURIComponent(window.location.pathname).replace(/\/$/, '').toLowerCase();
    allRegionLinks.forEach(link => {
        if (link.getAttribute('href').toLowerCase() === currentPath) {
            link.classList.add('active');
            setSectionState(link.closest('.region-section'), true);
        }
    });

                  // Content type + tag filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const postGrid = document.querySelector('.post-grid');
    let allPostCards = Array.from(document.querySelectorAll('.post-card'));
    let loadPromise = null;

    // The full-blog load is skipped on tag pages so /tagged/europe stays Europe only
    const isTagPage = window.location.pathname.toLowerCase().startsWith('/tagged/');

    function getCardKeywords(card) {
        const raw = (card.dataset.tags || '') + ' ' + (card.dataset.contentType || '');
        return raw
            .toLowerCase()
            .split(/\s+/)
            .map(t => t.replace(/\+|%20/g, '-'))
            .filter(Boolean);
    }

    function applyFilters() {
        const activeFilters = Array.from(filterButtons)
            .filter(b => b.classList.contains('active'))
            .map(b => b.dataset.type);

        allPostCards.forEach(card => {
            const keywords = getCardKeywords(card);
            const show = activeFilters.length === 0 ||
                         activeFilters.some(f => keywords.includes(f));
            card.style.display = show ? '' : 'none';
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function stripHtml(html) {
        const el = document.createElement('div');
        el.innerHTML = html || '';
        return (el.textContent || '').trim();
    }

    function buildPostCard(post) {
        const tagList = (post.tags || []).map(t => String(t).trim().toLowerCase().replace(/\s+/g, '-'));
        const tags = tagList.join(' ');
        const tagLabel = escapeHtml(tags || 'Untagged');
        const gmt = String(post['date-gmt'] || '');
        const date = gmt ? `${gmt.substring(5, 7)}.${gmt.substring(8, 10)}.${gmt.substring(0, 4)}` : '';
        const common = `data-log-date="${date}" data-tags="${escapeHtml(tags)}"`;
        let html = '';

        if (post.type === 'photo') {
            const first = (post.photos && post.photos[0]) || {};
            const photoUrl = post['photo-url-500'] || first['photo-url-500'] || '';
            const highRes = post['photo-url-1280'] || first['photo-url-1280'] || photoUrl;
            const caption = post['photo-caption'] || '';
            const title = stripHtml(caption).slice(0, 60) || 'Untitled';
            html = `
                <article class="post-card" ${common} data-content-type="photo" data-title="${escapeHtml(title)}" data-image="${escapeHtml(highRes)}">
                    <span class="content-type-badge badge-photo">📷 Photo</span>
                    <div class="image-wrap">
                        <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(title)}">
                        <div class="image-overlay"><span>View archive</span></div>
                    </div>
                    <div class="post-body">
                        <h3 class="post-title">${escapeHtml(title)}</h3>
                        <p class="post-location">Geographic Documentation</p>
                        <div class="post-excerpt">${caption}</div>
                        <div class="metadata-ledger">
                            <div class="metadata-row"><span class="metadata-category">[ TYPE: ]</span><span class="metadata-value">Photography</span></div>
                            <div class="metadata-row"><span class="metadata-category">[ TAGS: ]</span><span class="metadata-value">${tagLabel}</span></div>
                        </div>
                    </div>
                </article>`;
        } else if (post.type === 'video') {
            const title = stripHtml(post['video-caption']).slice(0, 60) || 'Video Log';
            html = `
                <article class="post-card" ${common} data-content-type="video" data-title="${escapeHtml(title)}">
                    <span class="content-type-badge badge-video">🎬 Video</span>
                    <div class="media-wrap">${post['video-player'] || ''}</div>
                    <div class="post-body">
                        <h3 class="post-title">${escapeHtml(title)}</h3>
                        <p class="post-location">Video Documentation</p>
                        <div class="metadata-ledger">
                            <div class="metadata-row"><span class="metadata-category">[ TYPE: ]</span><span class="metadata-value">Video</span></div>
                            <div class="metadata-row"><span class="metadata-category">[ TAGS: ]</span><span class="metadata-value">${tagLabel}</span></div>
                        </div>
                    </div>
                </article>`;
        } else if (post.type === 'regular') {
            html = `
                <article class="post-card" ${common} data-content-type="history">
                    <span class="content-type-badge badge-history">📜 History</span>
                    <div class="post-body">
                        <h3 class="post-title">${escapeHtml(post['regular-title'] || 'Untitled')}</h3>
                        <p class="post-location">Field Log / Geographic Note</p>
                        <div class="post-excerpt">${post['regular-body'] || ''}</div>
                        <div class="metadata-ledger">
                            <div class="metadata-row"><span class="metadata-category">[ TYPE: ]</span><span class="metadata-value">Historical Documentation</span></div>
                            <div class="metadata-row"><span class="metadata-category">[ TAGS: ]</span><span class="metadata-value">${tagLabel}</span></div>
                        </div>
                    </div>
                </article>`;
        } else if (post.type === 'quote') {
            html = `
                <article class="post-card" ${common} data-content-type="initiative">
                    <span class="content-type-badge badge-initiative">🌍 Initiative</span>
                    <div class="post-body">
                        <h3 class="post-title">Field Observation</h3>
                        <p class="post-location">Archive / Reflective Entry</p>
                        <div class="post-excerpt">"${post['quote-text'] || ''}"</div>
                        <div class="metadata-ledger">
                            <div class="metadata-row"><span class="metadata-category">[ SOURCE: ]</span><span class="metadata-value">${stripHtml(post['quote-source'])}</span></div>
                            <div class="metadata-row"><span class="metadata-category">[ TAGS: ]</span><span class="metadata-value">${tagLabel}</span></div>
                        </div>
                    </div>
                </article>`;
        } else if (post.type === 'link') {
            html = `
                <article class="post-card" ${common} data-content-type="initiative">
                    <span class="content-type-badge badge-initiative">🌍 Initiative</span>
                    <div class="post-body">
                        <h3 class="post-title">${escapeHtml(post['link-text'] || 'Untitled')}</h3>
                        <p class="post-location">Reference / External Source</p>
                        <div class="post-excerpt">${post['link-description'] || ''}</div>
                        <div class="metadata-ledger">
                            <div class="metadata-row"><span class="metadata-category">[ TAGS: ]</span><span class="metadata-value">${tagLabel}</span></div>
                        </div>
                    </div>
                </article>`;
        }

        if (!html) return null;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        return wrapper.firstElementChild;
    }


    // Loads every post, and only swaps the grid if the load worked
    function loadFullBlog() {
        if (loadPromise) return loadPromise;
        loadPromise = (async () => {
            try {
                const pageSize = 50;
                const first = parseTumblrJson(await (await fetch(`/api/read/json?num=${pageSize}&start=0`)).text());
                const total = parseInt(first['posts-total'], 10) || 0;
                let posts = first.posts || [];

                for (let start = pageSize; start < total; start += pageSize) {
                    const page = parseTumblrJson(await (await fetch(`/api/read/json?num=${pageSize}&start=${start}`)).text());
                    posts = posts.concat(page.posts || []);
                }

                const cards = posts.map(buildPostCard).filter(Boolean);
                if (cards.length) {
                    postGrid.innerHTML = '';
                    cards.forEach(c => postGrid.appendChild(c));
                    allPostCards = cards;
                }
            } catch (err) {
                console.error('Full blog load failed, filtering this page only:', err);
            }
        })();
        return loadPromise;
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.classList.toggle('active');
            // Only fetch the whole blog the first time someone filters
            if (!isTagPage) await loadFullBlog();
            applyFilters();
        });
    });
        

        // Lightbox (delegated)
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const closeButton = document.querySelector('.lightbox-close');

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.post-card[data-image]');
        if (card) {
            lightboxImg.src = card.dataset.image;
            lightboxTitle.textContent = card.dataset.title || 'Archive Reference';
            lightbox.classList.add('active');
            lightbox.setAttribute('aria-hidden', 'false');
        }
    });

    closeButton.addEventListener('click', () => {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
    });

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            lightbox.classList.remove('active');
            lightbox.setAttribute('aria-hidden', 'true');
        }
    });
    
    // DATA LOG TICKER
(function () {
    const track = document.getElementById('tickerTrack');
    const ticker = document.getElementById('dataTicker');
    if (!track || !ticker) return;

    const pad = n => String(n).padStart(2, '0');

    function animateCount(el, target) {
        const duration = 1400;
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toLocaleString('en-US');
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function render(items) {
        const html = items.map(i =>
            `<span class="ticker-item">[ ${i.label}: <strong${i.count ? ' data-count="' + i.count + '"' : ''}>${i.value}</strong> ]</span>`
        ).join('');
        // Duplicated so the loop scrolls seamlessly
        track.innerHTML = html + html;
        track.querySelectorAll('strong[data-count]').forEach(el => {
            animateCount(el, Number(el.dataset.count));
        });
    }

    // Metrics read from the page
    const firstCard = document.querySelector('.post-card[data-log-date]');
    const lastUpload = firstCard ? firstCard.dataset.logDate : null;
    const regionCount = Array.from(document.querySelectorAll('.region-item a'))
        .filter(a => !a.dataset.regionName.startsWith('All')).length;
    const pageLogs = document.querySelectorAll('.post-card').length;

    function buildItems(total) {
        const items = [];
        if (total) items.push({ label: 'TOTAL SPECIMENS ARCHIVED', value: '0', count: total });
        if (lastUpload) items.push({ label: 'LAST LOG UPLOAD', value: lastUpload });
        items.push({ label: 'REGIONS INDEXED', value: String(regionCount), count: regionCount });
        items.push({ label: 'LOGS ON THIS PAGE', value: String(pageLogs), count: pageLogs });
        items.push({ label: 'ARCHIVE STATUS', value: 'ACTIVE' });
        return items;
    }

    // Show something immediately, then upgrade once the total arrives
    render(buildItems(0));

    const manual = parseInt(ticker.dataset.manualTotal, 10) || 0;

    fetch('/api/read/json?num=0')
        .then(r => r.text())
        .then(text => {
            const json = JSON.parse(text.replace(/^var tumblr_api_read = /, '').replace(/;\s*$/, ''));
            const total = parseInt(json['posts-total'], 10);
            render(buildItems(total || manual));
        })
        .catch(() => render(buildItems(manual)));
})();

    // MINI DATA VISUALIZATIONS
    (function () {
        const cards = document.querySelectorAll('.atlas-card');
        if (!cards.length) return;

        const norm = t => String(t).trim().toLowerCase().replace(/\s+/g, '-');
        const lastSegment = href => norm(decodeURIComponent((href || '').split('/').filter(Boolean).pop() || ''));

        // Each card's tag set = its own tag + every sub-region in the matching sidebar section
        const regions = Array.from(cards).map(card => {
            const key = lastSegment(card.getAttribute('href'));
            const section = document.getElementById('region-' + key);
            const tags = new Set([key]);
            if (section) {
                section.querySelectorAll('.region-item a').forEach(a => tags.add(lastSegment(a.getAttribute('href'))));
            }
            return { card, tags };
        });

        // Step 1: manual biodiversity bar (works without any API)
        regions.forEach(({ card }) => {
            const viz = card.querySelector('.viz');
            if (!viz) return;
            const value = Math.max(0, Math.min(100, parseInt(card.dataset.biodiversity, 10) || 0));
            const filled = Math.round(value / 10);
            let segs = '';
            for (let i = 0; i < 10; i++) segs += `<span class="px-seg${i < filled ? ' on' : ''}"></span>`;
            viz.innerHTML = `
                <div class="viz-row">
                    <span class="viz-label">Biodiversity</span>
                    <div class="px-bar" role="img" aria-label="Biodiversity ${value} percent">${segs}</div>
                    <span class="viz-val">${value}%</span>
                </div>
                <div class="viz-row viz-live" hidden></div>`;
        });

        // Step 2: live ring + 12-month bars from the blog's posts
        async function loadPostsForViz() {
            const pageSize = 50;
            const first = parseTumblrJson(await (await fetch(`/api/read/json?num=${pageSize}&start=0`)).text());
            const total = parseInt(first['posts-total'], 10) || 0;
            let posts = first.posts || [];
            for (let start = pageSize; start < total; start += pageSize) {
                const page = parseTumblrJson(await (await fetch(`/api/read/json?num=${pageSize}&start=${start}`)).text());
                posts = posts.concat(page.posts || []);
            }
            return posts;
        }

        function monthBuckets(matching) {
            const now = new Date();
            const buckets = new Array(12).fill(0);
            matching.forEach(p => {
                const d = new Date((p['unix-timestamp'] || 0) * 1000);
                const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
                if (diff >= 0 && diff < 12) buckets[11 - diff]++;
            });
            return buckets;
        }

        function sparkSvg(buckets) {
            const max = Math.max(...buckets, 1);
            const rects = buckets.map((n, i) => {
                const h = n ? Math.max(2, Math.round((n / max) * 16)) : 1;
                return `<rect x="${i * 5}" y="${16 - h}" width="4" height="${h}"></rect>`;
            }).join('');
            return `<svg class="px-spark" viewBox="0 0 60 16" shape-rendering="crispEdges" role="img" aria-label="Posts per month, last 12 months">${rects}</svg>`;
        }

        (async () => {
            try {
                const posts = await loadPostsForViz();
                if (!posts.length) return;

                regions.forEach(({ card, tags }) => {
                    const live = card.querySelector('.viz-live');
                    if (!live) return;
                    const matching = posts.filter(p => (p.tags || []).some(t => tags.has(norm(t))));
                    const share = Math.round((matching.length / posts.length) * 100);
                    live.innerHTML = `
                        <div class="px-ring" style="--p:${share}"><span>${share}%</span></div>
                        <span class="viz-label">Share of logs<br>${matching.length} posts</span>
                        ${sparkSvg(monthBuckets(matching))}`;
                    live.hidden = false;
                });
            } catch (err) {
                console.error('Region visualizations: live data unavailable, showing manual bars only:', err);
            }
        })();
    })();
    
        // NAVIGATION HUB (view switch at /#hub)
    (function () {
        const hub = document.getElementById('hub');
        const hubLink = document.getElementById('hubLink');
        if (!hub || !hubLink) return;
        const mainLink = document.querySelector('.nav-link[href="/"]');
        const hideWhenHub = document.querySelectorAll('.atlas-map-grid, .post-grid');

        function syncHub() {
            const on = location.hash === '#hub';
            hub.hidden = !on;
            hideWhenHub.forEach(el => { el.style.display = on ? 'none' : ''; });
            hubLink.classList.toggle('active', on);
            if (mainLink) mainLink.classList.toggle('active', !on);
            if (on) window.scrollTo(0, 0);
        }

        window.addEventListener('hashchange', syncHub);
        syncHub();
    })();
    
   // CLASSIFY ANTHROPOGENIC TARGET MATRICES
function processAnthropogenicTags(tagString) {
    if (tagString.startsWith('arch-')) {
        console.log('Ingesting Architectural Schema:', tagString);
        // Execute custom rendering mechanics for structural layouts
    } else if (tagString.startsWith('art-')) {
        console.log('Ingesting Fine Art Schema:', tagString);
        // Execute custom rendering mechanics for physical artifacts
    } else if (tagString.startsWith('cult-')) {
        console.log('Ingesting Cultural Domain Schema:', tagString);
        // Execute legacy heritage mapping strings
    }
}
 
// --- BALANCED SYSTEM OPERATOR MODAL ENGINE ---
document.addEventListener("DOMContentLoaded", function() {
    const triggerBtn = document.getElementById('operator-manifest-trigger');
    const closeBtn = document.getElementById('operator-manifest-close');
    const modalContainer = document.getElementById('manifest-modal-container');

    // VERIFY ALL TERMINAL LINKS EXIST BEFORE BINDING
    if (triggerBtn && modalContainer) {
        triggerBtn.addEventListener('click', function(event) {
            event.preventDefault(); // Blocks Tumblr hash navigation actions
            modalContainer.style.display = 'flex';
            console.log("System Operator Matrix: ENGAGED");
        });
    } else {
        console.error("System Diagnostics: Trigger or Modal target missing from DOM structure.");
    }

    if (closeBtn && modalContainer) {
        closeBtn.addEventListener('click', function(event) {
            event.preventDefault();
            modalContainer.style.display = 'none';
        });
    }

    if (modalContainer) {
        modalContainer.addEventListener('click', function(event) {
            if (event.target === modalContainer) {
                modalContainer.style.display = 'none';
            }
        });
    }
});




</script>
