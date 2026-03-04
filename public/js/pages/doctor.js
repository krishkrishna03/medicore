// ===== DOCTOR PAGES =====
const DoctorPages = {

    async dashboard() {
        ui.setBreadcrumb('My Dashboard');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.doctorStats();
            const d = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div>
            <h2>Doctor Dashboard</h2>
            <p>Welcome back, Dr. ${Auth.currentUser.name}! Here's your schedule overview.</p>
          </div>
          <button class="btn btn-primary" onclick="App.navigate('doctor-appointments')">
            <i class="fas fa-calendar"></i> View Schedule
          </button>
        </div>

        <div class="stats-grid">
          ${AdminPages.statCard('fa-users', 'My Patients', d.totalPatients, '#10b981', 'rgba(16,185,129,0.15)')}
          ${AdminPages.statCard('fa-calendar-day', 'Today\'s Appointments', d.todayAppointments, '#3b82f6', 'rgba(59,130,246,0.15)')}
          ${AdminPages.statCard('fa-clock', 'Pending', d.pendingAppointments, '#f59e0b', 'rgba(245,158,11,0.15)')}
          ${AdminPages.statCard('fa-check-circle', 'Completed', d.completedAppointments, '#8b5cf6', 'rgba(139,92,246,0.15)')}
        </div>

        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-calendar-check"></i> Upcoming Appointments</h3>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('doctor-appointments')">All</button>
          </div>
          ${d.upcomingAppointments.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Patient</th><th>Date & Time</th><th>Age/Gender</th><th>Blood</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${d.upcomingAppointments.map(a => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                      <div class="user-ava avatar-patient" style="width:36px;height:36px;font-size:0.8rem;">${ui.initials(a.patient_name)}</div>
                      <div><strong>${a.patient_name}</strong><br><small style="color:var(--text-muted)">${a.symptoms || 'No symptoms noted'}</small></div>
                    </div>
                  </td>
                  <td>${ui.formatDate(a.appointment_date)}<br><small>${ui.formatTime(a.appointment_time)}</small></td>
                  <td>${ui.age(a.date_of_birth)} / ${a.gender || '—'}</td>
                  <td>${a.blood_group ? `<span class="badge badge-danger">${a.blood_group}</span>` : '—'}</td>
                  <td>${ui.badge(a.status)}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="DoctorPages.updateApptModal('${a.id}','${a.patient_name}','${a.status}')">
                      <i class="fas fa-edit"></i> Update
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>` : ui.empty('fa-calendar', 'No upcoming appointments', 'Your schedule is clear')}
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    async appointments() {
        ui.setBreadcrumb('My Appointments');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.doctorAppointments();
            const appts = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>My Appointments</h2><p>${appts.length} total appointments</p></div>
        </div>
        <div class="filter-bar">
          <input type="date" class="form-control" id="apptDateFilter" style="width:auto;" onchange="DoctorPages.filterAppts()" />
          <select class="form-control" style="width:auto;" id="apptStatusFilter" onchange="DoctorPages.filterAppts()">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div id="apptGrid">
          ${appts.length ? appts.map(a => DoctorPages.apptCard(a)).join('') : ui.empty('fa-calendar', 'No appointments yet', 'Patients will appear here when they book')}
        </div>
      `;
            window._doctorAppts = appts;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterAppts() {
        const date = document.getElementById('apptDateFilter')?.value;
        const status = document.getElementById('apptStatusFilter')?.value;
        let filtered = window._doctorAppts || [];
        if (date) filtered = filtered.filter(a => a.appointment_date === date);
        if (status) filtered = filtered.filter(a => a.status === status);
        const grid = document.getElementById('apptGrid');
        if (grid) grid.innerHTML = filtered.length ? filtered.map(a => DoctorPages.apptCard(a)).join('') : ui.empty('fa-calendar', 'No results', 'Try different filters');
    },

    apptCard(a) {
        const [y, m, d] = (a.appointment_date || '').split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `
      <div class="appt-card">
        <div class="appt-date">
          <div class="day">${d || '—'}</div>
          <div class="month">${months[+m - 1] || ''} ${y || ''}</div>
        </div>
        <div class="appt-info">
          <h4>${a.patient_name}</h4>
          <p><i class="fas fa-clock" style="color:var(--primary);margin-right:0.3rem;"></i>${ui.formatTime(a.appointment_time)} &nbsp;|&nbsp; <span class="badge badge-secondary">${a.type}</span></p>
          ${a.symptoms ? `<p style="margin-top:0.35rem;font-size:0.8rem;"><i class="fas fa-notes-medical" style="color:var(--warning);margin-right:0.3rem;"></i>${a.symptoms}</p>` : ''}
          ${a.blood_group ? `<p style="font-size:0.78rem;margin-top:4px;"><span class="badge badge-danger">${a.blood_group}</span> ${a.gender || ''}</p>` : ''}
        </div>
        <div class="appt-actions">
          ${ui.badge(a.status)}
          <button class="btn btn-sm btn-primary" onclick="DoctorPages.updateApptModal('${a.id}','${a.patient_name}','${a.status}','${a.notes || ''}','${a.diagnosis || ''}','${a.prescription || ''}')">
            <i class="fas fa-edit"></i> Manage
          </button>
        </div>
      </div>
    `;
    },

    updateApptModal(id, name, status, notes = '', diagnosis = '', prescription = '') {
        const notesSafe = decodeURIComponent(notes.replace(/'/g, "&#39;"));
        const diagSafe = decodeURIComponent(diagnosis.replace(/'/g, "&#39;"));
        const rxSafe = decodeURIComponent(prescription.replace(/'/g, "&#39;"));
        ui.openModal(`Appointment: ${name}`, `
      <div class="form-group">
        <label>Status</label>
        <select class="form-control" id="apptStatus">
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div class="form-group">
        <label>Diagnosis</label>
        <input class="form-control" id="apptDiag" placeholder="Primary diagnosis..." value="${diagSafe}" />
      </div>
      <div class="form-group">
        <label>Prescription / Notes for Patient</label>
        <textarea class="form-control" id="apptRx" rows="3" placeholder="Medicines, dosage, instructions...">${rxSafe}</textarea>
      </div>
      <div class="form-group">
        <label>Doctor's Notes (Internal)</label>
        <textarea class="form-control" id="apptNotes" rows="2" placeholder="Internal observations...">${notesSafe}</textarea>
      </div>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="updateApptBtn" onclick="DoctorPages.submitUpdateAppt('${id}')">Save Changes</button>
      </div>
    `);
    },

    async submitUpdateAppt(id) {
        const btn = document.getElementById('updateApptBtn');
        ui.setLoading(btn, true);
        try {
            await api.updateAppointment(id, {
                status: document.getElementById('apptStatus').value,
                diagnosis: document.getElementById('apptDiag').value,
                prescription: document.getElementById('apptRx').value,
                notes: document.getElementById('apptNotes').value,
            });
            ui.closeModal(); ui.toast('Appointment updated!', 'success');
            DoctorPages.appointments();
        } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
    },

    async myPatients() {
        ui.setBreadcrumb('My Patients');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.doctorPatients();
            const patients = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div><h2>My Patients</h2><p>${patients.length} unique patients visited</p></div>
        </div>
        <div class="filter-bar">
          <div class="search-input" style="max-width:300px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search patients..." id="myPtSearch" oninput="DoctorPages.filterMyPt()" />
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table id="myPtTable">
              <thead><tr><th>Patient</th><th>Age/Gender</th><th>Blood Group</th><th>Allergies</th><th>Visits</th><th>Last Visit</th><th>Actions</th></tr></thead>
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
                    <td style="font-size:0.82rem;color:var(--warning)">${p.allergies || 'None'}</td>
                    <td><span class="badge badge-primary">${p.visit_count}</span></td>
                    <td>${ui.formatDate(p.last_visit)}</td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="DoctorPages.viewPatient('${p.patient_id}')"><i class="fas fa-eye"></i> View</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${ui.empty('fa-users', 'No patients yet', 'Patients will appear after completed appointments')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterMyPt() {
        const q = document.getElementById('myPtSearch')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#myPtTable tbody tr');
        rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
    },

    async viewPatient(id) {
        try {
            const res = await api.doctorPatient(id);
            const p = res.data;
            ui.openModal(`Patient: ${p.name}`, `
        <div class="grid-2" style="gap:1rem;margin-bottom:1.5rem;">
          <div><div class="data-label">Name</div><div class="data-value">${p.name}</div></div>
          <div><div class="data-label">Email</div><div class="data-value">${p.email}</div></div>
          <div><div class="data-label">Phone</div><div class="data-value">${p.phone || '—'}</div></div>
          <div><div class="data-label">Age / Gender</div><div class="data-value">${ui.age(p.date_of_birth)} / ${p.gender || '—'}</div></div>
          <div><div class="data-label">Blood Group</div><div class="data-value">${p.blood_group ? `<span class="badge badge-danger">${p.blood_group}</span>` : '—'}</div></div>
          <div><div class="data-label">Allergies</div><div class="data-value" style="color:var(--warning)">${p.allergies || 'None'}</div></div>
          <div class="col-span-2"><div class="data-label">Medical History</div><div class="data-value">${p.medical_history || 'None documented'}</div></div>
        </div>
        <h4 style="margin-bottom:0.75rem;font-size:0.9rem;color:var(--text-muted);">APPOINTMENT HISTORY</h4>
        ${p.appointments?.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Status</th><th>Diagnosis</th><th>Prescription</th></tr></thead>
          <tbody>${p.appointments.map(a => `
            <tr>
              <td>${ui.formatDate(a.appointment_date)} ${ui.formatTime(a.appointment_time)}</td>
              <td>${ui.badge(a.status)}</td>
              <td style="font-size:0.82rem;">${a.diagnosis || '—'}</td>
              <td style="font-size:0.82rem;">${a.prescription || '—'}</td>
            </tr>
          `).join('')}</tbody></table></div>` : '<p style="color:var(--text-muted);font-size:0.85rem;">No history</p>'}
      `, 'modal-lg');
        } catch (err) { ui.toast(err.message, 'error'); }
    },

    async profile() {
        ui.setBreadcrumb('My Profile');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.doctorProfile();
            const d = res.data;
            page.innerHTML = `
        <div class="page-header"><div><h2>My Profile</h2><p>Manage your account and availability</p></div></div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-user-md"></i> Doctor Information</h3></div>
            <div class="card-body">
              <div style="text-align:center;margin-bottom:1.5rem;">
                <div class="user-ava avatar-doctor" style="width:80px;height:80px;font-size:1.6rem;margin:0 auto 0.75rem;">${ui.initials(d.name)}</div>
                <h3>${d.name}</h3>
                <p style="color:var(--primary)">${d.specialization}</p>
              </div>
              <div style="display:grid;gap:0.75rem;">
                <div><div class="data-label">Email</div><div class="data-value">${d.email}</div></div>
                <div><div class="data-label">Department</div><div class="data-value">${d.department || '—'}</div></div>
                <div><div class="data-label">Qualification</div><div class="data-value">${d.qualification || '—'}</div></div>
                <div><div class="data-label">Experience</div><div class="data-value">${d.experience_years} years</div></div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-edit"></i> Update Profile</h3></div>
            <div class="card-body">
              <form id="docProfileForm">
                <div class="form-group"><label>Phone</label><input class="form-control" id="dpPhone" value="${d.phone || ''}" /></div>
                <div class="form-group"><label>Consultation Fee (₹)</label><input class="form-control" type="number" id="dpFee" value="${d.consultation_fee}" /></div>
                <div class="form-group"><label>Available Days</label><input class="form-control" id="dpDays" value="${d.available_days || 'Mon,Tue,Wed,Thu,Fri'}" /></div>
                <div class="form-row">
                  <div class="form-group"><label>From</label><input class="form-control" type="time" id="dpStart" value="${d.available_time_start}" /></div>
                  <div class="form-group"><label>To</label><input class="form-control" type="time" id="dpEnd" value="${d.available_time_end}" /></div>
                </div>
                <div class="form-group"><label>Bio</label><textarea class="form-control" id="dpBio" rows="3">${d.bio || ''}</textarea></div>
                <button type="submit" class="btn btn-primary" id="dpSaveBtn"><i class="fas fa-save"></i> Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      `;
            document.getElementById('docProfileForm').onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('dpSaveBtn');
                ui.setLoading(btn, true);
                try {
                    await api.updateDoctorProfile({
                        phone: document.getElementById('dpPhone').value,
                        consultation_fee: +document.getElementById('dpFee').value,
                        available_days: document.getElementById('dpDays').value,
                        available_time_start: document.getElementById('dpStart').value,
                        available_time_end: document.getElementById('dpEnd').value,
                        bio: document.getElementById('dpBio').value,
                    });
                    ui.toast('Profile updated!', 'success');
                } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
            };
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },
};

window.DoctorPages = DoctorPages;
