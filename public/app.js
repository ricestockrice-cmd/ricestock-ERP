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
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();

    document.getElementById('dash-receivables').innerText = formatINR(data.totalReceivable);
    document.getElementById('dash-payables').innerText = formatINR(data.totalPayable);
    document.getElementById('dash-sales').innerText = formatINR(data.totalSales);
    document.getElementById('dash-sales-bags').innerText = `${(data.totalSalesBags || 0).toLocaleString()} Bags Dispatched`;

    // Calculate total stock bags
    const totalBags = (data.stock || []).reduce((acc, s) => acc + (s.current_bags || 0), 0);
    document.getElementById('dash-stock-bags').innerText = `${totalBags.toLocaleString()} Bags`;

    // Stock table overview
    const stockTbody = document.getElementById('dash-stock-tbody');
    stockTbody.innerHTML = (data.stock || []).slice(0, 6).map(s => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 font-bold text-slate-800">${s.product}</td>
        <td class="py-2.5 px-3 text-right font-medium text-slate-600">${s.bought_bags.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right font-medium text-slate-600">${s.sold_bags.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right font-bold ${s.current_bags >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${s.current_bags.toLocaleString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No stock entries yet</td></tr>';

    // Recent payments table
    const payTbody = document.getElementById('dash-payments-tbody');
    payTbody.innerHTML = (data.recentPayments || []).map(p => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap">${formatDate(p.date)}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-800">${p.party_name}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.type === 'PAID' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
            ${p.type}
          </span>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-slate-800">${formatINR(p.amount)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No recent payments</td></tr>';

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
  const headers = ['Date', 'Invoice No', 'Customer Name', 'RST No', 'Vehicle No', 'Product / Variety', 'Bags', 'Quantity (KG)', 'Rate (per 77KG)', 'Total (INR)'];
  const rows = [headers];

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
  const headers = ['Date', 'Invoice No', 'Supplier Name', 'RST No', 'Vehicle No', 'Product / Variety', 'Bags', 'Quantity (KG)', 'Rate (per 77KG)', 'Total (INR)'];
  const rows = [headers];

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

    // Make sure search input displays current party
    setPartySearchInputValue(data.party);

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
  const p = rawLedgerData.party;
  const headers = ['Date', 'Particulars / Description', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)'];
  const rows = [
    [`PARTY ACCOUNT STATEMENT: ${p.name} (${p.type})`],
    [`Opening Balance: ${formatINR(p.opening_balance)} (As on: ${p.opening_date || '-'})`],
    [`Current Balance: ${formatINR(rawLedgerData.currentBalance)}`],
    [],
    headers
  ];

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
// 10. DELIVERY SLIP / WEIGHMENT BILL PRINT
// ============================================================
function showSlip(type, id) {
  const item = (type === 'SALE' ? rawSalesData : rawPurchasesData).find(x => x.id === id);
  if (!item) return;

  const isSale = type === 'SALE';
  const container = document.getElementById('slip-print-content');

  container.innerHTML = `
    <div class="text-center border-b pb-2">
      <h2 class="text-base font-black text-slate-800 tracking-wider">🌾 RICE TRADING & MILLING ERP</h2>
      <p class="text-[10px] text-slate-500">${isSale ? 'OUTWARD SALES DELIVERY CHALLAN' : 'INWARD PURCHASE WEIGHMENT RECEIPT'}</p>
    </div>

    <div class="grid grid-cols-2 gap-2 text-[11px] pt-1">
      <div><span class="text-slate-400">Date:</span> <strong>${formatDate(item.date)}</strong></div>
      <div class="text-right"><span class="text-slate-400">Bill/Inv:</span> <strong>${item.invoice_no || '-'}</strong></div>
      <div><span class="text-slate-400">Party:</span> <strong>${item.party_name}</strong></div>
      <div class="text-right"><span class="text-slate-400">Type:</span> <strong>${isSale ? 'Customer' : 'Supplier'}</strong></div>
      <div><span class="text-slate-400">RST No:</span> <strong>${item.rst_no || '-'}</strong></div>
      <div class="text-right"><span class="text-slate-400">Vehicle No:</span> <strong>${item.vehicle_no || '-'}</strong></div>
    </div>

    <div class="border-t border-b border-slate-300 py-2 my-2">
      <table class="w-full text-[11px]">
        <thead>
          <tr class="text-slate-500 border-b">
            <th class="text-left pb-1">Product</th>
            <th class="text-right pb-1">Bags</th>
            <th class="text-right pb-1">Weight (KG)</th>
            <th class="text-right pb-1">Rate (77KG)</th>
            <th class="text-right pb-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold py-1.5">${item.product}</td>
            <td class="text-right py-1.5">${item.bags ? item.bags.toLocaleString() : '-'}</td>
            <td class="text-right py-1.5 font-mono">${item.quantity_kg ? item.quantity_kg.toLocaleString() : '-'}</td>
            <td class="text-right py-1.5 font-mono">${item.rate ? item.rate.toLocaleString() : '-'}</td>
            <td class="text-right py-1.5 font-bold font-mono text-slate-900">${formatINR(item.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between items-center text-xs font-bold pt-1">
      <span>NET AMOUNT:</span>
      <span class="text-sm font-black text-emerald-700">${formatINR(item.total)}</span>
    </div>

    <div class="pt-6 flex justify-between text-[10px] text-slate-400">
      <span>Customer/Driver Signature</span>
      <span>Authorized Signatory</span>
    </div>
  `;

  openModal('slipModal');
}

function printSlip() {
  const content = document.getElementById('slip-print-content').innerHTML;
  const printWindow = window.open('', '_blank', 'width=650,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Slip</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 6px 8px; }
          .border-b { border-bottom: 1px solid #cbd5e1; }
          .border-t { border-top: 1px solid #cbd5e1; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .font-mono { font-family: monospace; }
        </style>
      </head>
      <body>
        ${content}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ============================================================
// 11. INITIALIZATION
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  switchTab('dashboard');
});
