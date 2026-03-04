// ===== PATIENT PAGES =====
const PatientPages = {

    async dashboard() {
        ui.setBreadcrumb('My Health Dashboard');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.patientStats();
            const d = res.data;
            page.innerHTML = `
        <div class="page-header">
          <div>
            <h2>Welcome, ${Auth.currentUser.name}! 👋</h2>
            <p>Manage your health appointments and records.</p>
          </div>
          <button class="btn btn-primary btn-lg" onclick="App.navigate('book-appointment')">
            <i class="fas fa-calendar-plus"></i> Book Appointment
          </button>
        </div>

        <div class="stats-grid">
          ${AdminPages.statCard('fa-calendar', 'Total Appointments', d.totalAppointments, '#3b82f6', 'rgba(59,130,246,0.15)')}
          ${AdminPages.statCard('fa-calendar-check', 'Upcoming', d.upcomingAppointments, '#10b981', 'rgba(16,185,129,0.15)')}
          ${AdminPages.statCard('fa-check-double', 'Completed Visits', d.completedAppointments, '#8b5cf6', 'rgba(139,92,246,0.15)')}
          ${AdminPages.statCard('fa-file-invoice-dollar', 'Pending Bills', ui.formatCurrency(d.pendingBillAmount), '#ef4444', 'rgba(239,68,68,0.15)')}
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-history"></i> Recent Appointments</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('my-appointments')">View All</button>
            </div>
            <div class="card-body">
              ${d.recentAppointments.length ? d.recentAppointments.map(a => `
                <div style="display:flex;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                  <div style="min-width:50px;text-align:center;">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--primary);line-height:1;">${a.appointment_date?.split('-')[2] || '—'}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);">${a.appointment_date?.split('-')[1] ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+a.appointment_date.split('-')[1] - 1] : ''}</div>
                  </div>
                  <div style="flex:1">
                    <div style="font-weight:600;font-size:0.9rem;">Dr. ${a.doctor_name}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${a.specialization} | ${ui.formatTime(a.appointment_time)}</div>
                  </div>
                  ${ui.badge(a.status)}
                </div>
              `).join('') : `<p style="color:var(--text-muted);text-align:center;padding:2rem 0;">No appointments yet</p>`}
              <div style="margin-top:1rem;">
                <button class="btn btn-primary btn-block" onclick="App.navigate('book-appointment')">
                  <i class="fas fa-plus"></i> Book New Appointment
                </button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-file-invoice-dollar"></i> Pending Bills</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('my-bills')">All Bills</button>
            </div>
            <div class="card-body">
              ${d.pendingBillAmount > 0 ?
                    `<div style="text-align:center;padding:1.5rem 0;">
                  <div style="font-size:2.5rem;font-weight:800;color:var(--danger);">${ui.formatCurrency(d.pendingBillAmount)}</div>
                  <div style="color:var(--text-muted);font-size:0.9rem;margin:0.5rem 0 1.5rem;">Outstanding balance</div>
                  <button class="btn btn-danger" onclick="App.navigate('my-bills')"><i class="fas fa-credit-card"></i> Pay Now</button>
                </div>` :
                    `<div style="text-align:center;padding:2rem 0;">
                  <i class="fas fa-check-circle" style="font-size:2.5rem;color:var(--success);margin-bottom:0.75rem;"></i>
                  <p style="color:var(--text-muted);">No pending bills! You're all clear ✓</p>
                </div>`
                }
            </div>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    async bookAppointment() {
        ui.setBreadcrumb('Book Appointment');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.getAvailableDoctors();
            const doctors = res.data;
            const specializations = [...new Set(doctors.map(d => d.specialization))].sort();

            page.innerHTML = `
        <div class="page-header">
          <div><h2>Book an Appointment</h2><p>Choose a doctor and schedule your visit</p></div>
        </div>

        <div class="filter-bar">
          <div class="search-input" style="max-width:280px;">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search doctors..." id="bookSearch" oninput="PatientPages.filterBookDoctors()" />
          </div>
          <select class="form-control" style="width:auto;" id="bookSpecFilter" onchange="PatientPages.filterBookDoctors()">
            <option value="">All Specializations</option>
            ${specializations.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>

        <div class="doctor-grid" id="bookDoctorGrid">
          ${doctors.map(d => PatientPages.doctorBookCard(d)).join('')}
        </div>

        ${doctors.length === 0 ? ui.empty('fa-user-md', 'No doctors available', 'Please check back later') : ''}
      `;
            window._bookDoctors = doctors;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    filterBookDoctors() {
        const q = (document.getElementById('bookSearch')?.value || '').toLowerCase();
        const spec = document.getElementById('bookSpecFilter')?.value || '';
        const filtered = (window._bookDoctors || []).filter(d => {
            const matchQ = !q || d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q) || (d.department || '').toLowerCase().includes(q);
            const matchS = !spec || d.specialization === spec;
            return matchQ && matchS;
        });
        const grid = document.getElementById('bookDoctorGrid');
        if (grid) grid.innerHTML = filtered.map(d => PatientPages.doctorBookCard(d)).join('') ||
            ui.empty('fa-user-md', 'No doctors found', 'Try a different search');
    },

    doctorBookCard(d) {
        return `
      <div class="doctor-card">
        <div class="doctor-card-top">
          <div class="doctor-avatar">${ui.initials(d.name)}</div>
          <h4>${d.name}</h4>
          <p>${d.specialization}</p>
          ${d.qualification ? `<p style="font-size:0.78rem;margin-top:4px;">${d.qualification}</p>` : ''}
        </div>
        <div class="doctor-card-body">
          ${d.department ? `<div class="doctor-info-row"><i class="fas fa-hospital"></i>${d.department}</div>` : ''}
          <div class="doctor-info-row"><i class="fas fa-briefcase"></i>${d.experience_years} years experience</div>
          <div class="doctor-info-row"><i class="fas fa-clock"></i>${d.available_days || 'Mon-Fri'} | ${ui.formatTime(d.available_time_start)} - ${ui.formatTime(d.available_time_end)}</div>
          ${d.bio ? `<div class="doctor-info-row" style="font-size:0.78rem;margin-top:0.25rem;">${d.bio.slice(0, 80)}${d.bio.length > 80 ? '...' : ''}</div>` : ''}
          <div class="doctor-fee">
            <span>Consultation Fee</span>
            <strong>${ui.formatCurrency(d.consultation_fee)}</strong>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:0.75rem;" onclick="PatientPages.openBookingModal('${d.doctor_id}','${d.name}','${d.specialization}')">
            <i class="fas fa-calendar-plus"></i> Book Now
          </button>
        </div>
      </div>
    `;
    },

    openBookingModal(doctorId, name, specialization) {
        const today = new Date().toISOString().split('T')[0];
        ui.openModal(`Book Appointment — ${name}`, `
      <div style="background:rgba(59,130,246,0.08);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1.25rem;">
        <div style="font-weight:700;">${name}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);">${specialization}</div>
      </div>
      <div class="form-group">
        <label>Select Date *</label>
        <input class="form-control" type="date" id="bookDate" min="${today}" onchange="PatientPages.loadSlots('${doctorId}')" />
      </div>
      <div class="form-group">
        <label>Appointment Type</label>
        <select class="form-control" id="bookType">
          <option value="consultation">Consultation</option>
          <option value="follow-up">Follow-up</option>
          <option value="emergency">Emergency</option>
          <option value="checkup">Regular Checkup</option>
        </select>
      </div>
      <div class="form-group">
        <label>Symptoms / Reason for Visit</label>
        <textarea class="form-control" id="bookSymptoms" rows="2" placeholder="Briefly describe your symptoms..."></textarea>
      </div>
      <div class="form-group">
        <label>Available Time Slots</label>
        <div id="slotsContainer" style="color:var(--text-muted);font-size:0.85rem;">Please select a date first</div>
      </div>
      <input type="hidden" id="selectedSlot" />
      <div id="bookError" style="color:var(--danger);font-size:0.85rem;margin-bottom:0.5rem;"></div>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="confirmBookBtn" onclick="PatientPages.confirmBooking('${doctorId}')">
          <i class="fas fa-check"></i> Confirm Booking
        </button>
      </div>
    `);
    },

    async loadSlots(doctorId) {
        const date = document.getElementById('bookDate')?.value;
        const container = document.getElementById('slotsContainer');
        if (!date || !container) return;
        container.innerHTML = '<div class="loader" style="padding:1rem;"><div class="spinner"></div></div>';
        document.getElementById('selectedSlot').value = '';
        try {
            const res = await api.getSlots(doctorId, date);
            const slots = res.data;
            if (!slots.length) {
                container.innerHTML = '<p>Doctor is not available on this day.</p>';
                return;
            }
            container.innerHTML = `<div class="slots-grid">
        ${slots.map(s => `
          <button class="slot-btn ${!s.available ? 'booked' : ''}" 
            ${!s.available ? 'disabled' : ''} 
            onclick="PatientPages.selectSlot(this,'${s.time}')">
            ${ui.formatTime(s.time)}
          </button>
        `).join('')}
      </div>`;
        } catch (err) { container.innerHTML = `<p style="color:var(--danger)">Failed to load slots</p>`; }
    },

    selectSlot(btn, time) {
        document.querySelectorAll('.slot-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('selectedSlot').value = time;
    },

    async confirmBooking(doctorId) {
        const btn = document.getElementById('confirmBookBtn');
        const errEl = document.getElementById('bookError');
        errEl.textContent = '';
        const date = document.getElementById('bookDate')?.value;
        const time = document.getElementById('selectedSlot')?.value;
        if (!date) { errEl.textContent = 'Please select a date'; return; }
        if (!time) { errEl.textContent = 'Please select a time slot'; return; }
        ui.setLoading(btn, true);
        try {
            await api.bookAppointment({
                doctor_id: doctorId,
                appointment_date: date,
                appointment_time: time,
                type: document.getElementById('bookType').value,
                symptoms: document.getElementById('bookSymptoms').value,
            });
            ui.closeModal();
            ui.toast('Appointment booked successfully! 🎉', 'success');
            App.navigate('my-appointments');
        } catch (err) { errEl.textContent = err.message; } finally { ui.setLoading(btn, false); }
    },

    async myAppointments() {
        ui.setBreadcrumb('My Appointments');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.patientAppointments();
            const appts = res.data;
            const upcoming = appts.filter(a => new Date(a.appointment_date) >= new Date() && a.status !== 'cancelled');
            const past = appts.filter(a => new Date(a.appointment_date) < new Date() || a.status === 'completed' || a.status === 'cancelled');

            page.innerHTML = `
        <div class="page-header">
          <div><h2>My Appointments</h2><p>${appts.length} total appointments</p></div>
          <button class="btn btn-primary" onclick="App.navigate('book-appointment')">
            <i class="fas fa-plus"></i> Book New
          </button>
        </div>

        <div class="tab-nav" id="apptTabs">
          <button class="tab-btn active" onclick="PatientPages.switchApptTab('upcoming',this)">Upcoming (${upcoming.length})</button>
          <button class="tab-btn" onclick="PatientPages.switchApptTab('past',this)">Past (${past.length})</button>
        </div>

        <div id="upcomingAppts">
          ${upcoming.length ? upcoming.map(a => PatientPages.apptCard(a, true)).join('') : ui.empty('fa-calendar', 'No upcoming appointments', 'Book an appointment to see your doctor')}
        </div>
        <div id="pastAppts" class="hidden">
          ${past.length ? past.map(a => PatientPages.apptCard(a, false)).join('') : ui.empty('fa-history', 'No past appointments', '')}
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    switchApptTab(tab, btn) {
        document.querySelectorAll('#apptTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('upcomingAppts').classList.toggle('hidden', tab !== 'upcoming');
        document.getElementById('pastAppts').classList.toggle('hidden', tab !== 'past');
    },

    apptCard(a, showCancel) {
        const parts = (a.appointment_date || '').split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `
      <div class="appt-card">
        <div class="appt-date">
          <div class="day">${parts[2] || '—'}</div>
          <div class="month">${months[+parts[1] - 1] || ''}<br>${parts[0] || ''}</div>
        </div>
        <div class="appt-info">
          <h4>Dr. ${a.doctor_name}</h4>
          <p style="color:var(--primary-light);font-size:0.82rem;">${a.specialization}</p>
          <p><i class="fas fa-clock" style="color:var(--text-muted);margin-right:4px;"></i>${ui.formatTime(a.appointment_time)} &nbsp;|&nbsp; <span class="badge badge-secondary">${a.type}</span></p>
          ${a.department ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;"><i class="fas fa-hospital" style="margin-right:4px;"></i>${a.department}</p>` : ''}
          ${a.diagnosis ? `<p style="margin-top:0.5rem;font-size:0.82rem;"><strong style="color:var(--text-muted);">Diagnosis:</strong> ${a.diagnosis}</p>` : ''}
          ${a.prescription ? `<p style="margin-top:0.25rem;font-size:0.82rem;"><strong style="color:var(--text-muted);">Prescription:</strong> ${a.prescription}</p>` : ''}
        </div>
        <div class="appt-actions">
          ${ui.badge(a.status)}
          <div style="font-size:0.78rem;color:var(--text-muted);">${ui.formatCurrency(a.consultation_fee)}</div>
          ${showCancel && a.status === 'pending' ? `<button class="btn btn-sm btn-danger" onclick="PatientPages.cancelAppt('${a.id}')"><i class="fas fa-times"></i> Cancel</button>` : ''}
        </div>
      </div>
    `;
    },

    cancelAppt(id) {
        ui.confirm('Cancel Appointment', 'Are you sure you want to cancel this appointment?', async () => {
            try {
                await api.cancelAppointment(id);
                ui.toast('Appointment cancelled', 'success');
                PatientPages.myAppointments();
            } catch (err) { ui.toast(err.message, 'error'); }
        });
    },

    async myBills() {
        ui.setBreadcrumb('My Bills');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.patientBills();
            const bills = res.data;
            const unpaid = bills.filter(b => b.status === 'unpaid');
            const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);

            page.innerHTML = `
        <div class="page-header">
          <div><h2>My Bills</h2><p>${bills.length} total bills</p></div>
        </div>
        ${totalUnpaid > 0 ? `
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <div>
              <div style="font-weight:700;color:var(--danger);">⚠ Outstanding Balance: ${ui.formatCurrency(totalUnpaid)}</div>
              <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${unpaid.length} unpaid bill(s)</div>
            </div>
          </div>
        ` : ''}
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Doctor</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                ${bills.length ? bills.map(b => `
                  <tr>
                    <td>${b.description}</td>
                    <td>${b.doctor_name || '—'}</td>
                    <td>${ui.formatDate(b.created_at)}</td>
                    <td style="font-weight:700;color:var(--success)">${ui.formatCurrency(b.amount)}</td>
                    <td>${ui.badge(b.status)}</td>
                    <td>
                      ${b.status === 'unpaid' ? `<button class="btn btn-sm btn-success" onclick="PatientPages.payBill('${b.id}')">
                        <i class="fas fa-credit-card"></i> Pay Now
                      </button>` : `<span style="font-size:0.8rem;color:var(--text-muted);">${b.payment_method || '—'} | ${ui.formatDate(b.payment_date)}</span>`}
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="6">${ui.empty('fa-file-invoice', 'No bills found', '')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },

    payBill(id) {
        ui.openModal('Pay Bill', `
      <p style="color:var(--text-muted);margin-bottom:1.25rem;">Select your payment method to proceed:</p>
      <div style="display:grid;gap:0.75rem;margin-bottom:1.5rem;">
        ${[['credit-card', 'Credit / Debit Card', 'fa-credit-card', '#3b82f6'],
            ['upi', 'UPI / Net Banking', 'fa-mobile-alt', '#10b981'],
            ['cash', 'Cash at Counter', 'fa-money-bill-wave', '#f59e0b']].map(([val, label, icon, color]) => `
          <label style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:var(--transition);"
                 onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--border)'" >
            <input type="radio" name="payMethod" value="${val}" style="accent-color:${color};" />
            <i class="fas ${icon}" style="color:${color};width:20px;"></i>
            <span style="font-weight:500;">${label}</span>
          </label>
        `).join('')}
      </div>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="ui.closeModal()">Cancel</button>
        <button class="btn btn-success" id="payNowBtn" onclick="PatientPages.confirmPay('${id}')">
          <i class="fas fa-lock"></i> Confirm Payment
        </button>
      </div>
    `);
    },

    async confirmPay(id) {
        const btn = document.getElementById('payNowBtn');
        const method = document.querySelector('input[name="payMethod"]:checked')?.value;
        if (!method) { ui.toast('Please select a payment method', 'warning'); return; }
        ui.setLoading(btn, true);
        try {
            await api.payBill(id, { payment_method: method });
            ui.closeModal(); ui.toast('Payment successful! 🎉', 'success');
            PatientPages.myBills();
        } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
    },

    async profile() {
        ui.setBreadcrumb('My Profile');
        const page = document.getElementById('pageContent');
        page.innerHTML = ui.loader();
        try {
            const res = await api.patientProfile();
            const p = res.data;
            page.innerHTML = `
        <div class="page-header"><div><h2>My Profile</h2><p>Update your personal and medical information</p></div></div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-user"></i> Profile Summary</h3></div>
            <div class="card-body" style="text-align:center;">
              <div class="user-ava avatar-patient" style="width:80px;height:80px;font-size:1.6rem;margin:0 auto 0.75rem;">${ui.initials(p.name)}</div>
              <h3>${p.name}</h3>
              <p style="color:var(--text-muted);font-size:0.88rem;margin-top:4px;">${p.email}</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:1.5rem;text-align:left;">
                <div><div class="data-label">Age</div><div class="data-value">${ui.age(p.date_of_birth)}</div></div>
                <div><div class="data-label">Gender</div><div class="data-value">${p.gender || '—'}</div></div>
                <div><div class="data-label">Blood Group</div><div class="data-value">${p.blood_group ? `<span class="badge badge-danger">${p.blood_group}</span>` : '—'}</div></div>
                <div><div class="data-label">Phone</div><div class="data-value">${p.phone || '—'}</div></div>
              </div>
              ${p.allergies ? `<div style="margin-top:1rem;padding:0.75rem;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-sm);">
                <div style="font-size:0.78rem;font-weight:700;color:var(--warning);margin-bottom:4px;">⚠ ALLERGIES</div>
                <div style="font-size:0.85rem;">${p.allergies}</div>
              </div>` : ''}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-edit"></i> Edit Profile</h3></div>
            <div class="card-body">
              <form id="ptProfileForm">
                <div class="form-row">
                  <div class="form-group"><label>Full Name</label><input class="form-control" id="ppName" value="${p.name}" /></div>
                  <div class="form-group"><label>Phone</label><input class="form-control" id="ppPhone" value="${p.phone || ''}" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Date of Birth</label><input class="form-control" type="date" id="ppDob" value="${p.date_of_birth || ''}" /></div>
                  <div class="form-group"><label>Gender</label>
                    <select class="form-control" id="ppGender">
                      <option ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                      <option ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                      <option ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Blood Group</label>
                    <select class="form-control" id="ppBlood">
                      <option value="">Select</option>
                      ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => `<option ${p.blood_group === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label>Address</label><input class="form-control" id="ppAddr" value="${p.address || ''}" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Emergency Contact</label><input class="form-control" id="ppEmgContact" value="${p.emergency_contact || ''}" /></div>
                  <div class="form-group"><label>Emergency Phone</label><input class="form-control" id="ppEmgPhone" value="${p.emergency_phone || ''}" /></div>
                </div>
                <div class="form-group"><label>Allergies</label><textarea class="form-control" id="ppAllergies" rows="2" placeholder="List any allergies...">${p.allergies || ''}</textarea></div>
                <div class="form-group"><label>Medical History</label><textarea class="form-control" id="ppHistory" rows="2" placeholder="Past conditions, surgeries...">${p.medical_history || ''}</textarea></div>
                <button type="submit" class="btn btn-primary" id="ppSaveBtn"><i class="fas fa-save"></i> Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      `;
            document.getElementById('ptProfileForm').onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('ppSaveBtn');
                ui.setLoading(btn, true);
                try {
                    await api.updatePatientProfile({
                        name: document.getElementById('ppName').value,
                        phone: document.getElementById('ppPhone').value,
                        date_of_birth: document.getElementById('ppDob').value,
                        gender: document.getElementById('ppGender').value,
                        blood_group: document.getElementById('ppBlood').value,
                        address: document.getElementById('ppAddr').value,
                        emergency_contact: document.getElementById('ppEmgContact').value,
                        emergency_phone: document.getElementById('ppEmgPhone').value,
                        allergies: document.getElementById('ppAllergies').value,
                        medical_history: document.getElementById('ppHistory').value,
                    });
                    ui.toast('Profile updated!', 'success');
                    PatientPages.profile();
                } catch (err) { ui.toast(err.message, 'error'); } finally { ui.setLoading(btn, false); }
            };
        } catch (err) { page.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`; }
    },
};

window.PatientPages = PatientPages;
