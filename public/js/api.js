// ===== API CLIENT =====
const API_BASE = '/api';

const api = {
    _token: null,

    setToken(token) { this._token = token; localStorage.setItem('hms_token', token); },
    getToken() { return this._token || localStorage.getItem('hms_token'); },
    clearToken() { this._token = null; localStorage.removeItem('hms_token'); },

    async request(method, endpoint, data = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (data && method !== 'GET') config.body = JSON.stringify(data);

        let url = `${API_BASE}${endpoint}`;
        if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            url += '?' + params.toString();
        }

        try {
            const res = await fetch(url, config);
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Request failed');
            return json;
        } catch (err) {
            throw err;
        }
    },

    get: (ep, params) => api.request('GET', ep, params),
    post: (ep, data) => api.request('POST', ep, data),
    put: (ep, data) => api.request('PUT', ep, data),
    delete: (ep) => api.request('DELETE', ep),

    // Auth
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),

    // Admin
    adminStats: () => api.get('/admin/stats'),
    adminDoctors: () => api.get('/admin/doctors'),
    addDoctor: (data) => api.post('/admin/doctors', data),
    updateDoctor: (id, data) => api.put(`/admin/doctors/${id}`, data),
    deleteDoctor: (id) => api.delete(`/admin/doctors/${id}`),
    adminPatients: () => api.get('/admin/patients'),
    adminPatient: (id) => api.get(`/admin/patients/${id}`),
    adminAppointments: () => api.get('/admin/appointments'),

    // Doctor
    doctorProfile: () => api.get('/doctor/profile'),
    updateDoctorProfile: (data) => api.put('/doctor/profile', data),
    doctorStats: () => api.get('/doctor/stats'),
    doctorAppointments: (params) => api.get('/doctor/appointments', params),
    doctorPatients: () => api.get('/doctor/patients'),
    doctorPatient: (id) => api.get(`/doctor/patients/${id}`),
    updateAppointment: (id, data) => api.put(`/doctor/appointments/${id}`, data),
    doctorNotifications: () => api.get('/doctor/notifications'),
    markDoctorNotifRead: (id) => api.put(`/doctor/notifications/${id}/read`),

    // Patient
    patientProfile: () => api.get('/patient/profile'),
    updatePatientProfile: (data) => api.put('/patient/profile', data),
    patientStats: () => api.get('/patient/stats'),
    patientAppointments: () => api.get('/patient/appointments'),
    patientBills: () => api.get('/patient/bills'),
    payBill: (id, data) => api.put(`/patient/bills/${id}/pay`, data),
    patientNotifications: () => api.get('/patient/notifications'),
    markPatientNotifRead: (id) => api.put(`/patient/notifications/${id}/read`),

    // Appointments
    getAvailableDoctors: (params) => api.get('/appointments/doctors', params),
    getSlots: (doctorId, date) => api.get(`/appointments/slots/${doctorId}/${date}`),
    bookAppointment: (data) => api.post('/appointments', data),
    cancelAppointment: (id) => api.put(`/appointments/${id}/cancel`, {}),

    // Billing (admin)
    allBills: () => api.get('/billing'),
    createBill: (data) => api.post('/billing', data),
    updateBill: (id, data) => api.put(`/billing/${id}`, data),

    // Pharmacy
    getMedicines: (params) => api.get('/pharmacy', params),
    addMedicine: (data) => api.post('/pharmacy', data),
    updateMedicine: (id, data) => api.put(`/pharmacy/${id}`, data),
    deleteMedicine: (id) => api.delete(`/pharmacy/${id}`),
    restockMedicine: (id, data) => api.put(`/pharmacy/${id}/restock`, data),
};

window.api = api;
