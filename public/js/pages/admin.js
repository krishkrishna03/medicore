// ===== ADMIN PAGES =====
const AdminPages = {

    // ---- DASHBOARD ----
    async dashboard() {
        ui.setBreadcrumb('Admin Dashboard');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.adminStats();
            const d = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div>
            <h2>Admin Dashboard</h2>
            <p>Welcome back! Here's what's happening in your hospital today.</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" onclick="App.navigate('add-doctor')">
              <i class="fas fa-user-plus"></i> Add Doctor
            </button>
          </div>
        </div>

        <div class="stats-grid">
          ${AdminPages.statCard('fa-user-md', 'Total Doctors', d.totalDoctors, '#3b82f6', 'rgba(59,130,246,0.15)')}
          ${AdminPages.statCard('fa-users', 'Total Patients', d.totalPatients, '#10b981', 'rgba(16,185,129,0.15)')}
          ${AdminPages.statCard('fa-calendar-check', 'Today Appointments', d.todayAppointments, '#8b5cf6', 'rgba(139,92,246,0.15)')}
          ${AdminPages.statCard('fa-clock', 'Pending Appointments', d.pendingAppointments, '#f59e0b', 'rgba(245,158,11,0.15)')}
          ${AdminPages.statCard('fa-rupee-sign', 'Total Revenue', ui.formatCurrency(d.totalRevenue), '#06b6d4', 'rgba(6,182,212,0.15)')}
          ${AdminPages.statCard('fa-file-invoice-dollar', 'Pending Bills', d.pendingBills, '#ef4444', 'rgba(239,68,68,0.15)')}
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-calendar-alt"></i> Recent Appointments</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('all-appointments')">View All</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  ${d.recentAppointments.length ? d.recentAppointments.map(a => `
                    <tr>
                      <td><strong>${a.patient_name}</strong></td>
                      <td>${a.doctor_name}<br><small style="color:var(--text-muted)">${a.specialization}</small></td>
                      <td>${ui.formatDate(a.appointment_date)}<br><small>${ui.formatTime(a.appointment_time)}</small></td>
                      <td>${ui.badge(a.status)}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="4">${ui.empty('fa-calendar', 'No appointments yet', '')}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-pills"></i> Low Stock Medicines</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('pharmacy')">Manage</button>
            </div>
            <div class="card-body">
              ${d.lowStockMeds.length ? d.lowStockMeds.map(m => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                  <div>
                    <strong style="font-size:0.9rem;">${m.name}</strong>
                    <p style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${m.category}</p>
                  </div>
                  <div style="text-align:right;">
                    <div class="med-stock ${m.quantity < 50 ? 'low' : 'ok'}">${m.quantity} ${m.unit}s</div>
                    <button class="btn btn-sm btn-primary" style="margin-top:4px;" onclick="AdminPages.restockDialog('${m.id}','${m.name}')">Restock</button>
                  </div>
                </div>
              `).join('') : `<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">All medicines are well stocked ✓</p>`}
            </div>
          </div>
        </div>
      `;
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle" style="color:var(--danger)"></i><h4>Failed to load dashboard</h4><p>${err.message}</p></div>`;
        }
    },

    statCard(icon, label, value, color, bg) {
        return `<div class="stat-card" style="--stat-color:${color}">
      <div class="stat-icon" style="background:${bg};color:${color}"><i class="fas ${icon}"></i></div>
      <div class="stat-info">
        <h4>${label}</h4>
        <div class="stat-value">${value}</div>
      </div>
    </div>`;
    },

    // ---- DOCTORS ----
    async doctors() {
        ui.setBreadcrumb('Manage Doctors');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.adminDoctors();
            const doctors = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>Manage Doctors</h2><p>${doctors.length} doctors registered</p></div>
          <button class="btn btn-primary" onclick="AdminPages.addDoctorModal()">
            <i class="fas fa-user-plus"></i> Add New Doctor
          </button>
        </div>
        <div class="filter-bar">
          <div class="search-input" style="max-width:320px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search doctors..." id="docSearch" oninput="AdminPages.filterDoctors()" />
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="doctorTable">
              <thead><tr><th>Doctor</th><th>Specialization</th><th>Department</th><th>Experience</th><th>Fee</th><th>Appointments</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${doctors.length ? doctors.map(d => AdminPages.doctorRow(d)).join('') : `<tr><td colspan="8">${ui.empty('fa-user-md', 'No doctors found', 'Add a doctor to get started')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
            window._adminDoctors = doctors;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    doctorRow(d) {
        return `<tr id="doc-row-${d.doctor_id}">
      <td>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div class="user-ava avatar-doctor" style="width:38px;height:38px;font-size:0.85rem;">${ui.initials(d.name)}</div>
          <div>
            <strong>${d.name}</strong><br>
            <small style="color:var(--text-muted)">${d.email}</small>
          </div>
        </div>
      </td>
      <td>${d.specialization}</td>
      <td>${d.department || '—'}</td>
      <td>${d.experience_years} yrs</td>
      <td>${ui.formatCurrency(d.consultation_fee)}</td>
      <td><span class="badge badge-primary">${d.total_appointments}</span></td>
      <td>${ui.badge(d.is_active ? 'active' : 'inactive')}</td>
      <td>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn btn-sm btn-ghost" onclick="AdminPages.editDoctorModal('${d.doctor_id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="AdminPages.deactivateDoctor('${d.doctor_id}','${d.name}')"><i class="fas fa-ban"></i></button>
        </div>
      </td>
    </tr>`;
    },

    filterDoctors() {
        const q = document.getElementById('docSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#doctorTable tbody tr');
        rows.forEach(r => {
            const text = r.textContent.toLowerCase();
            r.style.display = text.includes(q) ? '' : 'none';
        });
    },

    addDoctorModal() {
        ui.openModal('Add New Doctor', `
      <form id="addDoctorForm">
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input class="form-control" id="docName" placeholder="Dr. John Smith" required /></div>
          <div class="form-group"><label>Email *</label><input class="form-control" type="email" id="docEmail" placeholder="doctor@hospital.com" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input class="form-control" id="docPhone" placeholder="+91 98765 43210" /></div>
          <div class="form-group"><label>Password (auto-generate if empty)</label><input class="form-control" type="text" id="docPass" placeholder="Leave blank to auto-generate" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Specialization *</label>
            <select class="form-control" id="docSpec" required>
              <option value="">Select</option>
              ${['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology', 'Psychiatry', 'General Medicine', 'Surgery', 'Dentistry', 'Radiology', 'Oncology', 'Nephrology'].map(s => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Department</label><input class="form-control" id="docDept" placeholder="e.g. OPD, ICU" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Qualification</label><input class="form-control" id="docQual" placeholder="MBBS, MD, etc." /></div>
          <div class="form-group"><label>Experience (years)</label><input class="form-control" type="number" id="docExp" value="0" min="0" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Consultation Fee (₹)</label><input class="form-control" type="number" id="docFee" value="500" min="0" /></div>
          <div class="form-group"><label>Available Days</label><input class="form-control" id="docDays" value="Mon,Tue,Wed,Thu,Fri" placeholder="Mon,Tue,Wed,Thu,Fri" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start Time</label><input class="form-control" type="time" id="docStart" value="09:00" /></div>
          <div class="form-group"><label>End Time</label><input class="form-control" type="time" id="docEnd" value="17:00" /></div>
        </div>
        <div class="form-group"><label>Bio</label><textarea class="form-control" id="docBio" rows="2" placeholder="Brief description about the doctor..."></textarea></div>
        <div id="addDocError" style="color:var(--danger);font-size:0.85rem;margin-bottom:0.75rem;"></div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="addDocBtn"><i class="fas fa-plus"></i> Add Doctor</button>
        </div>
      </form>
    `, 'modal-lg');
        document.getElementById('addDoctorForm').onsubmit = AdminPages.submitAddDoctor;
    },

    async submitAddDoctor(e) {
        e.preventDefault();
        const btn = document.getElementById('addDocBtn');
        const errEl = document.getElementById('addDocError');
        errEl.textContent = '';
        ui.setLoading(btn, true);
        try {
            const data = {
                name: document.getElementById('docName').value.trim(),
                email: document.getElementById('docEmail').value.trim(),
                phone: document.getElementById('docPhone').value.trim(),
                password: document.getElementById('docPass').value.trim() || undefined,
                specialization: document.getElementById('docSpec').value,
                department: document.getElementById('docDept').value.trim(),
                qualification: document.getElementById('docQual').value.trim(),
                experience_years: +document.getElementById('docExp').value || 0,
                consultation_fee: +document.getElementById('docFee').value || 0,
                available_days: document.getElementById('docDays').value.trim(),
                available_time_start: document.getElementById('docStart').value,
                available_time_end: document.getElementById('docEnd').value,
                bio: document.getElementById('docBio').value.trim(),
            };
            const res = await api.addDoctor(data);
            ui.closeModal();
            ui.toast(`Doctor added! Login: ${res.data.email} / ${res.data.plainPassword}`, 'success', 8000);
            AdminPages.doctors();
        } catch (err) {
            errEl.textContent = err.message;
        } finally { ui.setLoading(btn, false); }
    },

    editDoctorModal(id) {
        const d = window._adminDoctors?.find(x => x.doctor_id === id);
        if (!d) return;
        ui.openModal('Edit Doctor', `
      <form id="editDoctorForm">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input class="form-control" id="edName" value="${d.name}" /></div>
          <div class="form-group"><label>Phone</label><input class="form-control" id="edPhone" value="${d.phone || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Specialization</label><input class="form-control" id="edSpec" value="${d.specialization}" /></div>
          <div class="form-group"><label>Department</label><input class="form-control" id="edDept" value="${d.department || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Qualification</label><input class="form-control" id="edQual" value="${d.qualification || ''}" /></div>
          <div class="form-group"><label>Experience (yrs)</label><input class="form-control" type="number" id="edExp" value="${d.experience_years || 0}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fee (₹)</label><input class="form-control" type="number" id="edFee" value="${d.consultation_fee || 0}" /></div>
          <div class="form-group"><label>Status</label>
            <select class="form-control" id="edStatus">
              <option value="1" ${d.is_active ? 'selected' : ''}>Active</option>
              <option value="0" ${!d.is_active ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Available Days</label><input class="form-control" id="edDays" value="${d.available_days || 'Mon,Tue,Wed,Thu,Fri'}" /></div>
          <div class="form-group" style="display:flex;gap:0.5rem;">
            <div class="form-group" style="flex:1"><label>Start</label><input class="form-control" type="time" id="edStart" value="${d.available_time_start || '09:00'}" /></div>
            <div class="form-group" style="flex:1"><label>End</label><input class="form-control" type="time" id="edEnd" value="${d.available_time_end || '17:00'}" /></div>
          </div>
        </div>
        <div class="form-group"><label>Bio</label><textarea class="form-control" id="edBio" rows="2">${d.bio || ''}</textarea></div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="editDocBtn">Save Changes</button>
        </div>
      </form>
    `, 'modal-lg');
        document.getElementById('editDoctorForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('editDocBtn');
            ui.setLoading(btn, true);
            try {
                await api.updateDoctor(id, {
                    name: document.getElementById('edName').value,
                    phone: document.getElementById('edPhone').value,
                    specialization: document.getElementById('edSpec').value,
                    department: document.getElementById('edDept').value,
                    qualification: document.getElementById('edQual').value,
                    experience_years: +document.getElementById('edExp').value,
                    consultation_fee: +document.getElementById('edFee').value,
                    is_active: +document.getElementById('edStatus').value,
                    available_days: document.getElementById('edDays').value,
                    available_time_start: document.getElementById('edStart').value,
                    available_time_end: document.getElementById('edEnd').value,
                    bio: document.getElementById('edBio').value,
                });
                ui.closeModal(); ui.toast('Doctor updated!', 'success'); AdminPages.doctors();
            } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
        };
    },

    deactivateDoctor(id, name) {
        ui.confirm('Deactivate Doctor', `Are you sure you want to deactivate Dr. ${name}?`, async () => {
            try {
                await api.deleteDoctor(id);
                ui.toast('Doctor deactivated', 'success');
                AdminPages.doctors();
            } catch (err) { ui.toast(err.message, 'error'); }
        });
    },

    restockDialog(id, name) {
        ui.openModal('Restock Medicine', `
      <div class="form-group"><label>Medicine</label><input class="form-control" value="${name}" disabled /></div>
      <div class="form-group"><label>Quantity to Add</label><input class="form-control" type="number" id="restockQty" value="100" min="1" /></div>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
        <button class="btn btn-success" id="restockBtn" onclick="AdminPages.doRestock('${id}')">Restock</button>
      </div>
    `);
    },

    async doRestock(id) {
        const btn = document.getElementById('restockBtn');
        ui.setLoading(btn, true);
        try {
            const qty = +document.getElementById('restockQty').value;
            await api.restockMedicine(id, { quantity: qty });
            ui.closeModal(); ui.toast('Stock updated!', 'success'); AdminPages.dashboard();
        } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
    },

    // ---- PATIENTS ----
    async patients() {
        ui.setBreadcrumb('Manage Patients');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.adminPatients();
            const patients = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>Manage Patients</h2><p>${patients.length} registered patients</p></div>
        </div>
        <div class="filter-bar">
          <div class="search-input" style="max-width:320px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search patients..." id="ptSearch" oninput="AdminPages.filterPatients()" />
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="patientTable">
              <thead><tr><th>Patient</th><th>Age/Gender</th><th>Blood Group</th><th>Phone</th><th>Appointments</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody>
                ${patients.length ? patients.map(p => `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div class="user-ava avatar-patient" style="width:38px;height:38px;font-size:0.85rem;">${ui.initials(p.name)}</div>
                        <div><strong>${p.name}</strong><br><small style="color:var(--text-muted)">${p.email}</small></div>
                      </div>
                    </td>
                    <td>${ui.age(p.date_of_birth)} / ${p.gender || '—'}</td>
                    <td>${p.blood_group ? `<span class="badge badge-danger">${p.blood_group}</span>` : '—'}</td>
                    <td>${p.phone || '—'}</td>
                    <td><span class="badge badge-primary">${p.total_appointments}</span></td>
                    <td>${ui.formatDate(p.created_at)}</td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="AdminPages.viewPatient('${p.patient_id}')"><i class="fas fa-eye"></i> View</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${ui.empty('fa-users', 'No patients yet', '')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterPatients() {
        const q = document.getElementById('ptSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#patientTable tbody tr');
        rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
    },

    async viewPatient(id) {
        try {
            const res = await api.adminPatient(id);
            const p = res.data;
            ui.openModal(`Patient: ${p.name}`, `
        <div class="grid-2" style="gap:1rem;">
          <div><div class="data-label">Name</div><div class="data-value">${p.name}</div></div>
          <div><div class="data-label">Email</div><div class="data-value">${p.email}</div></div>
          <div><div class="data-label">Phone</div><div class="data-value">${p.phone || '—'}</div></div>
          <div><div class="data-label">DOB / Age</div><div class="data-value">${ui.formatDate(p.date_of_birth)} (${ui.age(p.date_of_birth)})</div></div>
          <div><div class="data-label">Gender</div><div class="data-value">${p.gender || '—'}</div></div>
          <div><div class="data-label">Blood Group</div><div class="data-value">${p.blood_group ? `<span class="badge badge-danger">${p.blood_group}</span>` : '—'}</div></div>
          <div class="col-span-2"><div class="data-label">Address</div><div class="data-value">${p.address || '—'}</div></div>
          <div><div class="data-label">Emergency Contact</div><div class="data-value">${p.emergency_contact || '—'} ${p.emergency_phone ? `(${p.emergency_phone})` : ''}</div></div>
          <div><div class="data-label">Allergies</div><div class="data-value">${p.allergies || 'None'}</div></div>
        </div>
        <div style="margin-top:1.5rem;">
          <h4 style="margin-bottom:0.75rem;font-size:0.9rem;color:var(--text-muted);">APPOINTMENT HISTORY (${p.appointments?.length || 0})</h4>
          ${p.appointments?.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${p.appointments.map(a => `
              <tr><td>${a.doctor_name}<small style="color:var(--text-muted);display:block;">${a.specialization}</small></td>
              <td>${ui.formatDate(a.appointment_date)} ${ui.formatTime(a.appointment_time)}</td>
              <td>${ui.badge(a.status)}</td></tr>
            `).join('')}</tbody></table></div>` : '<p style="color:var(--text-muted);font-size:0.85rem;">No appointments yet</p>'}
        </div>
      `, 'modal-lg');
        } catch (err) { ui.toast(err.message, 'error'); }
    },

    // ---- ALL APPOINTMENTS ----
    async allAppointments() {
        ui.setBreadcrumb('All Appointments');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.adminAppointments();
            const appts = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>All Appointments</h2><p>${appts.length} total appointments</p></div>
        </div>
        <div class="filter-bar">
          <div class="search-input" style="max-width:300px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search..." id="apptSearch" oninput="AdminPages.filterAppts()" />
          </div>
          <select class="form-control" style="width:auto;" id="apptStatusFilter" onchange="AdminPages.filterAppts()">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="apptTable">
              <thead><tr><th>Patient</th><th>Doctor</th><th>Specialization</th><th>Date & Time</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                ${appts.length ? appts.map(a => `
                  <tr data-status="${a.status}">
                    <td><strong>${a.patient_name}</strong></td>
                    <td>${a.doctor_name}</td>
                    <td>${a.specialization}</td>
                    <td>${ui.formatDate(a.appointment_date)}<br><small>${ui.formatTime(a.appointment_time)}</small></td>
                    <td><span class="badge badge-secondary">${a.type}</span></td>
                    <td>${ui.badge(a.status)}</td>
                  </tr>
                `).join('') : `<tr><td colspan="6">${ui.empty('fa-calendar', 'No appointments', '')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterAppts() {
        const q = (document.getElementById('apptSearch')?.value || '').toLowerCase();
        const status = document.getElementById('apptStatusFilter')?.value || '';
        const rows = document.querySelectorAll('#apptTable tbody tr');
        rows.forEach(r => {
            const text = r.textContent.toLowerCase();
            const rowStatus = r.dataset.status;
            const matchQ = !q || text.includes(q);
            const matchS = !status || rowStatus === status;
            r.style.display = matchQ && matchS ? '' : 'none';
        });
    },

    // ---- BILLING ----
    async billing() {
        ui.setBreadcrumb('Billing & Finance');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.allBills();
            const bills = res.data;
            const stats = res.stats;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>Billing & Finance</h2><p>Manage hospital billing records</p></div>
          <button class="btn btn-primary" onclick="AdminPages.createBillModal()">
            <i class="fas fa-plus"></i> Create Bill
          </button>
        </div>
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
          ${AdminPages.statCard('fa-check-circle', 'Collected Revenue', ui.formatCurrency(stats?.paid || 0), '#10b981', 'rgba(16,185,129,0.15)')}
          ${AdminPages.statCard('fa-clock', 'Pending Amount', ui.formatCurrency(stats?.unpaid || 0), '#f59e0b', 'rgba(245,158,11,0.15)')}
          ${AdminPages.statCard('fa-file-invoice-dollar', 'Total Bills', bills.length, '#3b82f6', 'rgba(59,130,246,0.15)')}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Doctor</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${bills.length ? bills.map(b => `
                  <tr>
                    <td><strong>${b.patient_name}</strong></td>
                    <td>${b.doctor_name || '—'}</td>
                    <td>${b.description}</td>
                    <td style="color:var(--success);font-weight:700">${ui.formatCurrency(b.amount)}</td>
                    <td>${ui.formatDate(b.created_at)}</td>
                    <td>${ui.badge(b.status)}</td>
                    <td>
                      ${b.status === 'unpaid' ? `<button class="btn btn-sm btn-success" onclick="AdminPages.markPaid('${b.id}')"><i class="fas fa-check"></i> Mark Paid</button>` : `<span style="color:var(--text-dim);font-size:0.8rem;">${ui.formatDate(b.payment_date)}</span>`}
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${ui.empty('fa-file-invoice', 'No bills', 'Create a bill to get started')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    async markPaid(id) {
        try {
            await api.updateBill(id, { status: 'paid', payment_method: 'cash' });
            ui.toast('Bill marked as paid', 'success');
            AdminPages.billing();
        } catch (err) { ui.toast(err.message, 'error'); }
    },

    async createBillModal() {
        const pRes = await api.adminPatients();
        const patients = pRes.data;
        ui.openModal('Create New Bill', `
      <form id="createBillForm">
        <div class="form-group">
          <label>Patient *</label>
          <select class="form-control" id="billPatient" required>
            <option value="">Select Patient</option>
            ${patients.map(p => `<option value="${p.patient_id}">${p.name} (${p.email})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Amount (₹) *</label><input class="form-control" type="number" id="billAmt" min="0" required /></div>
        <div class="form-group"><label>Description</label><input class="form-control" id="billDesc" value="Hospital Services" /></div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="createBillBtn">Create Bill</button>
        </div>
      </form>
    `);
        document.getElementById('createBillForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('createBillBtn');
            ui.setLoading(btn, true);
            try {
                await api.createBill({
                    patient_id: document.getElementById('billPatient').value,
                    amount: +document.getElementById('billAmt').value,
                    description: document.getElementById('billDesc').value,
                });
                ui.closeModal(); ui.toast('Bill created!', 'success'); AdminPages.billing();
            } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
        };
    },

    // ---- PHARMACY ----
    async pharmacy() {
        ui.setBreadcrumb('Pharmacy');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.getMedicines();
            const meds = res.data;
            const lowStock = meds.filter(m => m.quantity < 100);
            page.innerHTML = `
        <div class="page-header">
          <div><h2>Pharmacy Inventory</h2><p>${meds.length} medicines | ${lowStock.length} low stock</p></div>
          <button class="btn btn-primary" onclick="AdminPages.addMedModal()"><i class="fas fa-plus"></i> Add Medicine</button>
        </div>
        <div class="filter-bar">
          <div class="search-input" style="max-width:300px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search medicines..." id="medSearch" oninput="AdminPages.filterMeds()" />
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="medTable">
              <thead><tr><th>Medicine</th><th>Generic Name</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Expiry</th><th>Actions</th></tr></thead>
              <tbody>
                ${meds.length ? meds.map(m => `
                  <tr>
                    <td><strong>${m.name}</strong></td>
                    <td style="color:var(--text-muted)">${m.generic_name || '—'}</td>
                    <td><span class="badge badge-secondary">${m.category || 'General'}</span></td>
                    <td><span class="med-stock ${m.quantity < 100 ? 'low' : 'ok'}">${m.quantity} ${m.unit}s</span></td>
                    <td>${ui.formatCurrency(m.price)}</td>
                    <td>${ui.formatDate(m.expiry_date)}</td>
                    <td>
                      <div style="display:flex;gap:0.4rem;">
                        <button class="btn btn-sm btn-primary" onclick="AdminPages.restockDialog('${m.id}','${m.name}')"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-sm btn-ghost" onclick="AdminPages.editMedModal('${m.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="AdminPages.deleteMed('${m.id}','${m.name}')"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${ui.empty('fa-pills', 'No medicines', 'Add medicines to inventory')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
            window._adminMeds = meds;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterMeds() {
        const q = document.getElementById('medSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#medTable tbody tr');
        rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
    },

    addMedModal() {
        ui.openModal('Add Medicine', `
      <form id="addMedForm">
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input class="form-control" id="mName" required /></div>
          <div class="form-group"><label>Generic Name</label><input class="form-control" id="mGeneric" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><input class="form-control" id="mCat" placeholder="Antibiotic, NSAID..." /></div>
          <div class="form-group"><label>Unit</label>
            <select class="form-control" id="mUnit">
              <option>tablet</option><option>capsule</option><option>syrup</option><option>injection</option><option>cream</option><option>drops</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="mQty" value="0" /></div>
          <div class="form-group"><label>Price (₹)</label><input class="form-control" type="number" id="mPrice" value="0" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Manufacturer</label><input class="form-control" id="mMfr" /></div>
          <div class="form-group"><label>Expiry Date</label><input class="form-control" type="date" id="mExpiry" /></div>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="addMedBtn">Add Medicine</button>
        </div>
      </form>
    `);
        document.getElementById('addMedForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('addMedBtn');
            ui.setLoading(btn, true);
            try {
                await api.addMedicine({
                    name: document.getElementById('mName').value,
                    generic_name: document.getElementById('mGeneric').value,
                    category: document.getElementById('mCat').value,
                    unit: document.getElementById('mUnit').value,
                    quantity: +document.getElementById('mQty').value,
                    price: +document.getElementById('mPrice').value,
                    manufacturer: document.getElementById('mMfr').value,
                    expiry_date: document.getElementById('mExpiry').value,
                });
                ui.closeModal(); ui.toast('Medicine added!', 'success'); AdminPages.pharmacy();
            } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
        };
    },

    editMedModal(id) {
        const m = window._adminMeds?.find(x => x.id === id);
        if (!m) return;
        ui.openModal('Edit Medicine', `
      <form id="editMedForm">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input class="form-control" id="emName" value="${m.name}" /></div>
          <div class="form-group"><label>Generic Name</label><input class="form-control" id="emGeneric" value="${m.generic_name || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><input class="form-control" id="emCat" value="${m.category || ''}" /></div>
          <div class="form-group"><label>Unit</label><input class="form-control" id="emUnit" value="${m.unit || 'tablet'}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="emQty" value="${m.quantity}" /></div>
          <div class="form-group"><label>Price (₹)</label><input class="form-control" type="number" id="emPrice" value="${m.price}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Manufacturer</label><input class="form-control" id="emMfr" value="${m.manufacturer || ''}" /></div>
          <div class="form-group"><label>Expiry Date</label><input class="form-control" type="date" id="emExpiry" value="${m.expiry_date || ''}" /></div>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="editMedBtn">Save</button>
        </div>
      </form>
    `);
        document.getElementById('editMedForm').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('editMedBtn');
            ui.setLoading(btn, true);
            try {
                await api.updateMedicine(id, {
                    name: document.getElementById('emName').value, generic_name: document.getElementById('emGeneric').value,
                    category: document.getElementById('emCat').value, unit: document.getElementById('emUnit').value,
                    quantity: +document.getElementById('emQty').value, price: +document.getElementById('emPrice').value,
                    manufacturer: document.getElementById('emMfr').value, expiry_date: document.getElementById('emExpiry').value,
                });
                ui.closeModal(); ui.toast('Medicine updated!', 'success'); AdminPages.pharmacy();
            } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
        };
    },

    deleteMed(id, name) {
        ui.confirm('Delete Medicine', `Delete "${name}" from inventory?`, async () => {
            try { await api.deleteMedicine(id); ui.toast('Medicine deleted', 'success'); AdminPages.pharmacy(); }
            catch (err) { ui.toast(err.message, 'error'); }
        });
    },
};

window.AdminPages = AdminPages;
