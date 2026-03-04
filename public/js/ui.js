// ===== UI UTILITIES =====

// Toast notifications
const ui = {
    toast(message, type = 'info', duration = 3500) {
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        document.getElementById('toastContainer').appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, duration);
    },

    // Modal management
    openModal(title, bodyHtml, size = '') {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('modal');
        overlay.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        if (size) modal.classList.add(size); else modal.classList.remove('modal-lg');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.getElementById('modalBody').innerHTML = '';
    },

    // Loader
    loader() { return `<div class="loader"><div class="spinner"></div></div>`; },

    // Status badge
    badge(status) {
        const map = {
            pending: 'warning', confirmed: 'primary', completed: 'success', cancelled: 'danger',
            paid: 'success', unpaid: 'warning', active: 'success', inactive: 'danger',
        };
        return `<span class="badge badge-${map[status] || 'muted'}">${status}</span>`;
    },

    // Format date
    formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatTime(t) {
        if (!t) return '—';
        const [h, m] = t.split(':');
        const ampm = +h >= 12 ? 'PM' : 'AM';
        const h12 = +h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    },

    formatCurrency(n) { return '₹' + (+n || 0).toFixed(2); },

    // Avatar initials
    initials(name = '') {
        return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    },

    // Age from DOB
    age(dob) {
        if (!dob) return '—';
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)) + ' yrs';
    },

    // Empty state
    empty(icon, title, msg) {
        return `<div class="empty-state">
      <i class="fas ${icon}"></i>
      <h4>${title}</h4>
      <p>${msg}</p>
    </div>`;
    },

    // Confirm dialog
    confirm(title, msg, onYes) {
        ui.openModal(title, `
      <p style="color:var(--text-muted);margin-bottom:1.5rem;">${msg}</p>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
        <button class="btn btn-danger" id="confirmYes">Confirm</button>
      </div>
    `);
        document.getElementById('confirmYes').onclick = () => { ui.closeModal(); onYes(); };
    },

    setBreadcrumb(text) {
        const el = document.getElementById('breadcrumb');
        if (el) el.textContent = text;
    },

    setLoading(btn, loading) {
        if (!btn) return;
        if (loading) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'; }
        else { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
    }
};

window.ui = ui;
