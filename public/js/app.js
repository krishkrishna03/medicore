// app.js init is triggered by home.js after session check


const MENUS = {
    admin: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
        { id: 'doctors', label: 'Manage Doctors', icon: 'fa-user-md' },
        { id: 'patients', label: 'Patients', icon: 'fa-users' },
        { id: 'all-appointments', label: 'Appointments', icon: 'fa-calendar-alt' },
        { id: 'billing', label: 'Billing', icon: 'fa-file-invoice-dollar' },
        { id: 'pharmacy', label: 'Pharmacy', icon: 'fa-pills' },
    ],
    doctor: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
        { id: 'doctor-appointments', label: 'My Schedule', icon: 'fa-calendar-alt' },
        { id: 'my-patients', label: 'My Patients', icon: 'fa-users' },
        { id: 'doctor-profile', label: 'My Profile', icon: 'fa-user-md' },
    ],
    patient: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
        { id: 'book-appointment', label: 'Book Appointment', icon: 'fa-calendar-plus' },
        { id: 'my-appointments', label: 'My Appointments', icon: 'fa-calendar-alt' },
        { id: 'my-bills', label: 'My Bills', icon: 'fa-file-invoice-dollar' },
        { id: 'patient-profile', label: 'My Profile', icon: 'fa-user' },
    ],
};

const PAGE_HANDLERS = {
    // Admin
    'dashboard': { admin: () => AdminPages.dashboard(), doctor: () => DoctorPages.dashboard(), patient: () => PatientPages.dashboard() },
    'doctors': { admin: () => AdminPages.doctors() },
    'add-doctor': { admin: () => { AdminPages.doctors(); setTimeout(() => AdminPages.addDoctorModal(), 300); } },
    'patients': { admin: () => AdminPages.patients() },
    'all-appointments': { admin: () => AdminPages.allAppointments() },
    'billing': { admin: () => AdminPages.billing() },
    'pharmacy': { admin: () => AdminPages.pharmacy() },
    // Doctor
    'doctor-appointments': { doctor: () => DoctorPages.appointments() },
    'my-patients': { doctor: () => DoctorPages.myPatients() },
    'doctor-profile': { doctor: () => DoctorPages.profile() },
    // Patient
    'book-appointment': { patient: () => PatientPages.bookAppointment() },
    'my-appointments': { patient: () => PatientPages.myAppointments() },
    'my-bills': { patient: () => PatientPages.myBills() },
    'patient-profile': { patient: () => PatientPages.profile() },
};

const App = {
    currentPage: 'dashboard',

    showApp() {
        document.getElementById('app-section').classList.remove('hidden');
        App.setupLayout();
        App.navigate('dashboard');
        App.loadNotifications();
        setInterval(App.loadNotifications, 60000);
    },

    setupLayout() {
        const user = Auth.currentUser;
        const role = user.role;
        const avatarClass = `avatar-${role}`;

        // Sidebar nav
        const menu = MENUS[role] || [];
        const sidebarNav = document.getElementById('sidebarNav');
        sidebarNav.innerHTML = menu.map(item => `
      <div class="nav-item" data-page="${item.id}" onclick="App.navigate('${item.id}')">
        <i class="fas ${item.icon}"></i>
        <span>${item.label}</span>
      </div>
    `).join('');

        // Sidebar user
        document.getElementById('sidebarUser').innerHTML = `
      <div class="sidebar-user-card">
        <div class="user-ava ${avatarClass}">${ui.initials(user.name)}</div>
        <div class="sidebar-user-info">
          <strong>${user.name}</strong>
          <span>${role}</span>
        </div>
      </div>
    `;

        // Top bar user
        document.getElementById('userAvatar').className = `user-avatar ${avatarClass}`;
        document.getElementById('userAvatar').textContent = ui.initials(user.name);
        document.getElementById('userName').textContent = user.name.split(' ')[0];

        // Events
        document.getElementById('userMenu').onclick = (e) => {
            e.stopPropagation();
            document.getElementById('userDropdown').classList.toggle('hidden');
        };
        document.getElementById('logoutBtn').onclick = (e) => { e.preventDefault(); Auth.logout(); };
        document.getElementById('profileLink').onclick = (e) => {
            e.preventDefault();
            document.getElementById('userDropdown').classList.add('hidden');
            const profilePage = role === 'admin' ? null : role === 'doctor' ? 'doctor-profile' : 'patient-profile';
            if (profilePage) App.navigate(profilePage);
        };
        document.addEventListener('click', () => document.getElementById('userDropdown')?.classList.add('hidden'));

        // Modal close
        document.getElementById('modalClose').onclick = ui.closeModal;
        document.getElementById('modalOverlay').onclick = (e) => { if (e.target === document.getElementById('modalOverlay')) ui.closeModal(); };

        // Notifications
        document.getElementById('notifBtn').onclick = (e) => {
            e.stopPropagation();
            document.getElementById('notifPanel').classList.toggle('hidden');
        };
        document.addEventListener('click', () => document.getElementById('notifPanel')?.classList.add('hidden'));

        // Mark all read
        document.getElementById('markAllRead').onclick = () => App.markAllNotifRead();

        // Mobile toggle
        document.getElementById('mobileToggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    },

    navigate(pageId) {
        App.currentPage = pageId;
        const role = Auth.currentUser?.role;

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === pageId);
        });

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Find and execute page handler
        const handler = PAGE_HANDLERS[pageId];
        if (handler) {
            const fn = handler[role] || handler['*'];
            if (fn) { fn(); return; }
        }

        // Fallback to dashboard
        App.navigate('dashboard');
    },

    async loadNotifications() {
        try {
            const role = Auth.currentUser?.role;
            let res;
            if (role === 'admin') res = null; // Admin doesn't have notifications route, skip
            else if (role === 'doctor') res = await api.doctorNotifications();
            else if (role === 'patient') res = await api.patientNotifications();

            if (!res) return;
            const notifs = res.data || [];
            const unread = notifs.filter(n => !n.is_read);

            // Update badge
            const badge = document.getElementById('notifBadge');
            badge.textContent = unread.length;
            badge.classList.toggle('hidden', unread.length === 0);

            // Render notifications
            const list = document.getElementById('notifList');
            list.innerHTML = notifs.length ? notifs.slice(0, 10).map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n._id}">
          ${!n.is_read ? '<div class="notif-dot"></div>' : '<div style="width:8px;flex-shrink:0;"></div>'}
          <div class="notif-item-content">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <time>${App.timeAgo(n.createdAt)}</time>
          </div>
        </div>
      `).join('') : '<div class="empty-state" style="padding:2rem;"><i class="fas fa-bell"></i><p>No notifications</p></div>';

            App._notifs = notifs;
        } catch { /* ignore */ }
    },

    async markAllNotifRead() {
        const role = Auth.currentUser?.role;
        const notifs = App._notifs || [];
        const unread = notifs.filter(n => !n.is_read);
        for (const n of unread) {
            try {
                if (role === 'doctor') await api.markDoctorNotifRead(n.id);
                else if (role === 'patient') await api.markPatientNotifRead(n.id);
            } catch { }
        }
        App.loadNotifications();
        ui.toast('All notifications marked as read', 'success');
    },

    timeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }
};

window.App = App;

// Init is triggered by home.js initHomePage() after session restore
