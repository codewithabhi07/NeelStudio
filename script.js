// --- Data Persistence ---
const DB = {
    estimates: JSON.parse(localStorage.getItem('neel_estimates')) || [],
    bookings: JSON.parse(localStorage.getItem('neel_bookings')) || [],
    packages: JSON.parse(localStorage.getItem('neel_packages')) || {
        weddingEssentials: { name: "Wedding Essentials (Haldi + Marriage)", price: 65000 },
        maternityBaby: { name: "Maternity & Baby Shower Combo", price: 35000 },
        grandWedding: { name: "Grand Wedding Suite", price: 150000 },
        juniorSpecial: { name: "Junior's Special (Baby Shower + Newborn)", price: 45000 }
    },
    expenses: JSON.parse(localStorage.getItem('neel_expenses')) || [],
    settings: JSON.parse(localStorage.getItem('neel_settings')) || {
        logo: null,
        studioName: "Neel Studio",
        studioSub: "Cinematic Wedding Films & Photography"
    }
};

function saveData() {
    localStorage.setItem('neel_estimates', JSON.stringify(DB.estimates));
    localStorage.setItem('neel_bookings', JSON.stringify(DB.bookings));
    localStorage.setItem('neel_packages', JSON.stringify(DB.packages));
    localStorage.setItem('neel_expenses', JSON.stringify(DB.expenses));
    localStorage.setItem('neel_settings', JSON.stringify(DB.settings));
    updateDashboardStats();
}

// --- Tab Switching ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-links li');
    if (tabId === 'dashboard') navItems[0].classList.add('active');
    else if (tabId === 'estimate') navItems[1].classList.add('active');
    else if (tabId === 'calendar') navItems[2].classList.add('active');
    else if (tabId === 'history') navItems[3].classList.add('active');

    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'history') renderHistory();
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'clients') renderClients();
    if (tabId === 'settings') renderSettings();
}

// --- Settings & Branding ---
function renderSettings() {
    document.getElementById('set-studioName').value = DB.settings.studioName;
    document.getElementById('set-studioSub').value = DB.settings.studioSub;
    if (DB.settings.logo) {
        document.getElementById('logoPreview').innerHTML = `<img src="${DB.settings.logo}" style="width: 100%; border-radius: 8px;">`;
    }
    
    const pkgList = document.getElementById('packageEditorList');
    pkgList.innerHTML = '';
    Object.keys(DB.packages).forEach(key => {
        const pkg = DB.packages[key];
        pkgList.innerHTML += `
            <div class="package-edit-item">
                <div class="input-group" style="flex: 2;">
                    <label>Package Name</label>
                    <input type="text" value="${pkg.name}" data-key="${key}" class="pkg-name">
                </div>
                <div class="input-group" style="flex: 1;">
                    <label>Price (₹)</label>
                    <input type="number" value="${pkg.price}" class="pkg-price">
                </div>
            </div>
        `;
    });
}

function updateSettings() {
    DB.settings.studioName = document.getElementById('set-studioName').value;
    DB.settings.studioSub = document.getElementById('set-studioSub').value;
    saveData();
}

function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            DB.settings.logo = e.target.result;
            document.getElementById('logoPreview').innerHTML = `<img src="${e.target.result}" style="width: 100%; border-radius: 8px;">`;
            saveData();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function savePackages() {
    const names = document.querySelectorAll('.pkg-name');
    const prices = document.querySelectorAll('.pkg-price');
    names.forEach((el, i) => {
        const key = el.getAttribute('data-key');
        DB.packages[key] = { name: el.value, price: parseInt(prices[i].value) };
    });
    saveData();
    alert("Packages updated!");
    renderPackageChips(); // Need to implement this
}

function renderPackageChips() {
    const container = document.querySelector('.package-chips');
    container.innerHTML = '';
    Object.keys(DB.packages).forEach(key => {
        container.innerHTML += `<div class="chip" onclick="selectPackage('${key}')">${DB.packages[key].name}</div>`;
    });
}

// --- Data Safety ---
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "neel_studio_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                Object.keys(importedData).forEach(key => {
                    localStorage.setItem(key, importedData[key]);
                });
                alert("Data restored successfully! The app will reload.");
                window.location.reload();
            } catch (err) {
                alert("Invalid backup file!");
            }
        };
        reader.readAsText(input.files[0]);
    }
}

// --- Clients CRM ---
function renderClients() {
    const list = document.getElementById('clientsList');
    list.innerHTML = '';
    
    // Extract unique clients from estimates
    const clientsMap = {};
    DB.estimates.forEach(e => {
        if (!clientsMap[e.clientName]) {
            clientsMap[e.clientName] = {
                name: e.clientName,
                phone: e.phone || 'N/A',
                address: e.address || 'N/A',
                lastBooking: e.date || 'N/A'
            };
        } else if (e.date > clientsMap[e.clientName].lastBooking) {
            clientsMap[e.clientName].lastBooking = e.date;
        }
    });

    Object.values(clientsMap).reverse().forEach(c => {
        list.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.address}</td>
                <td>${c.lastBooking}</td>
                <td>
                    <button class="btn-icon" onclick="shareWA('${c.phone}')"><i class="fab fa-whatsapp"></i></button>
                </td>
            </tr>
        `;
    });
}

// --- Estimate Logic ---
let currentEstimate = { package: null, addons: [], subtotal: 0, discount: 0, total: 0, advance: 0, balance: 0 };

function selectPackage(key) {
    currentEstimate.package = DB.packages[key];
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateTotal();
}

function updateTotal() {
    if (!currentEstimate.package) return;
    let subtotal = currentEstimate.package.price;
    currentEstimate.addons = [];
    document.querySelectorAll('.addon-grid-lite input:checked').forEach(cb => {
        const val = parseInt(cb.value);
        subtotal += val;
        currentEstimate.addons.push({ name: cb.getAttribute('data-name'), price: val });
    });
    const discount = parseInt(document.getElementById('discountInput').value) || 0;
    const advance = parseInt(document.getElementById('advanceInput').value) || 0;
    currentEstimate.subtotal = subtotal;
    currentEstimate.discount = discount;
    currentEstimate.total = subtotal - discount;
    currentEstimate.advance = advance;
    currentEstimate.balance = currentEstimate.total - advance;
    document.getElementById('totalDisplay').innerText = `₹${currentEstimate.total.toLocaleString('en-IN')}`;
    document.getElementById('balanceDisplay').innerText = `₹${currentEstimate.balance.toLocaleString('en-IN')}`;
}

function checkAvailability() {
    const date = document.getElementById('eventDate').value;
    const badge = document.getElementById('avail-badge');
    const isBooked = DB.bookings.some(b => b.date === date);
    badge.innerText = isBooked ? "ALREADY BOOKED" : "AVAILABLE";
    badge.style.background = isBooked ? "#e74c3c" : "#2ecc71";
}

function generateEstimate() {
    const name = document.getElementById('clientName').value;
    const phone = document.getElementById('clientPhone').value;
    if (!name || !currentEstimate.package) { alert("Enter client name and select package!"); return; }
    
    // Branding
    const brandContainer = document.querySelector('.studio-branding');
    brandContainer.innerHTML = `
        ${DB.settings.logo ? `<img src="${DB.settings.logo}" style="width: 80px; margin-bottom: 10px;">` : '<i class="fas fa-camera-retro"></i>'}
        <h2>${DB.settings.studioName}</h2>
        <p>${DB.settings.studioSub}</p>
    `;

    document.getElementById('billNumber').innerText = `#NS-${Date.now().toString().slice(-6)}`;
    document.getElementById('printClientName').innerText = name + (phone ? ` (${phone})` : '');
    document.getElementById('printLocation').innerText = document.getElementById('location').value || "Not Set";
    document.getElementById('printDate').innerText = document.getElementById('eventDate').value || "TBD";
    document.getElementById('issueDate').innerText = new Date().toLocaleDateString();
    
    const list = document.getElementById('printItemsList');
    list.innerHTML = `<tr><td>${currentEstimate.package.name}</td><td class="text-right">₹${currentEstimate.package.price.toLocaleString('en-IN')}</td></tr>`;
    currentEstimate.addons.forEach(a => { list.innerHTML += `<tr><td>${a.name}</td><td class="text-right">₹${a.price.toLocaleString('en-IN')}</td></tr>`; });
    
    document.getElementById('printSubtotal').innerText = `₹${currentEstimate.subtotal.toLocaleString('en-IN')}`;
    document.getElementById('printDiscount').innerText = `- ₹${currentEstimate.discount.toLocaleString('en-IN')}`;
    document.getElementById('printGrandTotal').innerText = `₹${currentEstimate.total.toLocaleString('en-IN')}`;
    document.getElementById('printAdvance').innerText = `₹${currentEstimate.advance.toLocaleString('en-IN')}`;
    document.getElementById('printBalance').innerText = `₹${currentEstimate.balance.toLocaleString('en-IN')}`;
    document.getElementById('estimateModal').style.display = 'flex';
}

function confirmBooking() {
    const name = document.getElementById('clientName').value;
    const phone = document.getElementById('clientPhone').value;
    const date = document.getElementById('eventDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const category = document.getElementById('eventCategory').value;
    const staff = document.getElementById('assignStaff').value;
    const loc = document.getElementById('location').value;

    const newEst = { 
        id: Date.now(), 
        clientName: name, 
        phone: phone, 
        date: date, 
        endDate: endDate,
        package: currentEstimate.package.name, 
        total: currentEstimate.total, 
        balance: currentEstimate.balance,
        status: 'Pending',
        staff: staff,
        category: category
    };
    
    DB.estimates.push(newEst);
    if (date) {
        // Block all dates from date to endDate
        let current = new Date(date);
        const last = endDate ? new Date(endDate) : new Date(date);
        
        while (current <= last) {
            const dStr = current.toISOString().split('T')[0];
            DB.bookings.push({ 
                date: dStr, 
                name: `${name} (${category})`, 
                loc, 
                estimateId: newEst.id,
                category: category,
                staff: staff
            });
            current.setDate(current.getDate() + 1);
        }
    }
    saveData();
    closeModal();
    switchTab('dashboard');
}

// --- Calendar Logic ---
let viewDate = new Date();

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const header = document.getElementById('calMonthYear');
    grid.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    header.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate);
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => grid.innerHTML += `<div class="cal-day header">${d}</div>`);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="cal-day"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const booking = DB.bookings.find(b => b.date === dStr);
        let colorStyle = '';
        if (booking) {
            const color = getCategoryColor(booking.category);
            colorStyle = `background: ${color}; color: white; border: none;`;
        }
        grid.innerHTML += `
            <div class="cal-day ${booking ? 'booked' : ''}" style="cursor: pointer; ${colorStyle}" onclick="handleDayClick('${dStr}')">
                ${d}
                ${booking ? `<br><small>${booking.name.split(' ')[0]}</small>` : ''}
            </div>
        `;
    }
}

function getCategoryColor(cat) {
    switch(cat) {
        case 'Wedding': return '#e74c3c';
        case 'Maternity': return '#e91e63';
        case 'Baby Shower': return '#9b59b6';
        case 'Pre-Wedding': return '#f39c12';
        default: return 'var(--gold)';
    }
}

function handleDayClick(date) {
    const booking = DB.bookings.find(b => b.date === date);
    if (booking) {
        if (confirm(`Date: ${date}\nClient: ${booking.name}\nLocation: ${booking.loc}\n\nDelete this booking?`)) {
            DB.bookings = DB.bookings.filter(b => b.date !== date);
            saveData();
            renderCalendar();
        }
    } else {
        document.getElementById('quickAddDate').value = date;
        document.getElementById('quickAddModal').style.display = 'flex';
    }
}

function saveQuickBooking() {
    const date = document.getElementById('quickAddDate').value;
    const name = document.getElementById('quickClientName').value;
    const type = document.getElementById('quickEventType').value;
    const staff = document.getElementById('quickStaff').value;
    const loc = document.getElementById('quickLocation').value;
    if (!name) { alert("Enter client name!"); return; }
    DB.bookings.push({ 
        date, 
        name: `${name} (${type})`, 
        loc, 
        category: type,
        staff: staff,
        estimateId: null 
    });
    saveData();
    closeQuickModal();
    renderCalendar();
}

function changeMonth(dir) { viewDate.setMonth(viewDate.getMonth() + dir); renderCalendar(); }
function closeQuickModal() { 
    document.getElementById('quickAddModal').style.display = 'none'; 
    document.getElementById('quickClientName').value = '';
    document.getElementById('quickLocation').value = '';
    document.getElementById('quickStaff').value = '';
}

// --- History & Dashboard ---
function renderHistory() {
    const list = document.getElementById('historyList');
    const search = document.getElementById('historySearch').value.toLowerCase();
    list.innerHTML = '';
    DB.estimates.filter(e => e.clientName.toLowerCase().includes(search)).reverse().forEach(e => {
        list.innerHTML += `
            <tr>
                <td>${e.date || 'N/A'}</td>
                <td>
                    <strong>${e.clientName}</strong><br>
                    <small class="text-muted">${e.staff || 'No Staff'}</small>
                </td>
                <td>
                    ${e.package}<br>
                    <span class="badge" style="background: ${getStatusColor(e.status)}">${e.status || 'Pending'}</span>
                </td>
                <td>₹${e.total.toLocaleString('en-IN')}</td>
                <td class="gold">₹${e.balance.toLocaleString('en-IN')}</td>
                <td>
                    <button class="btn-icon" onclick="updatePayment(${e.id})" title="Update Payment"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="changeStatus(${e.id})" title="Change Status"><i class="fas fa-tasks"></i></button>
                    <button class="btn-icon" onclick="deleteEstimate(${e.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function getStatusColor(status) {
    switch(status) {
        case 'Shooting': return '#3498db';
        case 'Editing': return '#f1c40f';
        case 'Delivered': return '#2ecc71';
        default: return '#e74c3c';
    }
}

function updatePayment(id) {
    const est = DB.estimates.find(e => e.id === id);
    const paid = prompt(`Current Balance: ₹${est.balance}\nEnter amount received:`, "0");
    if (paid && !isNaN(paid)) {
        est.balance -= parseInt(paid);
        saveData();
        renderHistory();
    }
}

function changeStatus(id) {
    const est = DB.estimates.find(e => e.id === id);
    const newStatus = prompt(`Current Status: ${est.status}\nEnter new status (Shooting, Editing, Delivered):`, est.status);
    if (newStatus) {
        est.status = newStatus;
        saveData();
        renderHistory();
    }
}

function deleteEstimate(id) {
    if (confirm("Delete this record?")) {
        DB.estimates = DB.estimates.filter(e => e.id !== id);
        DB.bookings = DB.bookings.filter(b => b.estimateId !== id);
        saveData();
        renderHistory();
    }
}

function renderDashboard() {
    document.getElementById('todayDate').innerText = new Date().toDateString();
    const upcomingList = document.getElementById('dashboard-upcoming-list');
    upcomingList.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    const upcoming = DB.bookings.filter(b => b.date >= today).sort((a,b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) upcomingList.innerHTML = "<p class='text-muted'>No upcoming events.</p>";
    upcoming.slice(0, 5).forEach(b => {
        upcomingList.innerHTML += `<div class="upcoming-item"><div><strong>${b.name}</strong><br><small class="text-muted">${b.loc || 'No location'}</small></div><div class="text-right"><span class="gold">${b.date}</span></div></div>`;
    });
}

function updateDashboardStats() {
    const totalRev = DB.estimates.reduce((sum, e) => sum + e.total, 0);
    const totalPen = DB.estimates.reduce((sum, e) => sum + e.balance, 0);
    const totalExp = DB.expenses.reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('stat-bookings').innerText = DB.bookings.length;
    document.getElementById('stat-revenue').innerText = `₹${totalRev.toLocaleString('en-IN')}`;
    document.getElementById('stat-pending').innerText = `₹${totalPen.toLocaleString('en-IN')}`;
    document.getElementById('stat-profit').innerText = `₹${(totalRev - totalExp).toLocaleString('en-IN')}`;
    
    // Mini expense list
    const miniExp = document.getElementById('mini-expense-list');
    if (miniExp) {
        miniExp.innerHTML = '<strong>Recent Expenses:</strong><br>';
        DB.expenses.slice(-3).reverse().forEach(e => {
            miniExp.innerHTML += `<div>${e.desc}: <span class="gold">₹${e.amount}</span></div>`;
        });
    }
}

function addExpense() {
    const desc = document.getElementById('exp-desc').value;
    const amount = parseInt(document.getElementById('exp-amount').value);
    if (!desc || !amount) return;
    DB.expenses.push({ desc, amount, date: new Date().toISOString() });
    saveData();
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amount').value = '';
}

function closeModal() { document.getElementById('estimateModal').style.display = 'none'; }
function downloadPDF() { const el = document.getElementById('printableEstimate'); html2pdf().from(el).save(`Neel_Studio_Bill.pdf`); }
function shareWA() { window.open(`https://wa.me/?text=Estimate from Neel Studio`, '_blank'); }

window.onload = () => { updateDashboardStats(); renderDashboard(); renderPackageChips(); };
