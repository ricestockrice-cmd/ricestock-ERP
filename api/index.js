// ============================================================
// 🌾 RICE SALES & STOCK ERP - VERCEL SERVERLESS API HANDLER
// Connected to Supabase Cloud Database (PostgreSQL)
// ============================================================

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {}

let memoryProfile = {
  millName: 'Rice Sales & Stock ERP',
  proprietorName: '',
  phone: '',
  gstin: '',
  address: ''
};

// Helper to initialize Supabase client
function getSupabase() {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables (SUPABASE_URL and SUPABASE_KEY) are not set.');
  }
  // Strip trailing /rest/v1 or slashes if user pasted full REST endpoint
  url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return createClient(url, key);
}

// Helper: Parse JSON body
function getJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper: Send JSON Response
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

// Main Vercel serverless request router
module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  // Normalize pathname
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }

  try {
    // ----------------------------------------------------
    // 0. AUTHENTICATION (LOGIN)
    // ----------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const username = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      // Master admin credentials
      const validUsers = {
        'admin': ['admin123', 'admin', 'rice123'],
        'sima': ['admin123', 'sima123']
      };

      if (validUsers[username] && validUsers[username].includes(password)) {
        return sendJson(res, 200, {
          success: true,
          token: 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2),
          user: {
            username: username === 'sima' ? 'sima' : 'admin',
            displayName: username === 'sima' ? 'Simanchal' : 'Administrator',
            role: 'Owner'
          }
        });
      } else {
        return sendJson(res, 401, {
          success: false,
          error: 'Invalid username or password. Default is admin / admin123'
        });
      }
    }

    // ----------------------------------------------------
    // 0.1 BUSINESS PROFILE SETTINGS
    // ----------------------------------------------------
    if (pathname === '/api/profile') {
      let defaultProfile = { ...memoryProfile };

      if (req.method === 'GET') {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase.from('settings').select('*').eq('key', 'business_profile').maybeSingle();
          if (data && data.value) {
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            defaultProfile = { ...defaultProfile, ...parsed };
            memoryProfile = { ...defaultProfile };
          }
        } catch (e) {
          // Gracefully fallback to memoryProfile if table not present
        }
        return sendJson(res, 200, { success: true, profile: defaultProfile });
      }

      if (req.method === 'POST') {
        const body = await getJsonBody(req);
        const profileData = {
          millName: (body.millName || '').trim() || 'Rice Sales & Stock ERP',
          proprietorName: (body.proprietorName || '').trim(),
          phone: (body.phone || '').trim(),
          gstin: (body.gstin || '').trim(),
          address: (body.address || '').trim()
        };
        memoryProfile = { ...profileData };

        try {
          const supabase = getSupabase();
          await supabase.from('settings').upsert({
            key: 'business_profile',
            value: JSON.stringify(profileData)
          });
        } catch (e) {
          // Graceful fallback
        }
        return sendJson(res, 200, { success: true, profile: profileData });
      }
    }

    const supabase = getSupabase();

    // ----------------------------------------------------
    // 1. DASHBOARD
    // ----------------------------------------------------
    if (pathname === '/api/dashboard' && req.method === 'GET') {
      const [partiesRes, salesRes, purRes, payRes] = await Promise.all([
        supabase.from('parties').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('purchases').select('*'),
        supabase.from('payments').select('*')
      ]);

      const parties = partiesRes.data || [];
      const sales = salesRes.data || [];
      const purchases = purRes.data || [];
      const payments = payRes.data || [];

      // Calculate party balances
      let totalReceivables = 0;
      let totalPayables = 0;

      for (const p of parties) {
        const pSales = sales.filter(s => s.party_name === p.name).reduce((sum, s) => sum + (s.total || 0), 0);
        const pPur = purchases.filter(pr => pr.party_name === p.name).reduce((sum, pr) => sum + (pr.total || 0), 0);
        const pPaid = payments.filter(pm => pm.party_name === p.name && pm.type === 'PAID').reduce((sum, pm) => sum + (pm.amount || 0), 0);
        const pRec = payments.filter(pm => pm.party_name === p.name && pm.type === 'RECEIVED').reduce((sum, pm) => sum + (pm.amount || 0), 0);

        const opBal = p.opening_balance || 0;
        let bal = 0;
        if (p.type === 'Customer') {
          bal = opBal + pSales - pRec;
          if (bal > 0) totalReceivables += bal;
        } else {
          bal = opBal + pPur - pPaid;
          if (bal > 0) totalPayables += bal;
        }
      }

      const range = url.searchParams.get('range') || 'all';
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStr = todayStr.slice(0, 7);

      let targetSales = sales;
      if (range === 'today') {
        targetSales = sales.filter(s => s.date === todayStr);
      } else if (range === 'month') {
        targetSales = sales.filter(s => s.date && s.date.startsWith(monthStr));
      }

      const totalSales = targetSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalSalesBags = targetSales.reduce((sum, s) => sum + (s.bags || 0), 0);

      // Stock by variety
      const stockMap = {};
      for (const pr of purchases) {
        const prod = pr.product || 'UNKNOWN';
        if (!stockMap[prod]) stockMap[prod] = { bought_bags: 0, bought_kg: 0, sold_bags: 0, sold_kg: 0 };
        stockMap[prod].bought_bags += (pr.bags || 0);
        stockMap[prod].bought_kg += (pr.quantity_kg || 0);
      }
      for (const s of sales) {
        const prod = s.product || 'UNKNOWN';
        if (!stockMap[prod]) stockMap[prod] = { bought_bags: 0, bought_kg: 0, sold_bags: 0, sold_kg: 0 };
        stockMap[prod].sold_bags += (s.bags || 0);
        stockMap[prod].sold_kg += (s.quantity_kg || 0);
      }

      let totalStockBags = 0;
      const stockByVariety = Object.keys(stockMap).map(k => {
        const item = stockMap[k];
        const curBags = item.bought_bags - item.sold_bags;
        const curKg = item.bought_kg - item.sold_kg;
        totalStockBags += curBags;
        return {
          product: k,
          bought_bags: item.bought_bags,
          sold_bags: item.sold_bags,
          current_bags: curBags,
          current_kg: Math.round(curKg * 100) / 100
        };
      });

      // Recent 5 payments
      const recentPayments = [...payments]
        .sort((a, b) => (b.date > a.date ? 1 : (b.date < a.date ? -1 : (b.id - a.id))))
        .slice(0, 5);

      return sendJson(res, 200, {
        totalReceivable: totalReceivables,
        totalReceivables,
        totalPayable: totalPayables,
        totalPayables,
        totalSales,
        totalSalesBags,
        totalStockBags,
        stock: stockByVariety,
        stockByVariety,
        recentPayments
      });
    }

    // ----------------------------------------------------
    // 2. PARTIES & OPENING BALANCE
    // ----------------------------------------------------
    if (pathname === '/api/parties' && req.method === 'GET') {
      const [partiesRes, salesRes, purRes, payRes] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        supabase.from('sales').select('party_name, total'),
        supabase.from('purchases').select('party_name, total'),
        supabase.from('payments').select('party_name, type, amount')
      ]);

      const parties = partiesRes.data || [];
      const sales = salesRes.data || [];
      const purchases = purRes.data || [];
      const payments = payRes.data || [];

      const result = parties.map(p => {
        const pSales = sales.filter(s => s.party_name === p.name).reduce((sum, s) => sum + (s.total || 0), 0);
        const pPur = purchases.filter(pr => pr.party_name === p.name).reduce((sum, pr) => sum + (pr.total || 0), 0);
        const pPaid = payments.filter(pm => pm.party_name === p.name && pm.type === 'PAID').reduce((sum, pm) => sum + (pm.amount || 0), 0);
        const pRec = payments.filter(pm => pm.party_name === p.name && pm.type === 'RECEIVED').reduce((sum, pm) => sum + (pm.amount || 0), 0);

        const opBal = p.opening_balance || 0;
        let bal = 0;
        if (p.type === 'Customer') {
          bal = opBal + pSales - pRec;
        } else {
          bal = opBal + pPur - pPaid;
        }

        return { ...p, balance: bal };
      });

      return sendJson(res, 200, result);
    }

    if (pathname === '/api/parties' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const name = (body.name || '').trim().toUpperCase();
      if (!name) return sendJson(res, 400, { error: 'Party name is required' });

      const newParty = {
        name,
        type: body.type || 'Customer',
        phone: body.phone || '',
        address: body.address || '',
        opening_balance: parseFloat(body.opening_balance) || 0,
        opening_date: body.opening_date || ''
      };

      const { data, error } = await supabase.from('parties').insert([newParty]).select();
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 201, data[0]);
    }

    if (pathname === '/api/parties/opening-balance' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const name = (body.party_name || '').trim();
      const opBal = parseFloat(body.opening_balance) || 0;
      const opDate = body.opening_date || '';

      const { data, error } = await supabase
        .from('parties')
        .update({ opening_balance: opBal, opening_date: opDate })
        .eq('name', name)
        .select();

      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, { success: true, party: data[0] });
    }

    const partyMatch = pathname.match(/^\/api\/parties\/(\d+)$/);
    if (partyMatch) {
      const id = parseInt(partyMatch[1]);
      if (req.method === 'PUT') {
        const body = await getJsonBody(req);
        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name.trim().toUpperCase();
        if (body.type !== undefined) updateData.type = body.type;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.opening_balance !== undefined) updateData.opening_balance = parseFloat(body.opening_balance) || 0;
        if (body.opening_date !== undefined) updateData.opening_date = body.opening_date;

        const { data, error } = await supabase.from('parties').update(updateData).eq('id', id).select();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, data[0]);
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('parties').delete().eq('id', id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { success: true });
      }
    }

    // ----------------------------------------------------
    // 3. SALES REGISTER
    // ----------------------------------------------------
    if (pathname === '/api/sales' && req.method === 'GET') {
      const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false }).order('id', { ascending: false });
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, data);
    }

    if (pathname === '/api/sales' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const qty = parseFloat(body.quantity_kg) || 0;
      const rate = parseFloat(body.rate) || 0;
      const total = (qty / 77) * rate;

      const record = {
        date: body.date,
        invoice_no: body.invoice_no || '',
        party_name: (body.party_name || '').trim().toUpperCase(),
        rst_no: body.rst_no || '',
        vehicle_no: (body.vehicle_no || '').trim().toUpperCase(),
        product: (body.product || '').trim().toUpperCase(),
        bags: parseInt(body.bags) || 0,
        quantity_kg: qty,
        rate: rate,
        total: total
      };

      const { data, error } = await supabase.from('sales').insert([record]).select();
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 201, data[0]);
    }

    const saleMatch = pathname.match(/^\/api\/sales\/(\d+)$/);
    if (saleMatch) {
      const id = parseInt(saleMatch[1]);
      if (req.method === 'PUT') {
        const body = await getJsonBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = (qty / 77) * rate;

        const updateData = {
          date: body.date,
          invoice_no: body.invoice_no || '',
          party_name: (body.party_name || '').trim().toUpperCase(),
          rst_no: body.rst_no || '',
          vehicle_no: (body.vehicle_no || '').trim().toUpperCase(),
          product: (body.product || '').trim().toUpperCase(),
          bags: parseInt(body.bags) || 0,
          quantity_kg: qty,
          rate: rate,
          total: total
        };

        const { data, error } = await supabase.from('sales').update(updateData).eq('id', id).select();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, data[0]);
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('sales').delete().eq('id', id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { success: true });
      }
    }

    // ----------------------------------------------------
    // 4. PURCHASE REGISTER
    // ----------------------------------------------------
    if (pathname === '/api/purchases' && req.method === 'GET') {
      const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false }).order('id', { ascending: false });
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, data);
    }

    if (pathname === '/api/purchases' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const qty = parseFloat(body.quantity_kg) || 0;
      const rate = parseFloat(body.rate) || 0;
      const total = (qty / 77) * rate;

      const record = {
        date: body.date,
        invoice_no: body.invoice_no || '',
        party_name: (body.party_name || '').trim().toUpperCase(),
        rst_no: body.rst_no || '',
        vehicle_no: (body.vehicle_no || '').trim().toUpperCase(),
        product: (body.product || '').trim().toUpperCase(),
        bags: parseInt(body.bags) || 0,
        quantity_kg: qty,
        rate: rate,
        total: total
      };

      const { data, error } = await supabase.from('purchases').insert([record]).select();
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 201, data[0]);
    }

    const purMatch = pathname.match(/^\/api\/purchases\/(\d+)$/);
    if (purMatch) {
      const id = parseInt(purMatch[1]);
      if (req.method === 'PUT') {
        const body = await getJsonBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = (qty / 77) * rate;

        const updateData = {
          date: body.date,
          invoice_no: body.invoice_no || '',
          party_name: (body.party_name || '').trim().toUpperCase(),
          rst_no: body.rst_no || '',
          vehicle_no: (body.vehicle_no || '').trim().toUpperCase(),
          product: (body.product || '').trim().toUpperCase(),
          bags: parseInt(body.bags) || 0,
          quantity_kg: qty,
          rate: rate,
          total: total
        };

        const { data, error } = await supabase.from('purchases').update(updateData).eq('id', id).select();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, data[0]);
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('purchases').delete().eq('id', id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { success: true });
      }
    }

    // ----------------------------------------------------
    // 5. PAYMENTS & CASH
    // ----------------------------------------------------
    if (pathname === '/api/payments' && req.method === 'GET') {
      const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false }).order('id', { ascending: false });
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 200, data);
    }

    if (pathname === '/api/payments' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const record = {
        date: body.date,
        party_name: (body.party_name || '').trim().toUpperCase(),
        type: body.type || 'PAID',
        amount: parseFloat(body.amount) || 0,
        mode: body.mode || 'PHONE PE',
        remarks: body.remarks || ''
      };

      const { data, error } = await supabase.from('payments').insert([record]).select();
      if (error) return sendJson(res, 400, { error: error.message });
      return sendJson(res, 201, data[0]);
    }

    const payMatch = pathname.match(/^\/api\/payments\/(\d+)$/);
    if (payMatch) {
      const id = parseInt(payMatch[1]);
      if (req.method === 'PUT') {
        const body = await getJsonBody(req);
        const updateData = {
          date: body.date,
          party_name: (body.party_name || '').trim().toUpperCase(),
          type: body.type || 'PAID',
          amount: parseFloat(body.amount) || 0,
          mode: body.mode || 'PHONE PE',
          remarks: body.remarks || ''
        };

        const { data, error } = await supabase.from('payments').update(updateData).eq('id', id).select();
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, data[0]);
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) return sendJson(res, 400, { error: error.message });
        return sendJson(res, 200, { success: true });
      }
    }

    // ----------------------------------------------------
    // 6. PARTY LEDGER STATEMENT (CALCULATES RUNNING BALANCE)
    // ----------------------------------------------------
    if (pathname === '/api/ledger' && req.method === 'GET') {
      const partyName = url.searchParams.get('party');
      const fromDate = url.searchParams.get('from');
      const toDate = url.searchParams.get('to');

      if (!partyName) return sendJson(res, 400, { error: 'Party name required' });

      const partyRes = await supabase.from('parties').select('*').eq('name', partyName).maybeSingle();
      if (!partyRes.data) return sendJson(res, 404, { error: 'Party not found' });
      const party = partyRes.data;

      const [salesRes, purRes, payRes] = await Promise.all([
        supabase.from('sales').select('*').eq('party_name', partyName),
        supabase.from('purchases').select('*').eq('party_name', partyName),
        supabase.from('payments').select('*').eq('party_name', partyName)
      ]);

      const isCustomer = party.type === 'Customer';

      // Build unified transaction list
      const allTx = [];

      for (const s of (salesRes.data || [])) {
        allTx.push({
          date: s.date,
          id: s.id,
          type: 'SALE',
          description: `Sale: Inv ${s.invoice_no || '-'} | ${s.product} - ${s.bags || 0} Bags = ${s.quantity_kg}KG/77 X ${s.rate} (Veh: ${s.vehicle_no || '-'}, RST: ${s.rst_no || '-'})`,
          debit: s.total,
          credit: 0
        });
      }

      for (const pr of (purRes.data || [])) {
        allTx.push({
          date: pr.date,
          id: pr.id,
          type: 'PURCHASE',
          description: `Pur: Inv ${pr.invoice_no || '-'} | ${pr.product} - ${pr.bags || 0} Bags = ${pr.quantity_kg}KG/77 X ${pr.rate} (Veh: ${pr.vehicle_no || '-'}, RST: ${pr.rst_no || '-'})`,
          debit: 0,
          credit: pr.total
        });
      }

      for (const pm of (payRes.data || [])) {
        const isPaid = pm.type === 'PAID';
        allTx.push({
          date: pm.date,
          id: pm.id,
          type: isPaid ? 'PAYMENT_PAID' : 'PAYMENT_RECEIVED',
          description: `${isPaid ? 'Paid' : 'Received'} via ${pm.mode} ${pm.remarks ? '(' + pm.remarks + ')' : ''}`,
          debit: isPaid ? pm.amount : 0,
          credit: isPaid ? 0 : pm.amount
        });
      }

      // Sort by date ascending, then id
      allTx.sort((a, b) => (a.date > b.date ? 1 : (a.date < b.date ? -1 : (a.id - b.id))));

      let runningBal = party.opening_balance || 0;
      let displayOpening = runningBal;
      let displayOpeningDate = party.opening_date || '';

      const finalTx = [];

      if (fromDate) {
        for (const t of allTx) {
          if (t.date < fromDate) {
            if (isCustomer) {
              runningBal += (t.debit - t.credit);
            } else {
              runningBal += (t.credit - t.debit);
            }
          }
        }
        displayOpening = runningBal;
        displayOpeningDate = fromDate;
      }

      finalTx.push({
        date: displayOpeningDate || party.opening_date || (allTx.length ? allTx[0].date : ''),
        type: 'OPENING',
        description: `OPENING BALANCE B/F ${displayOpeningDate ? 'AS ON ' + displayOpeningDate : ''}`,
        debit: isCustomer ? (displayOpening > 0 ? displayOpening : 0) : 0,
        credit: !isCustomer ? (displayOpening > 0 ? displayOpening : 0) : 0,
        balance: Math.round(displayOpening * 100) / 100
      });

      runningBal = displayOpening;

      for (const t of allTx) {
        if (fromDate && t.date < fromDate) continue;
        if (toDate && t.date > toDate) continue;

        if (isCustomer) {
          runningBal += (t.debit - t.credit);
        } else {
          runningBal += (t.credit - t.debit);
        }
        finalTx.push({
          ...t,
          balance: Math.round(runningBal * 100) / 100
        });
      }

      return sendJson(res, 200, {
        party,
        currentBalance: runningBal,
        transactions: finalTx
      });
    }

    // ----------------------------------------------------
    // 7. MASTER OUTSTANDING SUMMARY
    // ----------------------------------------------------
    if (pathname === '/api/outstanding-summary' && req.method === 'GET') {
      const [partiesRes, salesRes, purRes, payRes] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        supabase.from('sales').select('party_name, total'),
        supabase.from('purchases').select('party_name, total'),
        supabase.from('payments').select('party_name, type, amount')
      ]);

      const parties = partiesRes.data || [];
      const sales = salesRes.data || [];
      const purchases = purRes.data || [];
      const payments = payRes.data || [];

      const summary = parties.map(p => {
        const isCust = p.type === 'Customer';
        const pSales = sales.filter(s => s.party_name === p.name).reduce((sum, s) => sum + (s.total || 0), 0);
        const pPur = purchases.filter(pr => pr.party_name === p.name).reduce((sum, pr) => sum + (pr.total || 0), 0);
        const pPaid = payments.filter(pm => pm.party_name === p.name && pm.type === 'PAID').reduce((sum, pm) => sum + (pm.amount || 0), 0);
        const pRec = payments.filter(pm => pm.party_name === p.name && pm.type === 'RECEIVED').reduce((sum, pm) => sum + (pm.amount || 0), 0);

        const opBal = p.opening_balance || 0;
        let bal = 0;
        if (isCust) {
          bal = opBal + pSales - pRec;
        } else {
          bal = opBal + pPur - pPaid;
        }

        return {
          type: p.type,
          name: p.name,
          phone: p.phone,
          opening_balance: opBal,
          total_turnover: isCust ? pSales : pPur,
          total_paid: pPaid,
          total_received: pRec,
          balance: bal
        };
      });

      return sendJson(res, 200, summary);
    }

    // ----------------------------------------------------
    // 8. GODOWN STOCK
    // ----------------------------------------------------
    if (pathname === '/api/stock' && req.method === 'GET') {
      const [purRes, salesRes] = await Promise.all([
        supabase.from('purchases').select('product, bags, quantity_kg'),
        supabase.from('sales').select('product, bags, quantity_kg')
      ]);

      const purchases = purRes.data || [];
      const sales = salesRes.data || [];

      const stockMap = {};

      for (const pr of purchases) {
        const prod = pr.product || 'UNKNOWN';
        if (!stockMap[prod]) stockMap[prod] = { bought_bags: 0, bought_kg: 0, sold_bags: 0, sold_kg: 0 };
        stockMap[prod].bought_bags += (pr.bags || 0);
        stockMap[prod].bought_kg += (pr.quantity_kg || 0);
      }

      for (const s of sales) {
        const prod = s.product || 'UNKNOWN';
        if (!stockMap[prod]) stockMap[prod] = { bought_bags: 0, bought_kg: 0, sold_bags: 0, sold_kg: 0 };
        stockMap[prod].sold_bags += (s.bags || 0);
        stockMap[prod].sold_kg += (s.quantity_kg || 0);
      }

      const result = Object.keys(stockMap).sort().map(prod => {
        const item = stockMap[prod];
        return {
          product: prod,
          bought_bags: item.bought_bags,
          bought_kg: Math.round(item.bought_kg * 100) / 100,
          sold_bags: item.sold_bags,
          sold_kg: Math.round(item.sold_kg * 100) / 100,
          current_bags: item.bought_bags - item.sold_bags,
          current_kg: Math.round((item.bought_kg - item.sold_kg) * 100) / 100
        };
      });

      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: 'API endpoint not found' });

  } catch (err) {
    console.error('Serverless API error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
};
