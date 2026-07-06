document.addEventListener('DOMContentLoaded', () => {
    let allNotes = [];
    let selectedNote = null;

    // Elements
    const feedContainer = document.getElementById('feed-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.chip');
    const resultsCount = document.getElementById('results-count');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Tweet Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const drawerPreviewText = document.getElementById('drawer-preview-text');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const tweetNowBtn = document.getElementById('tweet-now-btn');

    // Fetch notes from Flask API
    async function fetchNotes() {
        showSkeleton();
        refreshIcon.classList.add('spin-animation');
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            
            if (data.success) {
                allNotes = data.notes;
                renderNotes();
            } else {
                showError(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            showError('Network error occurred while fetching updates.');
            console.error(error);
        } finally {
            refreshIcon.classList.remove('spin-animation');
            refreshBtn.disabled = false;
        }
    }

    // Helper to strip HTML tags for plain-text representations
    function stripHtml(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // Render cards to the UI
    function renderNotes() {
        const query = searchInput.value.toLowerCase().trim();
        const activeChip = document.querySelector('.chip.active');
        const activeType = activeChip ? activeChip.getAttribute('data-type') : 'all';

        // Filter notes
        const filteredNotes = allNotes.filter(note => {
            const matchesSearch = stripHtml(note.content).toLowerCase().includes(query) || 
                                  note.date.toLowerCase().includes(query) ||
                                  note.type.toLowerCase().includes(query);
            
            const matchesType = activeType === 'all' || note.type.toLowerCase() === activeType;

            return matchesSearch && matchesType;
        });

        // Clear feed
        feedContainer.innerHTML = '';
        resultsCount.textContent = `Showing ${filteredNotes.length} update${filteredNotes.length === 1 ? '' : 's'}`;

        if (filteredNotes.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--border-subtle);"></i>
                    <p>No release notes match your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        // Generate Cards
        filteredNotes.forEach((note, index) => {
            const card = document.createElement('div');
            card.className = 'note-card';
            if (selectedNote && selectedNote.content === note.content && selectedNote.date === note.date) {
                card.classList.add('selected');
            }

            const badgeClass = getBadgeClass(note.type);
            const cleanText = stripHtml(note.content).trim();

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <span class="date-text">${note.date}</span>
                </div>
                <div class="card-content">
                    ${note.content}
                </div>
                <div class="card-footer">
                    <button class="btn-card-link" title="Open Official Release Notes" onclick="window.open('${note.url}', '_blank'); event.stopPropagation();">
                        <i class="fa-solid fa-up-right-from-square"></i>
                    </button>
                    <button class="btn-card-copy" title="Copy to clipboard" data-index="${index}">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="btn-card-tweet" title="Tweet this update" data-index="${index}">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            `;

            // Card click listener for selecting to Tweet
            card.addEventListener('click', () => {
                selectNote(note, card);
            });

            // Copy button click listener
            const cardCopyBtn = card.querySelector('.btn-card-copy');
            cardCopyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(`[${note.type}] [${note.date}] ${cleanText}`);
                    cardCopyBtn.classList.add('copied');
                    const icon = cardCopyBtn.querySelector('i');
                    icon.className = 'fa-solid fa-check';
                    setTimeout(() => {
                        cardCopyBtn.classList.remove('copied');
                        icon.className = 'fa-solid fa-copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
            });

            // Tweet button directly on the card
            const cardTweetBtn = card.querySelector('.btn-card-tweet');
            cardTweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetIntent(note);
            });

            feedContainer.appendChild(card);
        });
    }

    // Select/Deselect a card for the drawer
    function selectNote(note, cardElement) {
        if (selectedNote && selectedNote.content === note.content && selectedNote.date === note.date) {
            // Deselect
            selectedNote = null;
            cardElement.classList.remove('selected');
            hideDrawer();
        } else {
            // Select new
            selectedNote = note;
            
            // Remove selection class from others
            document.querySelectorAll('.note-card').forEach(el => el.classList.remove('selected'));
            cardElement.classList.add('selected');
            
            // Populate drawer
            const cleanText = stripHtml(note.content).trim();
            drawerPreviewText.textContent = `[${note.type}] - ${cleanText}`;
            showDrawer();
        }
    }

    // Class helper for badge styling
    function getBadgeClass(type) {
        const t = type.toLowerCase();
        if (t.includes('feat')) return 'feature';
        if (t.includes('chang')) return 'changed';
        if (t.includes('deprec')) return 'deprecated';
        if (t.includes('fix')) return 'fixed';
        return 'general';
    }

    // Tweet Trigger Action
    function openTweetIntent(note) {
        const cleanContent = stripHtml(note.content).trim();
        
        // Character count limit helper for standard tweet intent (approx 280 limit)
        // Leave room for tags and URL
        const maxTextLen = 170;
        let snippet = cleanContent;
        if (cleanContent.length > maxTextLen) {
            snippet = cleanContent.substring(0, maxTextLen) + '...';
        }

        const tweetText = `BigQuery Update [${note.date}] 🚀\n\n[${note.type}] ${snippet}\n\n#GoogleCloud #BigQuery`;
        const tweetUrl = note.url || 'https://cloud.google.com/bigquery/docs/release-notes';
        
        const fullUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(tweetUrl)}`;
        window.open(fullUrl, '_blank');
    }

    // Drawer Visibility
    function showDrawer() {
        tweetDrawer.classList.add('show');
    }

    function hideDrawer() {
        tweetDrawer.classList.remove('show');
        // Clear card selections
        document.querySelectorAll('.note-card').forEach(el => el.classList.remove('selected'));
        selectedNote = null;
    }

    // Skeletons
    function showSkeleton() {
        feedContainer.innerHTML = Array(6).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-badge"></div>
                <div class="skeleton-line title"></div>
                <div class="skeleton-line text"></div>
                <div class="skeleton-line text"></div>
                <div class="skeleton-line text short"></div>
            </div>
        `).join('');
    }

    // Error rendering
    function showError(message) {
        feedContainer.innerHTML = `
            <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #ef4444;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3.5rem; margin-bottom: 1.25rem;"></i>
                <h3 style="margin-bottom: 0.5rem; color: white;">Error Loading Feed</h3>
                <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 1.5rem auto;">${message}</p>
                <button id="retry-btn" class="btn btn-primary">Try Again</button>
            </div>
        `;
        document.getElementById('retry-btn').addEventListener('click', fetchNotes);
    }

    // Event Listeners
    refreshBtn.addEventListener('click', fetchNotes);
    
    searchInput.addEventListener('input', () => {
        renderNotes();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderNotes();
        });
    });

    closeDrawerBtn.addEventListener('click', hideDrawer);
    
    tweetNowBtn.addEventListener('click', () => {
        if (selectedNote) {
            openTweetIntent(selectedNote);
        }
    });

    // Theme Switch logic
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.checked = true;
        } else {
            document.body.classList.remove('light-mode');
            themeToggle.checked = false;
        }
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Export CSV logic
    function exportToCSV() {
        const query = searchInput.value.toLowerCase().trim();
        const activeChip = document.querySelector('.chip.active');
        const activeType = activeChip ? activeChip.getAttribute('data-type') : 'all';

        const filteredNotes = allNotes.filter(note => {
            const matchesSearch = stripHtml(note.content).toLowerCase().includes(query) || 
                                   note.date.toLowerCase().includes(query) ||
                                   note.type.toLowerCase().includes(query);
            const matchesType = activeType === 'all' || note.type.toLowerCase() === activeType;
            return matchesSearch && matchesType;
        });

        if (filteredNotes.length === 0) {
            alert('No release notes to export.');
            return;
        }

        // Format CSV text with proper escaping
        let csvRows = [];
        csvRows.push('"Date","Type","Content","URL"');

        filteredNotes.forEach(note => {
            const date = note.date.replace(/"/g, '""');
            const type = note.type.replace(/"/g, '""');
            const content = stripHtml(note.content).replace(/"/g, '""').trim();
            const url = note.url.replace(/"/g, '""');
            csvRows.push(`"${date}","${type}","${content}","${url}"`);
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportCsvBtn.addEventListener('click', exportToCSV);

    // Initial setups
    initTheme();
    fetchNotes();
});
