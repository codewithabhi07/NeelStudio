// Storage and Global State
let estimates = JSON.parse(localStorage.getItem('estimates')) || [];
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let calendarEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
let portfolioImages = JSON.parse(localStorage.getItem('portfolioImages')) || [];
let packages = JSON.parse(localStorage.getItem('packages')) || [
    { name: 'Standard Wedding', price: 45000 },
    { name: 'Premium Wedding', price: 75000 },
    { name: 'Maternity Pro', price: 25000 },
    { name: 'Baby Shoot', price: 15000 }
];
let studioSettings = JSON.parse(localStorage.getItem('studioSettings')) || { 
    studioName: 'Neel Studio',
    studioPhone: '+91 9876543210',
    studioAddress: 'Your Studio Address Here',
    defaultTerms: '1. 30% advance is non-refundable.\n2. Final payment due on the day of the event.\n3. Deliverables within 4-6 weeks.'
};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedPackage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateDashboard();
    renderHistory();
    renderPackages();
    renderCalendar();
    renderClients();
    renderPortfolioGrid();
    renderExpenses();
    document.getElementById('todayDate').innerText = new Date().toDateString();
    initFinancialChart();
});

// Navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(item => {
        if (item.getAttribute('onclick').includes(tabId)) item.classList.add('active');
    });

    if (window.innerWidth <= 900) toggleSidebar(false); 

    if (tabId === 'dashboard') { updateDashboard(); initFinancialChart(); }
    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'history') renderHistory();
    if (tabId === 'clients') renderClients();
    if (tabId === 'settings') { renderSettingsPackages(); renderPortfolioGrid(); }
}

function toggleSidebar(force) {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    if (force === false) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    } else {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
    }
}

// Portfolio Management
function uploadPortfolio(input) {
    const files = Array.from(input.files);
    if (portfolioImages.length + files.length > 15) return alert("Maximum 15 photos allowed in portfolio.");

    files.forEach(file => {
        if (file.size > 500000) return alert(`File ${file.name} is too large (Max 500KB).`);
        const reader = new FileReader();
        reader.onload = (e) => {
            portfolioImages.push(e.target.result);
            localStorage.setItem('portfolioImages', JSON.stringify(portfolioImages));
            renderPortfolioGrid();
        };
        reader.readAsDataURL(file);
    });
}

function renderPortfolioGrid() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.innerHTML = portfolioImages.map((img, idx) => `
        <div style="position:relative; aspect-ratio:1;">
            <img src="${img}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
            <button style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;" onclick="deletePortfolio(${idx})">×</button>
        </div>
    `).join('');
}

function deletePortfolio(idx) {
    portfolioImages.splice(idx, 1);
    localStorage.setItem('portfolioImages', JSON.stringify(portfolioImages));
    renderPortfolioGrid();
}

// Stats & Charts
function initFinancialChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.revenueChartInstance) window.revenueChartInstance.destroy();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenueData = [45000, 52000, 38000, 65000, 48000, 72000];
    const expenseData = [12000, 15000, 10000, 18000, 14000, 20000];

    window.revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Revenue', data: revenueData, backgroundColor: '#00BCD4', borderRadius: 5 },
                { label: 'Expenses', data: expenseData, backgroundColor: '#E91E63', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#B0A8D1' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#B0A8D1' } },
                x: { grid: { display: false }, ticks: { color: '#B0A8D1' } }
            }
        }
    });
}

function updateDashboard() {
    const totalRev = estimates.reduce((sum, e) => sum + e.total, 0);
    const totalPend = estimates.reduce((sum, e) => sum + e.balance, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);

    document.getElementById('stat-bookings').innerText = estimates.length + calendarEvents.length;
    document.getElementById('stat-revenue').innerText = `₹${totalRev.toLocaleString('en-IN')}`;
    document.getElementById('stat-profit').innerText = `₹${(totalRev - totalExp).toLocaleString('en-IN')}`;
    document.getElementById('stat-pending').innerText = `₹${totalPend.toLocaleString('en-IN')}`;

    renderDashboardUpcoming();
    renderExpenses();
}

function renderDashboardUpcoming() {
    const list = document.getElementById('dashboard-upcoming-list');
    const allItems = [
        ...estimates.map(e => ({ ...e, type: 'estimate' })),
        ...calendarEvents.map(e => ({ ...e, type: 'event' }))
    ].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    list.innerHTML = allItems.slice(0, 5).map(e => `
        <div class="upcoming-item" style="border-left-color: ${e.type === 'event' ? 'var(--secondary-cyan)' : 'var(--primary-pink)'}">
            <div>
                <strong>${e.clientName || e.title}</strong>
                <br><small>${e.category || e.session || ''} | ${e.eventDate || 'TBD'} ${e.location ? '| ' + e.location : ''}</small>
            </div>
            <div style="text-align:right">
                ${e.type === 'estimate' ? `<span style="color:var(--primary-pink); font-weight:700">₹${e.balance.toLocaleString('en-IN')}</span><br>` : '<span style="color:var(--secondary-cyan); font-weight:700">Event</span><br>'}
                ${e.phone ? `<button class="btn-wa" onclick="sendWhatsApp('${e.phone}', ${e.balance || 0}, '${e.clientName}')"><i class="fab fa-whatsapp"></i></button>` : ''}
            </div>
        </div>
    `).join('') || '<p style="color:var(--text-muted)">No upcoming events.</p>';
}

// Expense Management
function addExpense() {
    const desc = document.getElementById('exp-desc').value;
    const amt = parseFloat(document.getElementById('exp-amount').value);
    if (desc && amt) {
        expenses.push({ description: desc, amount: amt, date: new Date().toISOString(), id: Date.now() });
        localStorage.setItem('expenses', JSON.stringify(expenses));
        document.getElementById('exp-desc').value = '';
        document.getElementById('exp-amount').value = '';
        updateDashboard();
    }
}

function renderExpenses() {
    const list = document.getElementById('mini-expense-list');
    if (!list) return;
    list.innerHTML = expenses.slice(-5).reverse().map(ex => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:10px 15px; border-radius:10px; margin-bottom:8px; border:1px solid var(--glass);">
            <div><p style="margin:0; font-weight:600;">${ex.description}</p><small style="color:var(--text-muted)">₹${ex.amount.toLocaleString('en-IN')}</small></div>
            <button style="background:none; border:none; color:#ff4444; cursor:pointer;" onclick="deleteExpense(${ex.id})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') || '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center;">No recent expenses.</p>';
}

function deleteExpense(id) {
    if (confirm("Delete this expense?")) {
        expenses = expenses.filter(ex => ex.id !== id);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        updateDashboard();
    }
}

// Package Management
function renderPackages() {
    const container = document.getElementById('package-chips');
    if (!container) return;
    container.innerHTML = packages.map(pkg => `
        <div class="package-chip" style="padding:10px 20px; background:var(--glass); border-radius:30px; cursor:pointer; border:1px solid var(--glass);" 
             onclick="selectPackage(this, '${pkg.name}', ${pkg.price})">
            ${pkg.name} (₹${pkg.price.toLocaleString('en-IN')})
        </div>
    `).join('');
}

function renderSettingsPackages() {
    const list = document.getElementById('settings-package-list');
    if (!list) return;
    list.innerHTML = packages.map((pkg, idx) => `
        <div class="upcoming-item" style="padding: 15px; border-left: none; background: rgba(0,0,0,0.2);">
            <div><strong>${pkg.name}</strong><br><small>₹${pkg.price.toLocaleString('en-IN')}</small></div>
            <button style="background:none; border:none; color:#ff4444; cursor:pointer;" onclick="deletePackage(${idx})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function addPackage() {
    const name = document.getElementById('newPkgName').value;
    const price = parseFloat(document.getElementById('newPkgPrice').value);
    if (name && price) {
        packages.push({ name, price });
        localStorage.setItem('packages', JSON.stringify(packages));
        document.getElementById('newPkgName').value = '';
        document.getElementById('newPkgPrice').value = '';
        renderSettingsPackages();
        renderPackages();
    }
}

function deletePackage(idx) {
    if (confirm("Delete this package?")) {
        packages.splice(idx, 1);
        localStorage.setItem('packages', JSON.stringify(packages));
        renderSettingsPackages();
        renderPackages();
    }
}

function selectPackage(el, name, price) {
    selectedPackage = { name, price };
    document.querySelectorAll('.package-chip').forEach(c => {
        c.style.background = 'var(--glass)';
        c.style.borderColor = 'var(--glass)';
    });
    el.style.background = 'var(--aurora-gradient)';
    el.style.borderColor = 'var(--primary-pink)';
    updateTotal();
}

function updateTotal() {
    let base = selectedPackage ? selectedPackage.price : 0;
    let addonsTotal = 0;
    document.querySelectorAll('.addon-check:checked').forEach(cb => addonsTotal += parseFloat(cb.value));
    
    const travel = parseFloat(document.getElementById('travelCharge').value || 0);
    const other = parseFloat(document.getElementById('otherCharge').value || 0);
    const disc = parseFloat(document.getElementById('discountInput').value || 0);
    const adv = parseFloat(document.getElementById('advanceInput').value || 0);
    
    const finalTotal = (base + addonsTotal + travel + other) - disc;
    const balance = finalTotal - adv;
    
    document.getElementById('totalDisplay').innerText = `₹${finalTotal.toLocaleString('en-IN')}`;
    document.getElementById('balanceDisplay').innerText = `₹${balance.toLocaleString('en-IN')}`;
}

// Modal & Preview
function showPreview() {
    const name = document.getElementById('clientName').value;
    if (!name || !selectedPackage) return alert("Enter client name and select a package!");
    
    document.getElementById('printClientName').innerText = name;
    document.getElementById('printClientPhone').innerText = document.getElementById('clientPhone').value;
    document.getElementById('printEvent').innerText = `${document.getElementById('eventCategory').value} on ${document.getElementById('eventDate').value} (${document.getElementById('eventSession').value})`;
    document.getElementById('printDate').innerText = new Date().toLocaleDateString();
    document.getElementById('printStudioName').innerText = studioSettings.studioName;

    let itemsHtml = `<tr><td style="padding:10px;">${selectedPackage.name}</td><td style="padding:10px; text-align:right;">₹${selectedPackage.price.toLocaleString('en-IN')}</td></tr>`;
    
    const travel = parseFloat(document.getElementById('travelCharge').value || 0);
    if (travel > 0) itemsHtml += `<tr><td style="padding:10px;">Travel / Conveyance</td><td style="padding:10px; text-align:right;">₹${travel.toLocaleString('en-IN')}</td></tr>`;
    
    const other = parseFloat(document.getElementById('otherCharge').value || 0);
    if (other > 0) itemsHtml += `<tr><td style="padding:10px;">Other Expenses</td><td style="padding:10px; text-align:right;">₹${other.toLocaleString('en-IN')}</td></tr>`;

    document.querySelectorAll('.addon-check:checked').forEach(cb => {
        itemsHtml += `<tr><td style="padding:10px;">${cb.getAttribute('data-name')}</td><td style="padding:10px; text-align:right;">₹${parseFloat(cb.value).toLocaleString('en-IN')}</td></tr>`;
    });
    
    document.getElementById('printItemsList').innerHTML = itemsHtml;
    document.getElementById('printTotal').innerText = document.getElementById('totalDisplay').innerText;
    document.getElementById('printAdvance').innerText = `₹${parseFloat(document.getElementById('advanceInput').value || 0).toLocaleString('en-IN')}`;
    document.getElementById('printBalance').innerText = document.getElementById('balanceDisplay').innerText;
    
    // Render Portfolio Gallery in Preview
    const printGrid = document.getElementById('printPortfolioGrid');
    printGrid.innerHTML = portfolioImages.map(img => `
        <img src="${img}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:5px;">
    `).join('');
    document.getElementById('printPortfolio').style.display = portfolioImages.length > 0 ? 'block' : 'none';

    document.getElementById('estimateModal').style.display = 'flex';
}

function shareEstimate() {
    const element = document.getElementById('printableEstimate');
    html2pdf().from(element).toPdf().get('pdf').then(function (pdf) {
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `Estimate_${document.getElementById('clientName').value}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            navigator.share({
                files: [pdfFile],
                title: 'Project Estimate',
                text: `Estimate from ${studioSettings.studioName} for ${document.getElementById('clientName').value}`
            }).catch(console.error);
        } else {
            sendWhatsApp(document.getElementById('clientPhone').value, 0, document.getElementById('clientName').value);
        }
    });
}

function confirmBooking() {
    const name = document.getElementById('clientName').value;
    const travel = parseFloat(document.getElementById('travelCharge').value || 0);
    const other = parseFloat(document.getElementById('otherCharge').value || 0);
    const disc = parseFloat(document.getElementById('discountInput').value || 0);
    const adv = parseFloat(document.getElementById('advanceInput').value || 0);
    let addonsTotal = 0;
    document.querySelectorAll('.addon-check:checked').forEach(cb => addonsTotal += parseFloat(cb.value));
    const total = (selectedPackage ? selectedPackage.price : 0) + addonsTotal + travel + other - disc;

    const newEst = {
        clientName: name, phone: document.getElementById('clientPhone').value, eventDate: document.getElementById('eventDate').value,
        packageName: selectedPackage ? selectedPackage.name : 'Custom', total: total, balance: total - adv, category: document.getElementById('eventCategory').value,
        session: document.getElementById('eventSession').value, location: document.getElementById('location').value,
        notes: document.getElementById('estimateNotes').value, travel: travel, other: other, status: 'Pending', timestamp: Date.now()
    };

    estimates.push(newEst);
    localStorage.setItem('estimates', JSON.stringify(estimates));
    
    // Reset Form
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('eventDate').value = '';
    document.getElementById('location').value = '';
    document.getElementById('travelCharge').value = '0';
    document.getElementById('otherCharge').value = '0';
    document.getElementById('discountInput').value = '0';
    document.getElementById('advanceInput').value = '0';
    document.getElementById('estimateNotes').value = '';
    document.querySelectorAll('.addon-check').forEach(cb => cb.checked = false);
    selectedPackage = null;
    updateTotal();

    closeModal();
    renderCalendar();
    switchTab('history');
    updateDashboard();
}

function downloadPDF() {
    const element = document.getElementById('printableEstimate');
    const opt = { margin: 0, filename: `Estimate_${document.getElementById('printClientName').innerText}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();
}

function closeModal() { document.getElementById('estimateModal').style.display = 'none'; }

// History & Clients
function renderHistory() {
    const search = document.getElementById('historySearch').value.toLowerCase();
    document.getElementById('historyList').innerHTML = estimates
        .filter(e => e.clientName.toLowerCase().includes(search))
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((e) => `
            <tr>
                <td data-label="Date">${e.eventDate || 'TBD'}</td>
                <td data-label="Client"><strong>${e.clientName}</strong></td>
                <td data-label="Package">${e.packageName}</td>
                <td data-label="Total">₹${e.total.toLocaleString('en-IN')}</td>
                <td data-label="Balance" style="color:var(--primary-pink); font-weight:bold;">₹${e.balance.toLocaleString('en-IN')}</td>
                <td data-label="Actions">
                    <button class="btn-wa" onclick="sendWhatsApp('${e.phone}', ${e.balance}, '${e.clientName}')"><i class="fab fa-whatsapp"></i></button>
                    <button style="background:none; border:none; color:white; cursor:pointer;" onclick="deleteEstimate(${e.timestamp})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No history found.</td></tr>';
}

function deleteEstimate(timestamp) {
    if (confirm("Delete this estimate?")) {
        estimates = estimates.filter(e => e.timestamp !== timestamp);
        localStorage.setItem('estimates', JSON.stringify(estimates));
        renderHistory();
        renderCalendar();
        updateDashboard();
    }
}

function renderClients() {
    const clients = [...new Set(estimates.map(e => JSON.stringify({name: e.clientName, phone: e.phone})))].map(s => JSON.parse(s));
    document.getElementById('clientsList').innerHTML = clients.map(c => `
        <tr><td data-label="Name"><strong>${c.name}</strong></td><td data-label="Phone">${c.phone}</td><td data-label="Actions"><button class="btn-wa" onclick="sendWhatsApp('${c.phone}', 0, '${c.name}')"><i class="fab fa-whatsapp"></i> Chat</button></td></tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No clients found.</td></tr>';
}

// Backup & Settings
function loadSettings() {
    document.getElementById('set-studioName').value = studioSettings.studioName;
    document.getElementById('set-studioPhone').value = studioSettings.studioPhone || '';
    document.getElementById('set-studioAddress').value = studioSettings.studioAddress || '';
    document.getElementById('set-defaultTerms').value = studioSettings.defaultTerms || '';
}

function saveSettings() {
    studioSettings.studioName = document.getElementById('set-studioName').value;
    studioSettings.studioPhone = document.getElementById('set-studioPhone').value;
    studioSettings.studioAddress = document.getElementById('set-studioAddress').value;
    studioSettings.defaultTerms = document.getElementById('set-defaultTerms').value;
    localStorage.setItem('studioSettings', JSON.stringify(studioSettings));
}

function exportData() {
    const data = { estimates, expenses, packages, studioSettings, calendarEvents, portfolioImages };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'neel_studio_pro_backup.json'; a.click();
}

function importData(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        estimates = data.estimates || []; expenses = data.expenses || []; packages = data.packages || packages;
        calendarEvents = data.calendarEvents || []; studioSettings = data.studioSettings || studioSettings;
        portfolioImages = data.portfolioImages || [];
        localStorage.setItem('estimates', JSON.stringify(estimates)); localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); localStorage.setItem('studioSettings', JSON.stringify(studioSettings));
        localStorage.setItem('portfolioImages', JSON.stringify(portfolioImages));
        location.reload();
    };
    reader.readAsText(file);
}

function sendWhatsApp(phone, balance, name) {
    const message = balance > 0 ? `Hi ${name}, reminder from ${studioSettings.studioName} regarding balance ₹${balance}.` : `Hi ${name}, from ${studioSettings.studioName}!`;
    const cleanPhone = phone.replace(/\D/g, '').length === 10 ? `91${phone.replace(/\D/g, '')}` : phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Calendar Implementation
function renderCalendar() {
    renderMonthlySchedule();
    const container = document.getElementById('calendar-container');
    if (!container) return;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let calendarHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; flex-wrap:wrap; gap:15px;">
            <div style="display:flex; align-items:center; gap:15px;">
                <button onclick="changeMonth(-1)" class="btn-primary" style="padding:10px 15px; background:var(--glass);"><i class="fas fa-chevron-left"></i></button>
                <h2 style="color:var(--secondary-cyan); margin-bottom:0; min-width:150px; text-align:center; font-size:1.2rem;">${monthNames[currentMonth]} ${currentYear}</h2>
                <button onclick="changeMonth(1)" class="btn-primary" style="padding:10px 15px; background:var(--glass);"><i class="fas fa-chevron-right"></i></button>
            </div>
            <button class="btn-primary" onclick="openCalendarModal()"><i class="fas fa-plus"></i> Add Event</button>
        </div>
        <div class="cal-grid">
            ${weekDays.map(d => `<div style="text-align:center; color:var(--text-muted); font-weight:700; font-size:0.75rem; text-transform:uppercase; padding-bottom:10px;">${d}</div>`).join('')}
    `;

    for (let i = 0; i < firstDay; i++) calendarHtml += '<div class="cal-day-empty"></div>';
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayItems = [
            ...estimates.filter(e => e.eventDate === dateStr).map(e => ({...e, type: 'estimate'})),
            ...calendarEvents.filter(e => e.eventDate === dateStr).map(e => ({...e, type: 'event'}))
        ];
        dayItems.sort((a, b) => {
            const sessions = { 'Morning': 1, 'Evening': 2, 'Full Day': 3 };
            return (sessions[a.session] || 99) - (sessions[b.session] || 99);
        });

        calendarHtml += `
            <div class="cal-day ${dayItems.length > 0 ? 'has-event' : ''}" onclick="openCalendarModal('${dateStr}')">
                <span style="font-weight:700; opacity:0.5; font-size:0.8rem;">${i}</span>
                <div style="margin-top:5px; display:flex; flex-direction:column; gap:4px; width:100%;">
                    ${dayItems.map(item => `
                        <div class="cal-event-pill ${item.type === 'estimate' ? 'pill-estimate' : 'pill-event'}">
                            ${item.session ? `[${item.session[0]}] ` : ''}${item.clientName || item.title}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    calendarHtml += `</div>`;
    container.innerHTML = calendarHtml;
}

function renderMonthlySchedule() {
    const list = document.getElementById('manualEventsList');
    if (!list) return;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
    const monthlyItems = [
        ...estimates.filter(e => e.eventDate && e.eventDate.startsWith(monthStr)).map(e => ({...e, type: 'estimate'})),
        ...calendarEvents.filter(e => e.eventDate && e.eventDate.startsWith(monthStr)).map(e => ({...e, type: 'event'}))
    ];

    monthlyItems.sort((a, b) => {
        if (a.eventDate !== b.eventDate) return new Date(a.eventDate) - new Date(b.eventDate);
        const sessions = { 'Morning': 1, 'Evening': 2, 'Full Day': 3 };
        return (sessions[a.session] || 99) - (sessions[b.session] || 99);
    });

    list.innerHTML = monthlyItems.map((e) => {
        const isManual = e.type === 'event';
        return `
            <tr style="border-left: 4px solid ${isManual ? 'var(--secondary-cyan)' : 'var(--primary-pink)'}">
                <td data-label="Date">${e.eventDate}</td>
                <td data-label="Description"><strong>${isManual ? e.title : e.packageName}</strong></td>
                <td data-label="Client">${e.clientName || '-'}</td>
                <td data-label="Session"><span class="cal-event-pill ${isManual ? 'pill-event' : 'pill-estimate'}" style="display:inline-block; width:auto; padding:2px 10px;">${e.session || 'Full Day'}</span></td>
                <td data-label="Status" style="text-align:center;">
                    ${isManual ? 
                        `<button style="background:none; border:none; color:white; cursor:pointer;" onclick="deleteCalendarEvent(${e.id})"><i class="fas fa-trash"></i></button>` : 
                        `<i class="fas fa-check-circle" style="color:var(--primary-pink)" title="Confirmed Booking"></i>`
                    }
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No bookings for ${monthNames[currentMonth]} ${currentYear}.</td></tr>`;
}

function deleteCalendarEvent(id) {
    if (confirm("Delete this event?")) {
        calendarEvents = calendarEvents.filter(e => e.id !== id);
        localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
        renderCalendar();
        updateDashboard();
    }
}

function openCalendarModal(date = '') { 
    document.getElementById('calEventDate').value = date || new Date().toISOString().split('T')[0]; 
    document.getElementById('calEventTitle').value = ''; 
    document.getElementById('calClientName').value = ''; 
    document.getElementById('calEventLocation').value = ''; 
    document.getElementById('calendarModal').style.display = 'flex'; 
}

function closeCalendarModal() { document.getElementById('calendarModal').style.display = 'none'; }

function saveCalendarEvent() {
    const title = document.getElementById('calEventTitle').value, client = document.getElementById('calClientName').value, date = document.getElementById('calEventDate').value, session = document.getElementById('calEventSession').value, location = document.getElementById('calEventLocation').value;
    if (!title || !date) return alert("Title and Date are required!");
    calendarEvents.push({ title, clientName: client, eventDate: date, session, location, id: Date.now() });
    localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
    closeCalendarModal(); renderCalendar(); updateDashboard();
}

function changeMonth(d) { 
    currentMonth += d; 
    if (currentMonth > 11) { currentMonth = 0; currentYear++; } 
    if (currentMonth < 0) { currentMonth = 11; currentYear--; } 
    renderCalendar(); 
}
