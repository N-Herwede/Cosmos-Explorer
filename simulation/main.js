// WebGL-only loader.

const statusEl = document.getElementById('loading-status');

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function markRenderer(name) {
    document.documentElement.setAttribute('data-renderer', name);
}

async function boot() {
    try {
        setStatus('Loading WebGL renderer...');
        await import('./main-webgl.js?v=20260215-realshader32');
        markRenderer('webgl');
    } catch (err) {
        console.error('WebGL init failed.', err);
        setStatus('WebGL failed to start. Check the console for errors.');
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
            loading.style.opacity = '1';
            loading.style.display = 'flex';
        }
    }
}

boot();
