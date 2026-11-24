// ============================================================
// 🌾 RICE SALES & STOCK ERP - FRONTEND CLIENT JAVASCRIPT
// ============================================================

// Global state
let currentTab = 'dashboard';
let currentLedgerSubTab = 'individual';
let allParties = [];
let currentLedgerParty = null;

let rawSalesData = [];
let rawPurchasesData = [];
let rawPaymentsData = [];
let rawLedgerData = null;
let rawSummaryData = [];
let currentSlipState = null;

// ============================================================
// 0. BUSINESS PROFILE & REUSABLE LETTERHEAD
// ============================================================
const DEFAULT_BUSINESS_PROFILE = {
  millName: 'Rice Sales & Stock ERP',
  proprietorName: '',
  phone: '',
  gstin: '',
  address: ''
};

let currentBusinessProfile = { ...DEFAULT_BUSINESS_PROFILE };

function getBusinessProfile() {
  try {
    const cached = localStorage.getItem('rice_erp_business_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        millName: (parsed.millName || '').trim() || DEFAULT_BUSINESS_PROFILE.millName,
        proprietorName: (parsed.proprietorName || '').trim(),
        phone: (parsed.phone || '').trim(),
        gstin: (parsed.gstin || '').trim(),
        address: (parsed.address || '').trim()
      };
    }
  } catch (e) {}
  return { ...DEFAULT_BUSINESS_PROFILE };
}

async function loadBusinessProfile() {
  currentBusinessProfile = getBusinessProfile();
  try {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        currentBusinessProfile = {
          millName: (data.profile.millName || '').trim() || DEFAULT_BUSINESS_PROFILE.millName,
          proprietorName: (data.profile.proprietorName || '').trim(),
          phone: (data.profile.phone || '').trim(),
          gstin: (data.profile.gstin || '').trim(),
          address: (data.profile.address || '').trim()
        };
        localStorage.setItem('rice_erp_business_profile', JSON.stringify(currentBusinessProfile));
      }
    }
  } catch (e) {}
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBusinessHeader(options = {}) {
  const prof = getBusinessProfile();
  const title = options.title || 'DELIVERY CHALLAN / RECEIPT';
  const subtitle = options.subtitle || '';
  const showEdit = options.showEditLink !== false;

  let detailsParts = [];
  if (prof.proprietorName) detailsParts.push(`<span>Prop: <strong>${escapeHtml(prof.proprietorName)}</strong></span>`);
  if (prof.phone) detailsParts.push(`<span><i class="fa-solid fa-phone text-slate-400 mr-1"></i><strong>${escapeHtml(prof.phone)}</strong></span>`);
  if (prof.address) detailsParts.push(`<span><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${escapeHtml(prof.address)}</span>`);

  let gstinBadge = '';
  if (prof.gstin) {
    gstinBadge = `
      <div class="inline-flex items-center space-x-1.5 px-2.5 py-0.5 mt-1 rounded border border-slate-300 bg-slate-50 text-[10px] sm:text-xs font-semibold text-slate-700">
        <span class="text-slate-500 font-normal">GSTIN / Mandi Lic:</span>
        <strong class="font-mono text-slate-900 tracking-wider">${escapeHtml(prof.gstin)}</strong>
      </div>
    `;
  }

  let editBtn = '';
  if (showEdit) {
    editBtn = `
      <button type="button" onclick="openProfileModal()" class="no-print text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline ml-1.5 transition" title="Edit Business Details & Letterhead">
        <i class="fa-solid fa-pen-to-square mr-1"></i>Edit Info
      </button>
    `;
  }

  return `
    <div class="business-letterhead text-center pb-3 border-b-2 border-[#0F4C3A]/20">
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <h1 class="text-lg sm:text-2xl font-black text-[#0F4C3A] tracking-wide uppercase leading-tight font-sans">
          🌾 ${escapeHtml(prof.millName || 'Rice Sales & Stock ERP')}
        </h1>
        ${editBtn}
      </div>

      ${detailsParts.length > 0 ? `
        <div class="text-[11px] sm:text-xs text-slate-600 mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
          ${detailsParts.join('<span class="text-slate-300">•</span>')}
        </div>
      ` : ''}

      ${gstinBadge}

      <div class="mt-2.5 pt-2 border-t border-slate-200/80">
        <span class="inline-block px-3 py-0.5 bg-[#0F4C3A]/10 text-[#0F4C3A] font-black text-[11px] sm:text-xs tracking-wider rounded uppercase">
          ${escapeHtml(title)}
        </span>
        ${subtitle ? `<p class="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">${escapeHtml(subtitle)}</p>` : ''}
      </div>
    </div>
  `;
}

function openProfileModal() {
  const prof = getBusinessProfile();
  const millInput = document.getElementById('prof_mill_name');
  const propInput = document.getElementById('prof_proprietor');
  const phoneInput = document.getElementById('prof_phone');
  const gstinInput = document.getElementById('prof_gstin');
  const addrInput = document.getElementById('prof_address');

  if (millInput) millInput.value = prof.millName || '';
  if (propInput) propInput.value = prof.proprietorName || '';
  if (phoneInput) phoneInput.value = prof.phone || '';
  if (gstinInput) gstinInput.value = prof.gstin || '';
  if (addrInput) addrInput.value = prof.address || '';

  updateProfilePreview();
  openModal('profileModal');
}

function updateProfilePreview() {
  const preview = document.getElementById('prof_live_preview');
  if (!preview) return;

  const millName = document.getElementById('prof_mill_name')?.value.trim() || 'Rice Sales & Stock ERP';
  const proprietorName = document.getElementById('prof_proprietor')?.value.trim() || '';
  const phone = document.getElementById('prof_phone')?.value.trim() || '';
  const gstin = document.getElementById('prof_gstin')?.value.trim() || '';
  const address = document.getElementById('prof_address')?.value.trim() || '';

  let details = [];
  if (proprietorName) details.push(`<span>Prop: <strong>${escapeHtml(proprietorName)}</strong></span>`);
  if (phone) details.push(`<span><i class="fa-solid fa-phone mr-1"></i><strong>${escapeHtml(phone)}</strong></span>`);
  if (address) details.push(`<span><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(address)}</span>`);

  preview.innerHTML = `
    <div class="text-center space-y-1">
      <h4 class="text-base font-black text-[#0F4C3A] uppercase tracking-wide">🌾 ${escapeHtml(millName)}</h4>
      ${details.length > 0 ? `<div class="text-[11px] text-slate-600 flex flex-wrap items-center justify-center gap-x-2">${details.join('<span class="text-slate-300">•</span>')}</div>` : ''}
      ${gstin ? `<div class="inline-block px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-700">GSTIN / Mandi Lic: <strong class="font-mono">${escapeHtml(gstin)}</strong></div>` : ''}
      <div class="text-[10px] text-emerald-800 font-bold uppercase tracking-wider pt-1 border-t border-slate-200 mt-1">Official Document Letterhead Preview</div>
    </div>
  `;
}

async function submitBusinessProfile(e) {
  if (e) e.preventDefault();
  const millName = document.getElementById('prof_mill_name')?.value.trim() || 'Rice Sales & Stock ERP';
  const proprietorName = document.getElementById('prof_proprietor')?.value.trim() || '';
  const phone = document.getElementById('prof_phone')?.value.trim() || '';
  const gstin = document.getElementById('prof_gstin')?.value.trim() || '';
  const address = document.getElementById('prof_address')?.value.trim() || '';

  const profile = {
    millName,
    proprietorName,
    phone,
    gstin,
    address
  };

  currentBusinessProfile = profile;
  localStorage.setItem('rice_erp_business_profile', JSON.stringify(profile));

  if (currentSlipState) {
    showSlip(currentSlipState.type, currentSlipState.id);
  }
  const headerContainer = document.getElementById('ledger-business-header-container');
  if (headerContainer && currentLedgerParty) {
    headerContainer.innerHTML = renderBusinessHeader({
      title: 'PARTY ACCOUNT STATEMENT',
      subtitle: 'Detailed Transaction Ledger',
      showEditLink: true
    });
  }

  closeModal('profileModal');

  try {
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
  } catch (err) {
    console.warn('Failed to sync profile to server:', err);
  }
}

// Helper: Format Indian Rupee (INR)
function formatINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹ 0.00';
  const val = Number(num);
  return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: Format Date as DD-MM-YYYY
function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Universal CSV Export (With UTF-8 BOM for Microsoft Excel)
function downloadCSV(filename, rows) {
  const processRow = function (row) {
    let finalVal = '';
    for (let j = 0; j < row.length; j++) {
      let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
      let result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
      if (j > 0) finalVal += ',';
      finalVal += result;
    }
    return finalVal + '\n';
  };

  let csvFile = '\uFEFF'; // UTF-8 BOM so Excel opens INR, accents, and dashes cleanly
  for (let i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Helper: Set default dates to today
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('sale_date') && !document.getElementById('sale_date').value) document.getElementById('sale_date').value = today;
  if (document.getElementById('pur_date') && !document.getElementById('pur_date').value) document.getElementById('pur_date').value = today;
  if (document.getElementById('pay_date') && !document.getElementById('pay_date').value) document.getElementById('pay_date').value = today;
}

// Tab Switching
function switchTab(tab) {
  currentTab = tab;
  ['dashboard', 'sales', 'purchases', 'payments', 'ledgers', 'stock'].forEach(t => {
    const el = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
    if (btn) {
      if (t === tab) {
        btn.className = 'tab-btn py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs sm:text-sm font-medium border-b-2 border-amber-400 text-white flex items-center whitespace-nowrap shrink-0';
      } else {
        btn.className = 'tab-btn py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center whitespace-nowrap shrink-0';
      }
    }
  });

  if (tab === 'dashboard') loadDashboard();
  if (tab === 'sales') loadSales();
  if (tab === 'purchases') loadPurchases();
  if (tab === 'payments') loadPayments();
  if (tab === 'ledgers') loadLedgersView();
  if (tab === 'stock') loadStock();
}

// ============================================================
// 1. DASHBOARD
// ============================================================
let currentKpiFilter = 'all';

function setKpiFilter(filter) {
  currentKpiFilter = filter;
  ['today', 'month', 'all'].forEach(f => {
    const btn = document.getElementById(`kpi-filter-${f}`);
    if (btn) {
      if (f === filter) {
        btn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white text-emerald-800 shadow font-bold transition';
      } else {
        btn.className = 'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition text-slate-600 hover:text-slate-900';
      }
    }
  });
  loadDashboard();
}

async function loadDashboard() {
  try {
    const res = await fetch(`/api/dashboard?range=${currentKpiFilter}`);
    const data = await res.json();

    const rec = data.totalReceivable !== undefined ? data.totalReceivable : (data.totalReceivables || 0);
    const pay = data.totalPayable !== undefined ? data.totalPayable : (data.totalPayables || 0);
    document.getElementById('dash-receivables').innerText = formatINR(rec);
    document.getElementById('dash-payables').innerText = formatINR(pay);

    document.getElementById('dash-sales').innerText = formatINR(data.totalSales || 0);
    const bagsDisp = data.totalSalesBags || 0;
    document.getElementById('dash-sales-bags').innerText = `${bagsDisp.toLocaleString()} Bags Dispatched`;

    // Calculate total stock bags
    const stockList = data.stock || data.stockByVariety || [];
    const totalBags = stockList.reduce((acc, s) => acc + (s.current_bags || 0), 0);
    document.getElementById('dash-stock-bags').innerText = `${totalBags.toLocaleString()} Bags`;

    // 1. Stock Overview Rendering
    const stockTbody = document.getElementById('dash-stock-tbody');
    const stockMobileList = document.getElementById('dash-stock-mobile-list');

    if (!stockList || stockList.length === 0) {
      const emptyStockHTML = `
        <div class="py-6 sm:py-8 px-4 text-center flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl mb-2.5 shadow-sm border border-amber-100">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <h4 class="font-bold text-slate-800 text-xs sm:text-sm">No stock entries yet</h4>
          <p class="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">Record an inward purchase of paddy or rice to start live inventory tracking.</p>
          <button onclick="openPurModalForAdd()" class="px-3.5 py-1.5 border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition flex items-center shadow-sm active:scale-95">
            <i class="fa-solid fa-wheat-awn mr-1.5 text-amber-600"></i> + Record Purchase
          </button>
        </div>
      `;
      if (stockMobileList) stockMobileList.innerHTML = emptyStockHTML;
      if (stockTbody) stockTbody.innerHTML = `<tr><td colspan="4">${emptyStockHTML}</td></tr>`;
    } else {
      const topStock = stockList.slice(0, 6);
      if (stockMobileList) {
        stockMobileList.innerHTML = topStock.map(s => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100/80 rounded-xl transition border border-slate-100">
            <div class="min-w-0 flex-1 pr-2">
              <p class="font-bold text-slate-800 text-xs truncate">${s.product}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Bought: <span class="font-semibold text-slate-700">${(s.bought_bags || 0).toLocaleString()}</span> | Sold: <span class="font-semibold text-slate-700">${(s.sold_bags || 0).toLocaleString()}</span></p>
            </div>
            <div class="shrink-0 text-right">
              <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black font-mono tabular-nums ${s.current_bags > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : (s.current_bags === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800 border border-rose-200')}">
                ${(s.current_bags || 0).toLocaleString()} Bags
              </span>
            </div>
          </div>
        `).join('');
      }
      if (stockTbody) {
        stockTbody.innerHTML = topStock.map(s => `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-3 font-bold text-slate-800">${s.product}</td>
            <td class="py-2.5 px-3 text-right font-medium text-slate-600 font-mono tabular-nums">${(s.bought_bags || 0).toLocaleString()}</td>
            <td class="py-2.5 px-3 text-right font-medium text-slate-600 font-mono tabular-nums">${(s.sold_bags || 0).toLocaleString()}</td>
            <td class="py-2.5 px-3 text-right font-bold font-mono tabular-nums ${s.current_bags >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${(s.current_bags || 0).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    }

    // 2. Recent Payments Rendering
    const payments = data.recentPayments || [];
    const payTbody = document.getElementById('dash-payments-tbody');
    const payMobileList = document.getElementById('dash-payments-mobile-list');

    if (!payments || payments.length === 0) {
      const emptyPayHTML = `
        <div class="py-6 sm:py-8 px-4 text-center flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl mb-2.5 shadow-sm border border-blue-100">
            <i class="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <h4 class="font-bold text-slate-800 text-xs sm:text-sm">No recent payments</h4>
          <p class="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">Record payments paid to suppliers or money received from customers.</p>
          <button onclick="openPayModalForAdd()" class="px-3.5 py-1.5 border border-blue-300 bg-blue-50/70 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-bold transition flex items-center shadow-sm active:scale-95">
            <i class="fa-solid fa-money-bill-wave mr-1.5 text-blue-600"></i> + Record Payment
          </button>
        </div>
      `;
      if (payMobileList) payMobileList.innerHTML = emptyPayHTML;
      if (payTbody) payTbody.innerHTML = `<tr><td colspan="4">${emptyPayHTML}</td></tr>`;
    } else {
      if (payMobileList) {
        payMobileList.innerHTML = payments.map(p => `
          <div class="flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100/80 rounded-xl transition border border-slate-100">
            <div class="min-w-0 flex-1 pr-2">
              <div class="flex items-center gap-1.5">
                <p class="font-bold text-slate-800 text-xs truncate">${p.party_name}</p>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${p.type === 'PAID' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${p.type}
                </span>
              </div>
              <p class="text-[10px] text-slate-500 mt-0.5 flex items-center">
                <i class="fa-regular fa-calendar text-[9px] mr-1 text-slate-400"></i> ${formatDate(p.date)}
                ${p.mode ? `<span class="mx-1">•</span><span>${p.mode}</span>` : ''}
              </p>
            </div>
            <div class="shrink-0 text-right">
              <span class="font-bold font-mono tabular-nums text-xs ${p.type === 'PAID' ? 'text-rose-600' : 'text-emerald-600'}">
                ${p.type === 'PAID' ? '-' : '+'}${formatINR(p.amount)}
              </span>
            </div>
          </div>
        `).join('');
      }
      if (payTbody) {
        payTbody.innerHTML = payments.map(p => `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">${formatDate(p.date)}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-800">${p.party_name}</td>
            <td class="py-2.5 px-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.type === 'PAID' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                ${p.type}
              </span>
            </td>
            <td class="py-2.5 px-3 text-right font-bold text-slate-800 font-mono tabular-nums">${formatINR(p.amount)}</td>
          </tr>
        `).join('');
      }
    }

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// ============================================================
// 2. SALES REGISTER
// ============================================================
async function loadSales() {
  try {
    const res = await fetch('/api/sales');
    rawSalesData = await res.json();
    renderSalesTable(rawSalesData);
  } catch (err) {
    console.error('Failed to load sales:', err);
  }
}

function renderSalesTable(sales) {
  const tbody = document.getElementById('sales-tbody');
  const tfoot = document.getElementById('sales-tfoot');

  let totBags = 0;
  let totKg = 0;
  let totAmt = 0;

  tbody.innerHTML = sales.map(s => {
    totBags += (s.bags || 0);
    totKg += (s.quantity_kg || 0);
    totAmt += (s.total || 0);

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-2 sm:p-3 text-slate-600 whitespace-nowrap">${formatDate(s.date)}</td>
        <td class="p-2 sm:p-3 font-bold text-slate-800">${s.invoice_no || '-'}</td>
        <td class="p-2 sm:p-3 font-semibold text-emerald-700 cursor-pointer hover:underline" onclick="viewPartyLedger('${s.party_name}')">${s.party_name}</td>
        <td class="p-2 sm:p-3 text-slate-500">${s.rst_no || '-'}</td>
        <td class="p-2 sm:p-3 text-slate-600 font-mono text-[11px]">${s.vehicle_no || '-'}</td>
        <td class="p-2 sm:p-3 font-medium text-slate-800">${s.product}</td>
        <td class="p-2 sm:p-3 text-right font-medium">${s.bags ? s.bags.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono">${s.quantity_kg ? s.quantity_kg.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono">${s.rate ? s.rate.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-bold text-slate-800 whitespace-nowrap">${formatINR(s.total)}</td>
        <td class="p-2 sm:p-3 text-center space-x-1 whitespace-nowrap">
          <button onclick="showSlip('SALE', ${s.id})" class="text-slate-600 hover:text-slate-900 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Print Delivery Slip">
            <i class="fa-solid fa-receipt text-emerald-600"></i>
          </button>
          <button onclick="openSaleModalForEdit(${s.id})" class="text-blue-600 hover:text-blue-800 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Edit Sale">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteSale(${s.id})" class="text-rose-500 hover:text-rose-700 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Delete Sale">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">No sales recorded matching criteria</td></tr>';

  // Summary footer
  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="6" class="p-3 text-right uppercase tracking-wider font-bold text-slate-600">Total (${sales.length} Dispatches):</td>
        <td class="p-3 text-right font-bold text-slate-800">${totBags.toLocaleString()}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800">${totKg.toLocaleString()} KG</td>
        <td></td>
        <td class="p-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">${formatINR(totAmt)}</td>
        <td></td>
      </tr>
    `;
  }
}

function filterSalesTable() {
  const q = (document.getElementById('sales-search').value || '').toLowerCase().trim();
  if (!q) {
    renderSalesTable(rawSalesData);
    return;
  }
  const filtered = rawSalesData.filter(s =>
    (s.party_name && s.party_name.toLowerCase().includes(q)) ||
    (s.invoice_no && s.invoice_no.toLowerCase().includes(q)) ||
    (s.vehicle_no && s.vehicle_no.toLowerCase().includes(q)) ||
    (s.rst_no && s.rst_no.toString().toLowerCase().includes(q)) ||
    (s.product && s.product.toLowerCase().includes(q)) ||
    (s.date && s.date.includes(q))
  );
  renderSalesTable(filtered);
}

function openSaleModalForAdd() {
  document.getElementById('salesForm').reset();
  document.getElementById('sale_edit_id').value = '';
  document.getElementById('salesModalTitle').innerText = 'Record Rice Sale';
  document.getElementById('saleSubmitBtn').innerText = 'Save Sale';
  document.getElementById('sale_calc_preview').innerText = '₹ 0.00';
  openModal('salesModal');
}

function openSaleModalForEdit(id) {
  const sale = rawSalesData.find(s => s.id === id);
  if (!sale) return;

  document.getElementById('sale_edit_id').value = sale.id;
  document.getElementById('salesModalTitle').innerText = `Edit Sale (Inv: ${sale.invoice_no || '#'})`;
  document.getElementById('saleSubmitBtn').innerText = 'Update Sale';

  document.getElementById('sale_date').value = sale.date || '';
  document.getElementById('sale_inv').value = sale.invoice_no || '';
  document.getElementById('sale_party').value = sale.party_name || '';
  document.getElementById('sale_rst').value = sale.rst_no || '';
  document.getElementById('sale_veh').value = sale.vehicle_no || '';
  document.getElementById('sale_prod').value = sale.product || '';
  document.getElementById('sale_bags').value = sale.bags || '';
  document.getElementById('sale_qty').value = sale.quantity_kg || '';
  document.getElementById('sale_rate').value = sale.rate || '';

  calcSaleTotal();
  openModal('salesModal');
}

function exportSalesCSV() {
  if (!rawSalesData || rawSalesData.length === 0) {
    alert('No sales data to export.');
    return;
  }
  const prof = getBusinessProfile();
  const headers = ['Date', 'Invoice No', 'Customer Name', 'RST No', 'Vehicle No', 'Product / Variety', 'Bags', 'Quantity (KG)', 'Rate (per 77KG)', 'Total (INR)'];
  const rows = [
    [prof.millName || 'Rice Sales & Stock ERP'],
    prof.address ? [prof.address + (prof.phone ? ' | Ph: ' + prof.phone : '')] : [],
    prof.gstin ? ['GSTIN: ' + prof.gstin] : [],
    ['OUTWARD SALES REGISTER REPORT'],
    [],
    headers
  ].filter(r => r.length > 0);

  rawSalesData.forEach(s => {
    rows.push([
      formatDate(s.date),
      s.invoice_no || '',
      s.party_name || '',
      s.rst_no || '',
      s.vehicle_no || '',
      s.product || '',
      s.bags || 0,
      s.quantity_kg || 0,
      s.rate || 0,
      s.total || 0
    ]);
  });

  downloadCSV(`Sales_Register_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

// ============================================================
// 3. PURCHASE REGISTER
// ============================================================
async function loadPurchases() {
  try {
    const res = await fetch('/api/purchases');
    rawPurchasesData = await res.json();
    renderPurchasesTable(rawPurchasesData);
  } catch (err) {
    console.error('Failed to load purchases:', err);
  }
}

function renderPurchasesTable(purchases) {
  const tbody = document.getElementById('purchases-tbody');
  const tfoot = document.getElementById('purchases-tfoot');

  let totBags = 0;
  let totKg = 0;
  let totAmt = 0;

  tbody.innerHTML = purchases.map(p => {
    totBags += (p.bags || 0);
    totKg += (p.quantity_kg || 0);
    totAmt += (p.total || 0);

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-2 sm:p-3 text-slate-600 whitespace-nowrap">${formatDate(p.date)}</td>
        <td class="p-2 sm:p-3 font-bold text-slate-800">${p.invoice_no || '-'}</td>
        <td class="p-2 sm:p-3 font-semibold text-amber-700 cursor-pointer hover:underline" onclick="viewPartyLedger('${p.party_name}')">${p.party_name}</td>
        <td class="p-2 sm:p-3 text-slate-500">${p.rst_no || '-'}</td>
        <td class="p-2 sm:p-3 text-slate-600 font-mono text-[11px]">${p.vehicle_no || '-'}</td>
        <td class="p-2 sm:p-3 font-medium text-slate-800">${p.product}</td>
        <td class="p-2 sm:p-3 text-right font-medium">${p.bags ? p.bags.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono">${p.quantity_kg ? p.quantity_kg.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono">${p.rate ? p.rate.toLocaleString() : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-bold text-slate-800 whitespace-nowrap">${formatINR(p.total)}</td>
        <td class="p-2 sm:p-3 text-center space-x-1 whitespace-nowrap">
          <button onclick="showSlip('PURCHASE', ${p.id})" class="text-slate-600 hover:text-slate-900 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Print Inward Slip">
            <i class="fa-solid fa-receipt text-amber-600"></i>
          </button>
          <button onclick="openPurModalForEdit(${p.id})" class="text-blue-600 hover:text-blue-800 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Edit Purchase">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deletePurchase(${p.id})" class="text-rose-500 hover:text-rose-700 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Delete Purchase">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">No purchases recorded matching criteria</td></tr>';

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="6" class="p-3 text-right uppercase tracking-wider font-bold text-slate-600">Total (${purchases.length} Procurements):</td>
        <td class="p-3 text-right font-bold text-slate-800">${totBags.toLocaleString()}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800">${totKg.toLocaleString()} KG</td>
        <td></td>
        <td class="p-3 text-right font-mono font-black text-amber-700 whitespace-nowrap">${formatINR(totAmt)}</td>
        <td></td>
      </tr>
    `;
  }
}

function filterPurchasesTable() {
  const q = (document.getElementById('purchases-search').value || '').toLowerCase().trim();
  if (!q) {
    renderPurchasesTable(rawPurchasesData);
    return;
  }
  const filtered = rawPurchasesData.filter(p =>
    (p.party_name && p.party_name.toLowerCase().includes(q)) ||
    (p.invoice_no && p.invoice_no.toLowerCase().includes(q)) ||
    (p.vehicle_no && p.vehicle_no.toLowerCase().includes(q)) ||
    (p.rst_no && p.rst_no.toString().toLowerCase().includes(q)) ||
    (p.product && p.product.toLowerCase().includes(q)) ||
    (p.date && p.date.includes(q))
  );
  renderPurchasesTable(filtered);
}

function openPurModalForAdd() {
  document.getElementById('purchaseForm').reset();
  document.getElementById('pur_edit_id').value = '';
  document.getElementById('purModalTitle').innerText = 'Record Purchase (Inbound)';
  document.getElementById('purSubmitBtn').innerText = 'Save Purchase';
  document.getElementById('pur_calc_preview').innerText = '₹ 0.00';
  openModal('purchaseModal');
}

function openPurModalForEdit(id) {
  const pur = rawPurchasesData.find(p => p.id === id);
  if (!pur) return;

  document.getElementById('pur_edit_id').value = pur.id;
  document.getElementById('purModalTitle').innerText = `Edit Purchase (Inv: ${pur.invoice_no || '#'})`;
  document.getElementById('purSubmitBtn').innerText = 'Update Purchase';

  document.getElementById('pur_date').value = pur.date || '';
  document.getElementById('pur_inv').value = pur.invoice_no || '';
  document.getElementById('pur_party').value = pur.party_name || '';
  document.getElementById('pur_rst').value = pur.rst_no || '';
  document.getElementById('pur_veh').value = pur.vehicle_no || '';
  document.getElementById('pur_prod').value = pur.product || '';
  document.getElementById('pur_bags').value = pur.bags || '';
  document.getElementById('pur_qty').value = pur.quantity_kg || '';
  document.getElementById('pur_rate').value = pur.rate || '';

  calcPurTotal();
  openModal('purchaseModal');
}

function exportPurchasesCSV() {
  if (!rawPurchasesData || rawPurchasesData.length === 0) {
    alert('No purchases data to export.');
    return;
  }
  const prof = getBusinessProfile();
  const headers = ['Date', 'Invoice No', 'Supplier Name', 'RST No', 'Vehicle No', 'Product / Variety', 'Bags', 'Quantity (KG)', 'Rate (per 77KG)', 'Total (INR)'];
  const rows = [
    [prof.millName || 'Rice Sales & Stock ERP'],
    prof.address ? [prof.address + (prof.phone ? ' | Ph: ' + prof.phone : '')] : [],
    prof.gstin ? ['GSTIN: ' + prof.gstin] : [],
    ['INWARD PURCHASE REGISTER REPORT'],
    [],
    headers
  ].filter(r => r.length > 0);

  rawPurchasesData.forEach(p => {
    rows.push([
      formatDate(p.date),
      p.invoice_no || '',
      p.party_name || '',
      p.rst_no || '',
      p.vehicle_no || '',
      p.product || '',
      p.bags || 0,
      p.quantity_kg || 0,
      p.rate || 0,
      p.total || 0
    ]);
  });

  downloadCSV(`Purchase_Register_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

// ============================================================
// 4. PAYMENTS & CASH VIEW
// ============================================================
async function loadPayments() {
  try {
    const res = await fetch('/api/payments');
    rawPaymentsData = await res.json();
    renderPaymentsTable(rawPaymentsData);
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
}

function renderPaymentsTable(payments) {
  const tbody = document.getElementById('payments-tbody');
  const tfoot = document.getElementById('payments-tfoot');

  let totPaid = 0;
  let totRec = 0;

  tbody.innerHTML = payments.map(p => {
    if (p.type === 'PAID') totPaid += (p.amount || 0);
    else totRec += (p.amount || 0);

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-2 sm:p-3 text-slate-600 whitespace-nowrap">${formatDate(p.date)}</td>
        <td class="p-2 sm:p-3 font-semibold text-slate-800 cursor-pointer hover:underline" onclick="viewPartyLedger('${p.party_name}')">${p.party_name}</td>
        <td class="p-2 sm:p-3">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${p.type === 'PAID' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
            ${p.type === 'PAID' ? 'PAID (Supplier)' : 'RECEIVED (Customer)'}
          </span>
        </td>
        <td class="p-2 sm:p-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">${p.mode}</span>
        </td>
        <td class="p-2 sm:p-3 text-right font-bold text-slate-800 whitespace-nowrap">${formatINR(p.amount)}</td>
        <td class="p-2 sm:p-3 text-slate-500 text-xs">${p.remarks || '-'}</td>
        <td class="p-2 sm:p-3 text-center space-x-1 whitespace-nowrap">
          <button onclick="openPayModalForEdit(${p.id})" class="text-blue-600 hover:text-blue-800 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Edit Payment">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deletePayment(${p.id})" class="text-rose-500 hover:text-rose-700 p-1.5 sm:p-1 text-sm sm:text-xs rounded hover:bg-slate-100" title="Delete Payment">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No payments recorded matching criteria</td></tr>';

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="4" class="p-3 text-right uppercase tracking-wider font-bold text-slate-600">Total Payments:</td>
        <td class="p-3 text-right font-mono font-black text-slate-800 whitespace-nowrap">
          <span class="text-rose-600 block text-xs">Paid: ${formatINR(totPaid)}</span>
          <span class="text-emerald-600 block text-xs">Received: ${formatINR(totRec)}</span>
        </td>
        <td colspan="2"></td>
      </tr>
    `;
  }
}

function filterPaymentsTable() {
  const q = (document.getElementById('payments-search').value || '').toLowerCase().trim();
  if (!q) {
    renderPaymentsTable(rawPaymentsData);
    return;
  }
  const filtered = rawPaymentsData.filter(p =>
    (p.party_name && p.party_name.toLowerCase().includes(q)) ||
    (p.type && p.type.toLowerCase().includes(q)) ||
    (p.mode && p.mode.toLowerCase().includes(q)) ||
    (p.remarks && p.remarks.toLowerCase().includes(q)) ||
    (p.date && p.date.includes(q))
  );
  renderPaymentsTable(filtered);
}

function openPayModalForAdd() {
  document.getElementById('paymentForm').reset();
  document.getElementById('pay_edit_id').value = '';
  document.getElementById('payModalTitle').innerText = 'Record Payment';
  document.getElementById('paySubmitBtn').innerText = 'Save Entry';
  document.getElementById('pay_type_paid').checked = true;
  openModal('paymentModal');
}

function openPayModalForEdit(id) {
  const pay = rawPaymentsData.find(p => p.id === id);
  if (!pay) return;

  document.getElementById('pay_edit_id').value = pay.id;
  document.getElementById('payModalTitle').innerText = 'Edit Payment Entry';
  document.getElementById('paySubmitBtn').innerText = 'Update Entry';

  document.getElementById('pay_date').value = pay.date || '';
  document.getElementById('pay_party').value = pay.party_name || '';
  document.getElementById('pay_amount').value = pay.amount || '';
  document.getElementById('pay_mode').value = pay.mode || 'CASH';
  document.getElementById('pay_remarks').value = pay.remarks || '';

  if (pay.type === 'RECEIVED') {
    document.getElementById('pay_type_received').checked = true;
  } else {
    document.getElementById('pay_type_paid').checked = true;
  }

  openModal('paymentModal');
}

function exportPaymentsCSV() {
  if (!rawPaymentsData || rawPaymentsData.length === 0) {
    alert('No payments data to export.');
    return;
  }
  const headers = ['Date', 'Party Name', 'Action (PAID / RECEIVED)', 'Payment Mode', 'Amount (INR)', 'Remarks'];
  const rows = [headers];

  rawPaymentsData.forEach(p => {
    rows.push([
      formatDate(p.date),
      p.party_name || '',
      p.type || '',
      p.mode || '',
      p.amount || 0,
      p.remarks || ''
    ]);
  });

  downloadCSV(`Payments_Register_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

// ============================================================
// 5. PARTY STATEMENTS & MASTER OUTSTANDING SUMMARY
// ============================================================
let highlightedPartyIndex = -1;
let currentFilteredParties = [];
let rawLedgerTransactions = [];

function setPartySearchInputValue(party) {
  const input = document.getElementById('party-search-input');
  const hiddenSelect = document.getElementById('ledger-party-select');
  if (!party) return;
  if (hiddenSelect) hiddenSelect.value = party.name;
  if (input) {
    input.value = `${party.name} (${party.type === 'Customer' ? 'Customer' : 'Supplier'} - ${formatINR(party.balance)})`;
  }
}

function openPartySearchDropdown() {
  const dropdown = document.getElementById('party-search-dropdown');
  const arrow = document.getElementById('party-search-arrow');
  if (!dropdown) return;
  dropdown.classList.remove('hidden');
  if (arrow) arrow.className = 'fa-solid fa-chevron-up text-[10px] transition-transform duration-200';
  highlightedPartyIndex = -1;
  const input = document.getElementById('party-search-input');
  const val = input ? input.value : '';
  const cleanVal = val.includes('(') ? val.split('(')[0].trim() : val.trim();
  onPartySearchInput(cleanVal, true);
}

function closePartySearchDropdown() {
  const dropdown = document.getElementById('party-search-dropdown');
  const arrow = document.getElementById('party-search-arrow');
  if (dropdown) dropdown.classList.add('hidden');
  if (arrow) arrow.className = 'fa-solid fa-chevron-down text-[10px] transition-transform duration-200';
  highlightedPartyIndex = -1;
}

function togglePartySearchDropdown() {
  const dropdown = document.getElementById('party-search-dropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    closePartySearchDropdown();
  } else {
    const input = document.getElementById('party-search-input');
    if (input) {
      input.focus();
      input.select();
    }
    openPartySearchDropdown();
  }
}

function onPartySearchInput(query, showAllIfEmpty = false) {
  const q = (query || '').toLowerCase().trim();
  currentFilteredParties = allParties.filter(p => {
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });
  highlightedPartyIndex = -1;
  renderPartySearchDropdown(currentFilteredParties, q);
}

function renderPartySearchDropdown(parties, query) {
  const dropdown = document.getElementById('party-search-dropdown');
  if (!dropdown) return;

  if (parties.length === 0) {
    dropdown.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400">
        <i class="fa-solid fa-user-slash text-slate-300 text-lg mb-1 block"></i>
        No party found matching "<strong>${query}</strong>"
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = parties.map((p, idx) => {
    const isCust = p.type === 'Customer';
    
    // Highlight matching letters
    let displayName = p.name;
    if (query) {
      const reg = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      displayName = p.name.replace(reg, '<span class="bg-amber-200 text-slate-900 px-0.5 rounded">$1</span>');
    }

    return `
      <div 
        id="party-opt-${idx}"
        onclick="selectPartyFromSearch('${p.name}')"
        class="party-search-item px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition group border-b border-slate-100 last:border-b-0"
      >
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isCust ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${isCust ? 'C' : 'S'}
          </div>
          <div>
            <div class="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition">${displayName}</div>
            <div class="text-[10px] text-slate-400">
              <span class="${isCust ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}">${p.type}</span>
              ${p.phone ? ` • <i class="fa-solid fa-phone text-[9px]"></i> ${p.phone}` : ''}
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-black font-mono ${p.balance >= 0 ? (isCust ? 'text-emerald-700' : 'text-amber-700') : 'text-slate-600'}">
            ${formatINR(p.balance)}
          </div>
          <div class="text-[9px] font-semibold text-slate-400">
            ${isCust ? (p.balance >= 0 ? 'Receivable' : 'Advance Recd') : (p.balance >= 0 ? 'Payable' : 'Advance Paid')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  dropdown.classList.remove('hidden');
}

function selectPartyFromSearch(partyName) {
  const party = allParties.find(p => p.name === partyName);
  if (!party) return;

  setPartySearchInputValue(party);
  closePartySearchDropdown();
  loadPartyLedger();
}

function handlePartySearchKeydown(e) {
  const dropdown = document.getElementById('party-search-dropdown');
  const isHidden = !dropdown || dropdown.classList.contains('hidden');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (isHidden) {
      openPartySearchDropdown();
      return;
    }
    if (currentFilteredParties.length > 0) {
      highlightedPartyIndex = (highlightedPartyIndex + 1) % currentFilteredParties.length;
      updatePartyHighlight();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (isHidden) {
      openPartySearchDropdown();
      return;
    }
    if (currentFilteredParties.length > 0) {
      highlightedPartyIndex = (highlightedPartyIndex - 1 + currentFilteredParties.length) % currentFilteredParties.length;
      updatePartyHighlight();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlightedPartyIndex >= 0 && highlightedPartyIndex < currentFilteredParties.length) {
      selectPartyFromSearch(currentFilteredParties[highlightedPartyIndex].name);
    } else if (currentFilteredParties.length > 0) {
      selectPartyFromSearch(currentFilteredParties[0].name);
    }
  } else if (e.key === 'Escape') {
    closePartySearchDropdown();
  }
}

function updatePartyHighlight() {
  document.querySelectorAll('.party-search-item').forEach((el, idx) => {
    if (idx === highlightedPartyIndex) {
      el.classList.add('bg-emerald-50', 'ring-1', 'ring-emerald-300');
      el.scrollIntoView({ block: 'nearest' });
    } else {
      el.classList.remove('bg-emerald-50', 'ring-1', 'ring-emerald-300');
    }
  });
}

// Close party dropdown on click outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('party-search-container');
  if (container && !container.contains(e.target)) {
    closePartySearchDropdown();
  }
});

function switchLedgerSubTab(mode) {
  currentLedgerSubTab = mode;
  const indView = document.getElementById('ledger-subview-individual');
  const sumView = document.getElementById('ledger-subview-summary');
  const indBtn = document.getElementById('subtab-individual');
  const sumBtn = document.getElementById('subtab-summary');

  if (mode === 'individual') {
    if (indView) indView.classList.remove('hidden');
    if (sumView) sumView.classList.add('hidden');
    indBtn.className = 'px-2.5 sm:px-3 py-2 rounded-lg bg-white text-slate-800 shadow-sm flex items-center justify-center text-center';
    sumBtn.className = 'px-2.5 sm:px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 flex items-center justify-center text-center';
    loadPartyLedger();
  } else {
    if (indView) indView.classList.add('hidden');
    if (sumView) sumView.classList.remove('hidden');
    sumBtn.className = 'px-2.5 sm:px-3 py-2 rounded-lg bg-white text-slate-800 shadow-sm flex items-center justify-center text-center';
    indBtn.className = 'px-2.5 sm:px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 flex items-center justify-center text-center';
    loadOutstandingSummary();
  }
}

async function loadLedgersView() {
  await loadPartyDropdowns();
  const select = document.getElementById('ledger-party-select');
  if (currentLedgerSubTab === 'summary') {
    loadOutstandingSummary();
  } else {
    if (select && select.value) {
      loadPartyLedger();
    } else if (allParties.length > 0) {
      setPartySearchInputValue(allParties[0]);
      loadPartyLedger();
    }
  }
}

async function loadPartyLedger() {
  const select = document.getElementById('ledger-party-select');
  const partyName = select ? select.value : '';
  if (!partyName) return;

  const fromDate = document.getElementById('ledger-from-date')?.value || '';
  const toDate = document.getElementById('ledger-to-date')?.value || '';

  try {
    let url = `/api/ledger?party=${encodeURIComponent(partyName)}`;
    if (fromDate) url += `&from=${encodeURIComponent(fromDate)}`;
    if (toDate) url += `&to=${encodeURIComponent(toDate)}`;

    const res = await fetch(url);
    const data = await res.json();
    rawLedgerData = data;
    currentLedgerParty = data.party;
    rawLedgerTransactions = data.transactions || [];

    // Make sure search input displays current party with exact balance
    setPartySearchInputValue({ ...data.party, balance: data.currentBalance });

    // Populate business letterhead
    const headerContainer = document.getElementById('ledger-business-header-container');
    if (headerContainer) {
      headerContainer.innerHTML = renderBusinessHeader({
        title: 'PARTY ACCOUNT STATEMENT',
        subtitle: fromDate && toDate ? `Statement Period: ${formatDate(fromDate)} to ${formatDate(toDate)}` : (fromDate ? `Statement From: ${formatDate(fromDate)}` : (toDate ? `Statement To: ${formatDate(toDate)}` : '')),
        showEditLink: true
      });
    }

    document.getElementById('ledger-party-name').innerText = data.party.name;
    const badge = document.getElementById('ledger-party-badge');
    badge.innerText = data.party.type;
    badge.className = data.party.type === 'Customer' 
      ? 'px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase' 
      : 'px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 uppercase';

    // Opening Balance indicator badge
    const opBadge = document.getElementById('ledger-opening-badge');
    if (opBadge) {
      if (data.party.opening_balance && data.party.opening_balance !== 0) {
        opBadge.innerHTML = `<span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold"><i class="fa-solid fa-clock-rotate-left mr-1 text-amber-600"></i>Opening: ${formatINR(data.party.opening_balance)}${data.party.opening_date ? ' (' + formatDate(data.party.opening_date) + ')' : ''}</span>`;
      } else {
        opBadge.innerHTML = `<span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[11px]">Opening: ₹ 0.00</span>`;
      }
    }

    const balEl = document.getElementById('ledger-party-balance');
    balEl.innerText = formatINR(data.currentBalance);
    balEl.className = data.currentBalance >= 0 ? 'text-2xl font-black text-emerald-600 mt-0.5' : 'text-2xl font-black text-rose-600 mt-0.5';

    document.getElementById('ledger-balance-note').innerText = data.party.type === 'Customer'
      ? (data.currentBalance >= 0 ? 'Receivable from Customer' : 'Advance received from Customer')
      : (data.currentBalance >= 0 ? 'Payable to Supplier' : 'Advance paid to Supplier');

    // Reset statement search filter
    if (document.getElementById('statement-filter-input')) {
      document.getElementById('statement-filter-input').value = '';
    }

    renderStatementRows(rawLedgerTransactions);

  } catch (err) {
    console.error('Failed to load party ledger:', err);
  }
}

function renderStatementRows(transactions) {
  let totDebit = 0;
  let totCredit = 0;

  const tbody = document.getElementById('ledger-tbody');
  tbody.innerHTML = (transactions || []).map(t => {
    const isOpening = t.type === 'OPENING';
    const rowBg = isOpening ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50 transition';
    totDebit += (t.debit || 0);
    totCredit += (t.credit || 0);

    return `
    <tr class="${rowBg}">
      <td class="p-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">${formatDate(t.date)}</td>
      <td class="p-2.5 border-r border-slate-200 font-medium ${isOpening ? 'text-amber-900 font-bold' : 'text-slate-800'}">
        ${isOpening ? '<i class="fa-solid fa-bookmark text-amber-600 mr-1.5"></i>' : ''}${t.description}
      </td>
      <td class="p-2.5 border-r border-slate-200 text-right font-mono ${t.debit > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}">${t.debit > 0 ? formatINR(t.debit) : '-'}</td>
      <td class="p-2.5 border-r border-slate-200 text-right font-mono ${t.credit > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}">${t.credit > 0 ? formatINR(t.credit) : '-'}</td>
      <td class="p-2.5 text-right font-mono font-black ${isOpening ? 'text-amber-800' : 'text-slate-900'} whitespace-nowrap">${formatINR(t.balance)}</td>
    </tr>
    `;
  }).join('') || '<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium">No transactions found matching criteria</td></tr>';

  // Summary footer for ledger statement
  const tfoot = document.getElementById('ledger-tfoot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="2" class="p-2.5 text-right uppercase tracking-wider font-bold text-slate-600">Total Period Summary:</td>
        <td class="p-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">${formatINR(totDebit)}</td>
        <td class="p-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">${formatINR(totCredit)}</td>
        <td class="p-2.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">${formatINR(rawLedgerData ? rawLedgerData.currentBalance : 0)}</td>
      </tr>
    `;
  }
}

function filterStatementTransactions() {
  const q = (document.getElementById('statement-filter-input')?.value || '').toLowerCase().trim();
  if (!rawLedgerTransactions) return;

  if (!q) {
    renderStatementRows(rawLedgerTransactions);
    return;
  }

  const filtered = rawLedgerTransactions.filter(t =>
    (t.description && t.description.toLowerCase().includes(q)) ||
    (t.date && t.date.includes(q)) ||
    (t.debit && t.debit.toString().includes(q)) ||
    (t.credit && t.credit.toString().includes(q))
  );

  renderStatementRows(filtered);
}

function resetLedgerDates() {
  if (document.getElementById('ledger-from-date')) document.getElementById('ledger-from-date').value = '';
  if (document.getElementById('ledger-to-date')) document.getElementById('ledger-to-date').value = '';
  loadPartyLedger();
}

function exportPartyLedgerCSV() {
  if (!rawLedgerData || !rawLedgerData.transactions || rawLedgerData.transactions.length === 0) {
    alert('No statement data to export.');
    return;
  }
  const prof = getBusinessProfile();
  const p = rawLedgerData.party;
  const headers = ['Date', 'Particulars / Description', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)'];
  const rows = [
    [prof.millName || 'Rice Sales & Stock ERP'],
    prof.address ? [prof.address + (prof.phone ? ' | Ph: ' + prof.phone : '')] : [],
    prof.gstin ? ['GSTIN: ' + prof.gstin] : [],
    [`PARTY ACCOUNT STATEMENT: ${p.name} (${p.type})`],
    [`Opening Balance: ${formatINR(p.opening_balance)} (As on: ${p.opening_date || '-'})`],
    [`Current Balance: ${formatINR(rawLedgerData.currentBalance)}`],
    [],
    headers
  ].filter(r => r.length > 0);

  rawLedgerData.transactions.forEach(t => {
    rows.push([
      formatDate(t.date),
      t.description,
      t.debit || 0,
      t.credit || 0,
      t.balance || 0
    ]);
  });

  downloadCSV(`Statement_${p.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

// Master Outstanding Summary (Mirroring Excel Ledger Summary)
async function loadOutstandingSummary() {
  try {
    const res = await fetch('/api/outstanding-summary');
    rawSummaryData = await res.json();
    renderSummaryTable(rawSummaryData);
  } catch (err) {
    console.error('Failed to load outstanding summary:', err);
  }
}

function renderSummaryTable(parties) {
  const tbody = document.getElementById('summary-tbody');
  const tfoot = document.getElementById('summary-tfoot');

  let totReceivable = 0;
  let totPayable = 0;
  let totOpening = 0;
  let totTurnover = 0;

  tbody.innerHTML = parties.map(p => {
    const isCust = p.type === 'Customer';
    const isPayable = !isCust && p.balance > 0;
    const isReceivable = isCust && p.balance > 0;

    totOpening += (p.opening_balance || 0);
    totTurnover += (p.total_turnover || 0);
    if (isReceivable) totReceivable += p.balance;
    if (isPayable) totPayable += p.balance;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-2 sm:p-3 font-bold text-slate-800 cursor-pointer hover:underline sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap" onclick="viewPartyLedger('${p.name}')">
          ${p.name}
          ${p.phone ? `<span class="block text-[11px] font-normal text-slate-400"><i class="fa-solid fa-phone text-[10px] mr-1"></i>${p.phone}</span>` : ''}
        </td>
        <td class="p-2 sm:p-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isCust ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${p.type}
          </span>
        </td>
        <td class="p-2 sm:p-3 text-right font-mono text-slate-600">${p.opening_balance ? formatINR(p.opening_balance) : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono text-slate-700">${formatINR(p.total_turnover)}</td>
        <td class="p-2 sm:p-3 text-right font-mono text-slate-700">${formatINR(isCust ? p.total_received : p.total_paid)}</td>
        <td class="p-2 sm:p-3 text-right font-mono font-bold ${isPayable ? 'text-amber-700' : 'text-slate-400'}">${isPayable ? formatINR(p.balance) : '-'}</td>
        <td class="p-2 sm:p-3 text-right font-mono font-bold ${isReceivable ? 'text-emerald-700' : 'text-slate-400'}">${isReceivable ? formatINR(p.balance) : '-'}</td>
        <td class="p-2 sm:p-3 text-center space-x-1 whitespace-nowrap">
          <button onclick="viewPartyLedger('${p.name}')" class="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm" title="View Full Ledger">
            Statement
          </button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">No parties found</td></tr>';

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="2" class="p-3 text-right uppercase tracking-wider font-bold text-slate-600">Grand Total Outstanding:</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800">${formatINR(totOpening)}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800">${formatINR(totTurnover)}</td>
        <td></td>
        <td class="p-3 text-right font-mono font-black text-amber-700 whitespace-nowrap">${formatINR(totPayable)}</td>
        <td class="p-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">${formatINR(totReceivable)}</td>
        <td></td>
      </tr>
    `;
  }
}

function filterSummaryTable() {
  const q = (document.getElementById('summary-search').value || '').toLowerCase().trim();
  if (!q) {
    renderSummaryTable(rawSummaryData);
    return;
  }
  const filtered = rawSummaryData.filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.type && p.type.toLowerCase().includes(q)) ||
    (p.phone && p.phone.includes(q))
  );
  renderSummaryTable(filtered);
}

function exportMasterSummaryCSV() {
  if (!rawSummaryData || rawSummaryData.length === 0) {
    alert('No summary data to export.');
    return;
  }
  const headers = ['Party Type', 'Party Name', 'Phone', 'Opening Balance (INR)', 'Total Business (INR)', 'Total Paid/Received (INR)', 'Net Payable (INR)', 'Net Receivable (INR)', 'Last Transaction Date'];
  const rows = [headers];

  rawSummaryData.forEach(p => {
    const isCust = p.type === 'Customer';
    rows.push([
      p.type,
      p.name,
      p.phone || '',
      p.opening_balance || 0,
      p.total_turnover || 0,
      isCust ? p.total_received : p.total_paid,
      !isCust && p.balance > 0 ? p.balance : 0,
      isCust && p.balance > 0 ? p.balance : 0,
      formatDate(p.last_date)
    ]);
  });

  downloadCSV(`Master_Ledger_Summary_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

function viewPartyLedger(partyName) {
  switchTab('ledgers');
  switchLedgerSubTab('individual');
  const found = allParties.find(p => p.name === partyName);
  if (found) {
    setPartySearchInputValue(found);
  } else {
    const input = document.getElementById('party-search-input');
    const select = document.getElementById('ledger-party-select');
    if (input) input.value = partyName;
    if (select) select.value = partyName;
  }
  setTimeout(() => {
    loadPartyLedger();
  }, 100);
}

// ============================================================
// 6. GODOWN STOCK
// ============================================================
async function loadStock() {
  try {
    const res = await fetch('/api/stock');
    const stock = await res.json();
    const tbody = document.getElementById('stock-tbody');

    tbody.innerHTML = stock.map(s => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-2.5 sm:p-3 font-bold text-slate-800 text-xs sm:text-sm sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">${s.product}</td>
        <td class="p-2.5 sm:p-3 text-right font-mono font-medium">${s.bought_bags.toLocaleString()}</td>
        <td class="p-2.5 sm:p-3 text-right font-mono text-slate-500">${s.bought_kg.toLocaleString()}</td>
        <td class="p-2.5 sm:p-3 text-right font-mono font-medium">${s.sold_bags.toLocaleString()}</td>
        <td class="p-2.5 sm:p-3 text-right font-mono text-slate-500">${s.sold_kg.toLocaleString()}</td>
        <td class="p-2.5 sm:p-3 text-right font-mono font-black text-xs sm:text-sm ${s.current_bags >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${s.current_bags.toLocaleString()} Bags</td>
        <td class="p-2.5 sm:p-3 text-right font-mono font-bold text-slate-700">${s.current_kg.toLocaleString()} KG</td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="p-8 text-center text-slate-400">No stock data yet</td></tr>';
  } catch (err) {
    console.error('Failed to load stock:', err);
  }
}

// ============================================================
// 7. DROPDOWNS & AUTOCOMPLETE
// ============================================================
async function loadPartyDropdowns() {
  try {
    const res = await fetch('/api/parties');
    allParties = await res.json();

    const ledgerSelect = document.getElementById('ledger-party-select');
    const custDatalist = document.getElementById('party_list_customers');
    const suppDatalist = document.getElementById('party_list_suppliers');
    const allDatalist = document.getElementById('all_party_list');

    if (custDatalist) {
      custDatalist.innerHTML = allParties.filter(p => p.type === 'Customer').map(p => `<option value="${p.name}">`).join('');
    }
    if (suppDatalist) {
      suppDatalist.innerHTML = allParties.filter(p => p.type === 'Supplier').map(p => `<option value="${p.name}">`).join('');
    }
    if (allDatalist) {
      allDatalist.innerHTML = allParties.map(p => `<option value="${p.name}">`).join('');
    }
    if (ledgerSelect) {
      const currentVal = ledgerSelect.value;
      if (currentVal) {
        const found = allParties.find(p => p.name === currentVal);
        if (found) setPartySearchInputValue(found);
      } else if (allParties.length > 0) {
        setPartySearchInputValue(allParties[0]);
      }
    }
  } catch (err) {
    console.error('Failed to load party dropdowns:', err);
  }
}

// Live Calculations (Odisha / AP Rice Formula: Qty / 77 * Rate)
function calcSaleTotal() {
  const qty = parseFloat(document.getElementById('sale_qty').value) || 0;
  const rate = parseFloat(document.getElementById('sale_rate').value) || 0;
  const total = (qty / 77.0) * rate;
  document.getElementById('sale_calc_preview').innerText = formatINR(total);
}

function calcPurTotal() {
  const qty = parseFloat(document.getElementById('pur_qty').value) || 0;
  const rate = parseFloat(document.getElementById('pur_rate').value) || 0;
  const total = (qty / 77.0) * rate;
  document.getElementById('pur_calc_preview').innerText = formatINR(total);
}

// Modal Handlers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
  setDefaultDates();
  loadPartyDropdowns();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    // Check if any other modal is still active
    const activeModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    if (activeModals.length === 0) {
      document.body.classList.remove('overflow-hidden');
    }
  }
}

// ============================================================
// 8. CRUD SUBMISSIONS (ADD & EDIT)
// ============================================================
async function submitSale(e) {
  e.preventDefault();
  const editId = document.getElementById('sale_edit_id').value;
  const data = {
    date: document.getElementById('sale_date').value,
    invoice_no: document.getElementById('sale_inv').value.trim(),
    party_name: document.getElementById('sale_party').value.trim().toUpperCase(),
    rst_no: document.getElementById('sale_rst').value.trim(),
    vehicle_no: document.getElementById('sale_veh').value.trim().toUpperCase(),
    product: document.getElementById('sale_prod').value.trim().toUpperCase(),
    bags: parseInt(document.getElementById('sale_bags').value) || 0,
    quantity_kg: parseFloat(document.getElementById('sale_qty').value) || 0,
    rate: parseFloat(document.getElementById('sale_rate').value) || 0
  };

  try {
    const url = editId ? `/api/sales/${editId}` : '/api/sales';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeModal('salesModal');
      document.getElementById('salesForm').reset();
      await loadSales();
      await loadPartyDropdowns();
      if (currentTab === 'dashboard') loadDashboard();
      if (currentTab === 'ledgers') loadPartyLedger();
    } else {
      const err = await res.json();
      alert('Error saving sale: ' + (err.error || 'Failed'));
    }
  } catch (err) {
    alert('Error saving sale: ' + err.message);
  }
}

async function submitPurchase(e) {
  e.preventDefault();
  const editId = document.getElementById('pur_edit_id').value;
  const data = {
    date: document.getElementById('pur_date').value,
    invoice_no: document.getElementById('pur_inv').value.trim(),
    party_name: document.getElementById('pur_party').value.trim().toUpperCase(),
    rst_no: document.getElementById('pur_rst').value.trim(),
    vehicle_no: document.getElementById('pur_veh').value.trim().toUpperCase(),
    product: document.getElementById('pur_prod').value.trim().toUpperCase(),
    bags: parseInt(document.getElementById('pur_bags').value) || 0,
    quantity_kg: parseFloat(document.getElementById('pur_qty').value) || 0,
    rate: parseFloat(document.getElementById('pur_rate').value) || 0
  };

  try {
    const url = editId ? `/api/purchases/${editId}` : '/api/purchases';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeModal('purchaseModal');
      document.getElementById('purchaseForm').reset();
      await loadPurchases();
      await loadPartyDropdowns();
      if (currentTab === 'dashboard') loadDashboard();
      if (currentTab === 'ledgers') loadPartyLedger();
    } else {
      const err = await res.json();
      alert('Error saving purchase: ' + (err.error || 'Failed'));
    }
  } catch (err) {
    alert('Error saving purchase: ' + err.message);
  }
}

async function submitPayment(e) {
  e.preventDefault();
  const editId = document.getElementById('pay_edit_id').value;
  const typeEl = document.querySelector('input[name="pay_type"]:checked');
  const data = {
    date: document.getElementById('pay_date').value,
    party_name: document.getElementById('pay_party').value.trim().toUpperCase(),
    type: typeEl ? typeEl.value : 'PAID',
    mode: document.getElementById('pay_mode').value,
    amount: parseFloat(document.getElementById('pay_amount').value) || 0,
    remarks: document.getElementById('pay_remarks').value.trim()
  };

  try {
    const url = editId ? `/api/payments/${editId}` : '/api/payments';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeModal('paymentModal');
      document.getElementById('paymentForm').reset();
      await loadPayments();
      await loadPartyDropdowns();
      if (currentTab === 'dashboard') loadDashboard();
      if (currentTab === 'ledgers') loadPartyLedger();
    } else {
      const err = await res.json();
      alert('Error saving payment: ' + (err.error || 'Failed'));
    }
  } catch (err) {
    alert('Error saving payment: ' + err.message);
  }
}

// Delete actions
async function deleteSale(id) {
  if (!confirm('Are you sure you want to delete this sale entry?')) return;
  await fetch(`/api/sales/${id}`, { method: 'DELETE' });
  loadSales();
  loadPartyDropdowns();
}

async function deletePurchase(id) {
  if (!confirm('Are you sure you want to delete this purchase entry?')) return;
  await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
  loadPurchases();
  loadPartyDropdowns();
}

async function deletePayment(id) {
  if (!confirm('Are you sure you want to delete this payment entry?')) return;
  await fetch(`/api/payments/${id}`, { method: 'DELETE' });
  loadPayments();
  loadPartyDropdowns();
}

// WhatsApp Share
function shareWhatsApp() {
  const partyName = document.getElementById('ledger-party-name').innerText;
  const balance = document.getElementById('ledger-party-balance').innerText;
  const note = document.getElementById('ledger-balance-note').innerText;
  const msg = `Namaste ${partyName},\n\nThis is from Rice Mill Accounts.\nYour current account balance is: *${balance}* (${note}).\n\nPlease let us know if you have any questions.\nThank you!`;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ============================================================
// 9. OPENING BALANCE & PARTY MODALS
// ============================================================
function openOpeningBalanceModal() {
  const select = document.getElementById('ledger-party-select');
  const partyName = select ? select.value : '';
  if (!partyName) {
    alert('Please select a party first.');
    return;
  }
  
  document.getElementById('op_party_name').value = partyName;
  const partyObj = currentLedgerParty || allParties.find(p => p.name === partyName);
  
  if (partyObj) {
    document.getElementById('op_balance_amt').value = partyObj.opening_balance ? partyObj.opening_balance : '';
    document.getElementById('op_date').value = partyObj.opening_date ? partyObj.opening_date : '';
  } else {
    document.getElementById('op_balance_amt').value = '';
    document.getElementById('op_date').value = '';
  }
  openModal('opBalModal');
}

async function removeOpeningBalance() {
  const partyName = document.getElementById('op_party_name').value.trim();
  if (!partyName) return;
  if (!confirm(`Are you sure you want to remove the opening balance for ${partyName}? It will be reset to ₹0.`)) {
    return;
  }
  document.getElementById('op_balance_amt').value = '0';
  document.getElementById('op_date').value = '';
  
  const fakeEvent = { preventDefault: () => {} };
  await submitOpeningBalance(fakeEvent);
}

async function submitOpeningBalance(e) {
  e.preventDefault();
  const partyName = document.getElementById('op_party_name').value.trim();
  const opBal = parseFloat(document.getElementById('op_balance_amt').value) || 0;
  const opDate = document.getElementById('op_date').value;

  try {
    const res = await fetch('/api/parties/opening-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party_name: partyName,
        opening_balance: opBal,
        opening_date: opDate
      })
    });

    if (res.ok) {
      closeModal('opBalModal');
      await loadPartyDropdowns();
      await loadPartyLedger();
      if (currentTab === 'dashboard') loadDashboard();
      if (currentLedgerSubTab === 'summary') loadOutstandingSummary();
    } else {
      const err = await res.json();
      alert('Error updating opening balance: ' + (err.error || 'Failed'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function submitNewParty(e) {
  e.preventDefault();
  const typeEl = document.querySelector('input[name="new_party_type"]:checked');
  const partyType = typeEl ? typeEl.value : 'Customer';
  const name = document.getElementById('new_party_name').value.trim().toUpperCase();
  const opBal = parseFloat(document.getElementById('new_party_op_bal').value) || 0;
  const opDate = document.getElementById('new_party_op_date').value;
  const phone = document.getElementById('new_party_phone').value.trim();

  if (!name) {
    alert('Please enter party name.');
    return;
  }

  try {
    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: partyType,
        opening_balance: opBal,
        opening_date: opDate,
        phone
      })
    });

    if (res.ok) {
      closeModal('partyModal');
      document.getElementById('partyForm').reset();
      await loadPartyDropdowns();
      viewPartyLedger(name);
    } else {
      const err = await res.json();
      alert('Error adding party: ' + (err.error || 'Failed'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ============================================================
// ============================================================
// 10. DELIVERY SLIP / WEIGHMENT BILL PRINT & REGISTER PRINT
// ============================================================
function showSlip(type, id) {
  const item = (type === 'SALE' ? rawSalesData : rawPurchasesData).find(x => x.id === id);
  if (!item) return;

  currentSlipState = { type, id };
  const isSale = type === 'SALE';
  const container = document.getElementById('slip-print-content');

  const letterhead = renderBusinessHeader({
    title: isSale ? 'OUTWARD SALES DELIVERY CHALLAN / INVOICE' : 'INWARD PURCHASE WEIGHMENT RECEIPT / BILL',
    showEditLink: true
  });

  container.innerHTML = `
    ${letterhead}

    <div class="grid grid-cols-2 gap-2 text-[11px] pt-3 pb-2 border-b border-slate-200">
      <div><span class="text-slate-500 font-semibold">Date:</span> <strong>${formatDate(item.date)}</strong></div>
      <div class="text-right"><span class="text-slate-500 font-semibold">Bill / Invoice:</span> <strong>${item.invoice_no || '-'}</strong></div>
      <div><span class="text-slate-500 font-semibold">${isSale ? 'Customer' : 'Supplier'}:</span> <strong class="text-[#0F4C3A]">${item.party_name}</strong></div>
      <div class="text-right"><span class="text-slate-500 font-semibold">Party Type:</span> <strong>${isSale ? 'Buyer (Customer)' : 'Seller (Supplier)'}</strong></div>
      <div><span class="text-slate-500 font-semibold">RST (Weighment):</span> <strong>${item.rst_no || '-'}</strong></div>
      <div class="text-right"><span class="text-slate-500 font-semibold">Vehicle No:</span> <strong class="font-mono">${item.vehicle_no || '-'}</strong></div>
    </div>

    <div class="py-2.5">
      <table class="w-full text-[11px]">
        <thead>
          <tr class="text-slate-600 border-b border-slate-300 font-bold bg-slate-50">
            <th class="text-left py-1.5 px-2">Item / Rice Variety</th>
            <th class="text-right py-1.5 px-2">Bags</th>
            <th class="text-right py-1.5 px-2">Weight (KG)</th>
            <th class="text-right py-1.5 px-2">Rate (77KG)</th>
            <th class="text-right py-1.5 px-2">Amount (₹)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr>
            <td class="font-bold py-2 px-2 text-slate-800">${item.product}</td>
            <td class="text-right py-2 px-2">${item.bags ? item.bags.toLocaleString() : '-'}</td>
            <td class="text-right py-2 px-2 font-mono">${item.quantity_kg ? item.quantity_kg.toLocaleString() : '-'}</td>
            <td class="text-right py-2 px-2 font-mono">${item.rate ? item.rate.toLocaleString() : '-'}</td>
            <td class="text-right py-2 px-2 font-bold font-mono text-slate-900">${formatINR(item.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-xs font-bold my-2">
      <span class="uppercase tracking-wider text-slate-700">Net Payable Amount:</span>
      <span class="text-base font-black text-[#0F4C3A] font-mono">${formatINR(item.total)}</span>
    </div>

    <div class="pt-6 flex justify-between text-[10px] text-slate-500 border-t border-slate-200 mt-4">
      <div class="text-center">
        <p class="border-t border-dashed border-slate-400 pt-1 px-4">Party / Driver Signature</p>
      </div>
      <div class="text-center">
        <p class="border-t border-dashed border-slate-400 pt-1 px-4">Authorized Signatory</p>
      </div>
    </div>
  `;

  openModal('slipModal');
}

function printSlip() {
  const container = document.getElementById('slip-print-content');
  if (!container) return;

  // Set print-target only on slip-print-content
  document.querySelectorAll('.print-target').forEach(el => {
    if (el.id !== 'slip-print-content') el.classList.remove('print-target');
  });
  container.classList.add('print-target');

  window.print();
}

function printRegister(type) {
  const isSale = type === 'sales';
  const data = isSale ? rawSalesData : rawPurchasesData;
  const container = document.getElementById('register-print-content');
  const titleEl = document.getElementById('reg-print-modal-title');

  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-print text-emerald-600 mr-2"></i> ${isSale ? 'Sales Register' : 'Purchase Register'} Print Preview`;
  }

  const searchVal = document.getElementById(isSale ? 'sales-search' : 'purchases-search')?.value.trim();
  const filterSubtitle = searchVal ? `Filter: "${escapeHtml(searchVal)}" • Total ${data.length} records` : `Total ${data.length} recorded entries as of ${formatDate(new Date().toISOString().split('T')[0])}`;

  const letterhead = renderBusinessHeader({
    title: isSale ? 'OUTWARD SALES REGISTER REPORT' : 'INWARD PURCHASE REGISTER REPORT',
    subtitle: filterSubtitle,
    showEditLink: true
  });

  let totBags = 0;
  let totKg = 0;
  let totAmt = 0;

  const rowsHtml = data.map((item, idx) => {
    totBags += (item.bags || 0);
    totKg += (item.quantity_kg || 0);
    totAmt += (item.total || 0);

    return `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
        <td class="p-1.5 border-b border-slate-200 text-slate-600 whitespace-nowrap">${formatDate(item.date)}</td>
        <td class="p-1.5 border-b border-slate-200 font-bold">${item.invoice_no || '-'}</td>
        <td class="p-1.5 border-b border-slate-200 font-semibold">${item.party_name}</td>
        <td class="p-1.5 border-b border-slate-200 text-slate-500">${item.rst_no || '-'}</td>
        <td class="p-1.5 border-b border-slate-200 font-mono text-[10px]">${item.vehicle_no || '-'}</td>
        <td class="p-1.5 border-b border-slate-200">${item.product}</td>
        <td class="p-1.5 border-b border-slate-200 text-right">${item.bags ? item.bags.toLocaleString() : '-'}</td>
        <td class="p-1.5 border-b border-slate-200 text-right font-mono">${item.quantity_kg ? item.quantity_kg.toLocaleString() : '-'}</td>
        <td class="p-1.5 border-b border-slate-200 text-right font-mono">${item.rate ? item.rate.toLocaleString() : '-'}</td>
        <td class="p-1.5 border-b border-slate-200 text-right font-bold font-mono">${formatINR(item.total)}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    ${letterhead}

    <div class="my-3 overflow-x-auto">
      <table class="w-full text-[11px] border border-slate-300">
        <thead class="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
          <tr>
            <th class="p-1.5 text-left">Date</th>
            <th class="p-1.5 text-left">Inv #</th>
            <th class="p-1.5 text-left">${isSale ? 'Customer' : 'Supplier'}</th>
            <th class="p-1.5 text-left">RST #</th>
            <th class="p-1.5 text-left">Vehicle #</th>
            <th class="p-1.5 text-left">Product</th>
            <th class="p-1.5 text-right">Bags</th>
            <th class="p-1.5 text-right">Net Wt (KG)</th>
            <th class="p-1.5 text-right">Rate</th>
            <th class="p-1.5 text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" class="p-4 text-center text-slate-400">No records found</td></tr>'}
        </tbody>
        <tfoot class="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
          <tr>
            <td colspan="6" class="p-2 text-right uppercase tracking-wider">Total (${data.length} records):</td>
            <td class="p-2 text-right">${totBags.toLocaleString()}</td>
            <td class="p-2 text-right font-mono">${totKg.toLocaleString()} KG</td>
            <td></td>
            <td class="p-2 text-right font-mono text-[#0F4C3A] font-black">${formatINR(totAmt)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="pt-4 flex justify-between text-[10px] text-slate-500 border-t border-slate-200">
      <span>Generated by Rice ERP on ${new Date().toLocaleDateString()}</span>
      <span>Authorized Signatory</span>
    </div>
  `;

  openModal('registerPrintModal');
}

function executeRegisterPrint() {
  const container = document.getElementById('register-print-content');
  if (!container) return;

  document.querySelectorAll('.print-target').forEach(el => {
    if (el.id !== 'register-print-content') el.classList.remove('print-target');
  });
  container.classList.add('print-target');

  window.print();
}

function printPartyLedger() {
  const container = document.getElementById('printable-ledger');
  if (!container) return;

  document.querySelectorAll('.print-target').forEach(el => {
    if (el.id !== 'printable-ledger') el.classList.remove('print-target');
  });
  container.classList.add('print-target');

  window.print();
}

// ============================================================
// 11. AUTHENTICATION & SESSION MANAGEMENT
// ============================================================
function checkAuth() {
  const authStr = localStorage.getItem('rice_erp_auth') || sessionStorage.getItem('rice_erp_auth');
  if (authStr) {
    try {
      const session = JSON.parse(authStr);
      if (session && session.username) {
        showErpApp(session);
        return true;
      }
    } catch (e) {
      console.warn('Session parsing error:', e);
    }
  }
  showHomePage();
  return false;
}

function showErpApp(session) {
  const homeView = document.getElementById('home-portal-view');
  const erpView = document.getElementById('erp-app-view');
  if (homeView) homeView.classList.add('hidden');
  if (erpView) erpView.classList.remove('hidden');

  const userText = document.getElementById('current-username-text');
  if (userText && session && session.displayName) {
    userText.innerText = session.displayName;
  }

  loadBusinessProfile();
  setDefaultDates();
  switchTab(currentTab || 'dashboard');
}

function showHomePage() {
  const homeView = document.getElementById('home-portal-view');
  const erpView = document.getElementById('erp-app-view');
  if (homeView) homeView.classList.remove('hidden');
  if (erpView) erpView.classList.add('hidden');

  const errAlert = document.getElementById('login-error-alert');
  if (errAlert) errAlert.classList.add('hidden');
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const usernameEl = document.getElementById('login_username');
  const passwordEl = document.getElementById('login_password');
  const rememberEl = document.getElementById('login_remember');
  const errorAlert = document.getElementById('login-error-alert');
  const errorMsg = document.getElementById('login-error-message');
  const submitBtn = document.getElementById('login_submit_btn');

  const username = usernameEl ? usernameEl.value.trim() : '';
  const password = passwordEl ? passwordEl.value.trim() : '';
  const remember = rememberEl ? rememberEl.checked : true;

  if (errorAlert) errorAlert.classList.add('hidden');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying...';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      const session = {
        username: data.user.username,
        displayName: data.user.displayName,
        role: data.user.role,
        token: data.token,
        time: Date.now()
      };
      if (remember) {
        localStorage.setItem('rice_erp_auth', JSON.stringify(session));
      } else {
        sessionStorage.setItem('rice_erp_auth', JSON.stringify(session));
      }
      showErpApp(session);
    } else {
      if (errorAlert && errorMsg) {
        errorMsg.innerText = data.error || 'Invalid username or password.';
        errorAlert.classList.remove('hidden');
      }
    }
  } catch (err) {
    // Graceful offline fallback for local standalone operation
    const u = username.toLowerCase();
    if ((u === 'admin' && (password === 'admin123' || password === 'admin' || password === 'rice123')) || (u === 'sima' && password === 'admin123')) {
      const session = {
        username: u,
        displayName: u === 'sima' ? 'Simanchal' : 'Administrator',
        role: 'Owner',
        token: 'local_' + Date.now()
      };
      if (remember) {
        localStorage.setItem('rice_erp_auth', JSON.stringify(session));
      } else {
        sessionStorage.setItem('rice_erp_auth', JSON.stringify(session));
      }
      showErpApp(session);
    } else {
      if (errorAlert && errorMsg) {
        errorMsg.innerText = 'Invalid username or password. Default is admin / admin123';
        errorAlert.classList.remove('hidden');
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i> Sign In to ERP Portal';
    }
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to sign out of Rice ERP?')) {
    localStorage.removeItem('rice_erp_auth');
    sessionStorage.removeItem('rice_erp_auth');
    showHomePage();
  }
}

function toggleLoginPassword() {
  const passInput = document.getElementById('login_password');
  const eyeIcon = document.getElementById('login-eye-icon');
  if (!passInput) return;
  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash text-xs';
  } else {
    passInput.type = 'password';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye text-xs';
  }
}

// ============================================================
// 12. INITIALIZATION
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
