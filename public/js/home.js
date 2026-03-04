// ===== HOME PAGE + AUTH OVERLAY JS =====

// --- Smooth scrolling ---
function smoothScroll(selector) {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('navLinks')?.classList.remove('open');
}

// --- Nav scroll effect ---
window.addEventListener('scroll', () => {
    const nav = document.getElementById('siteNav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
});

// --- Mobile nav toggle ---
function toggleMobileNav() {
    document.getElementById('navLinks')?.classList.toggle('open');
}

// --- Auth Overlay ---
function showLoginModal(tab) {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (tab) switchAuthTab(tab);
    document.getElementById('loginEmail')?.focus();
}

function hideAuthOverlay() {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    // Clear errors
    ['loginError', 'regError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.add('hidden'); }
    });
}

// Close on overlay click
document.getElementById('auth-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('auth-overlay')) hideAuthOverlay();
});

// Escape key closes overlay
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAuthOverlay();
});

// --- Tab switching ---
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('auth-register').classList.toggle('hidden', tab !== 'register');
}

// --- Toggle password visibility ---
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

// --- Show auth error ---
function showAuthError(elId, msg) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.classList.remove('hidden');
}

// --- LOGIN ---
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    document.getElementById('loginError').classList.add('hidden');

    ui.setLoading(btn, true);
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Login failed');

        // Store session
        localStorage.setItem('hms_token', data.token);
        localStorage.setItem('hms_user', JSON.stringify(data.user));
        api.setToken(data.token);

        hideAuthOverlay();
        Auth.currentUser = data.user;

        // Hide home, show app
        document.getElementById('home-site').classList.add('hidden');
        App.showApp();

        ui.toast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
    } catch (err) {
        showAuthError('loginError', err.message);
    } finally {
        ui.setLoading(btn, false);
    }
}

// --- DEMO LOGIN ---
function demoLogin(email, password) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
    handleLogin({ preventDefault: () => { } });
}

// --- REGISTER ---
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    document.getElementById('regError').classList.add('hidden');

    const payload = {
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        phone: document.getElementById('regPhone').value.trim(),
        password: document.getElementById('regPassword').value,
        blood_group: document.getElementById('regBlood').value,
        gender: document.getElementById('regGender').value,
        date_of_birth: document.getElementById('regDob').value,
    };

    if (payload.password.length < 6) {
        showAuthError('regError', 'Password must be at least 6 characters');
        return;
    }

    ui.setLoading(btn, true);
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Registration failed');

        localStorage.setItem('hms_token', data.token);
        localStorage.setItem('hms_user', JSON.stringify(data.user));
        api.setToken(data.token);

        hideAuthOverlay();
        Auth.currentUser = data.user;
        document.getElementById('home-site').classList.add('hidden');
        App.showApp();

        ui.toast(`Welcome to MediCore, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
    } catch (err) {
        showAuthError('regError', err.message);
    } finally {
        ui.setLoading(btn, false);
    }
}

// --- CONTACT FORM ---
async function submitContactForm(e) {
    e.preventDefault();
    const btn = document.getElementById('cfSubmitBtn');
    ui.setLoading(btn, true);
    try {
        const res = await fetch('/api/public/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('cf_name').value.trim(),
                email: document.getElementById('cf_email').value.trim(),
                phone: document.getElementById('cf_phone').value.trim(),
                subject: document.getElementById('cf_subject').value.trim(),
                message: document.getElementById('cf_message').value.trim(),
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        ui.toast(data.message, 'success');
        document.getElementById('contactForm').reset();
    } catch (err) {
        ui.toast(err.message || 'Failed to send. Please try again.', 'error');
    } finally {
        ui.setLoading(btn, false);
    }
}

// --- INIT: check if already logged in ---
function initHomePage() {
    const token = localStorage.getItem('hms_token');
    const userJson = localStorage.getItem('hms_user');
    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            api.setToken(token);
            Auth.currentUser = user;
            document.getElementById('home-site').classList.add('hidden');
            App.showApp();
            return;
        } catch { }
    }
    // Show home site
    document.getElementById('home-site').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');

    // Animate sections on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Extend Auth object with logout back to home
const _origLogout = window.Auth?.logout;
function initAuthExtension() {
    if (window.Auth) {
        Auth.logout = function () {
            localStorage.removeItem('hms_token');
            localStorage.removeItem('hms_user');
            api.setToken(null);
            Auth.currentUser = null;
            document.getElementById('app-section').classList.add('hidden');
            document.getElementById('home-site').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            ui.toast('You have been logged out', 'success');
        };
    }
}

// IntersectionObserver visibility trick
document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
    initAuthExtension();
});

// Make visible on scroll
document.addEventListener('scroll', () => {
    document.querySelectorAll('.section').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 80) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }
    });
}, { passive: true });
