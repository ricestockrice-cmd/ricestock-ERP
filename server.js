const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'rice_erp.db');
const db = new DatabaseSync(DB_PATH);

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'Customer' or 'Supplier'
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    opening_balance REAL DEFAULT 0,
    opening_date TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    invoice_no TEXT DEFAULT '',
    party_name TEXT NOT NULL,
    rst_no TEXT DEFAULT '',
    vehicle_no TEXT DEFAULT '',
    product TEXT NOT NULL,
    bags INTEGER DEFAULT 0,
    quantity_kg REAL NOT NULL,
    rate REAL NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    invoice_no TEXT DEFAULT '',
    party_name TEXT NOT NULL,
    rst_no TEXT DEFAULT '',
    vehicle_no TEXT DEFAULT '',
    product TEXT NOT NULL,
    bags INTEGER DEFAULT 0,
    quantity_kg REAL NOT NULL,
    rate REAL NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    party_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'RECEIVED' or 'PAID'
    mode TEXT NOT NULL, -- 'CASH', 'PHONE PE', 'BANK', etc.
    amount REAL NOT NULL,
    remarks TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper to calculate party balances (including opening balance)
function getPartyBalance(partyName, partyType) {
  const party = db.prepare('SELECT opening_balance FROM parties WHERE name = ?').get(partyName);
  const openBal = party ? (parseFloat(party.opening_balance) || 0) : 0;

  const salesTot = db.prepare('SELECT COALESCE(SUM(total), 0) as tot FROM sales WHERE party_name = ?').get(partyName).tot;
  const purTot = db.prepare('SELECT COALESCE(SUM(total), 0) as tot FROM purchases WHERE party_name = ?').get(partyName).tot;
  const paidTot = db.prepare("SELECT COALESCE(SUM(amount), 0) as tot FROM payments WHERE party_name = ? AND type = 'PAID'").get(partyName).tot;
  const recTot = db.prepare("SELECT COALESCE(SUM(amount), 0) as tot FROM payments WHERE party_name = ? AND type = 'RECEIVED'").get(partyName).tot;

  if (partyType === 'Customer') {
    // Receivable: Opening Balance + Sales - Received
    return Math.round((openBal + salesTot - recTot) * 100) / 100;
  } else {
    // Payable: Opening Balance + Purchases - Paid
    return Math.round((openBal + purTot - paidTot) * 100) / 100;
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    try {
      // 1. Dashboard
      if (pathname === '/api/dashboard' && method === 'GET') {
        const parties = db.prepare('SELECT * FROM parties').all();
        let totalReceivable = 0;
        let totalPayable = 0;

        for (const p of parties) {
          const bal = getPartyBalance(p.name, p.type);
          if (p.type === 'Customer') {
            if (bal > 0) totalReceivable += bal;
          } else {
            if (bal > 0) totalPayable += bal;
          }
        }

        const totalSalesAmt = db.prepare('SELECT COALESCE(SUM(total), 0) as val, COALESCE(SUM(bags), 0) as bags FROM sales').get();
        const totalPurAmt = db.prepare('SELECT COALESCE(SUM(total), 0) as val, COALESCE(SUM(bags), 0) as bags FROM purchases').get();

        const stockItems = db.prepare(`
          SELECT 
            p.product,
            COALESCE(pur.bags, 0) as bought_bags,
            COALESCE(pur.kg, 0) as bought_kg,
            COALESCE(sal.bags, 0) as sold_bags,
            COALESCE(sal.kg, 0) as sold_kg,
            (COALESCE(pur.bags, 0) - COALESCE(sal.bags, 0)) as current_bags,
            (COALESCE(pur.kg, 0) - COALESCE(sal.kg, 0)) as current_kg
          FROM (SELECT DISTINCT product FROM (SELECT product FROM purchases UNION SELECT product FROM sales)) p
          LEFT JOIN (SELECT product, SUM(bags) as bags, SUM(quantity_kg) as kg FROM purchases GROUP BY product) pur ON p.product = pur.product
          LEFT JOIN (SELECT product, SUM(bags) as bags, SUM(quantity_kg) as kg FROM sales GROUP BY product) sal ON p.product = sal.product
          ORDER BY current_bags DESC
        `).all();

        const recentSales = db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 5').all();
        const recentPayments = db.prepare('SELECT * FROM payments ORDER BY id DESC LIMIT 5').all();

        res.writeHead(200);
        res.end(JSON.stringify({
          totalReceivable: Math.round(totalReceivable * 100) / 100,
          totalPayable: Math.round(totalPayable * 100) / 100,
          totalSales: totalSalesAmt.val,
          totalSalesBags: totalSalesAmt.bags,
          totalPurchases: totalPurAmt.val,
          totalPurchaseBags: totalPurAmt.bags,
          stock: stockItems,
          recentSales,
          recentPayments
        }));
        return;
      }

      // 2. Parties
      if (pathname === '/api/parties' && method === 'GET') {
        const parties = db.prepare('SELECT * FROM parties ORDER BY name ASC').all();
        const result = parties.map(p => ({
          ...p,
          balance: getPartyBalance(p.name, p.type)
        }));
        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/parties' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.type) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Name and type required' }));
          return;
        }
        const insert = db.prepare('INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run(
          body.name.trim(), 
          body.type, 
          body.phone || '', 
          body.address || '', 
          parseFloat(body.opening_balance) || 0, 
          body.opening_date || ''
        );
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: 'Party added' }));
        return;
      }

      if (pathname.startsWith('/api/parties/') && method === 'PUT') {
        const id = pathname.split('/').pop();
        const body = await parseBody(req);
        const opBal = parseFloat(body.opening_balance) || 0;
        db.prepare('UPDATE parties SET name = ?, type = ?, phone = ?, address = ?, opening_balance = ?, opening_date = ? WHERE id = ?')
          .run(body.name.trim(), body.type, body.phone || '', body.address || '', opBal, body.opening_date || '', id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/parties/') && method === 'DELETE') {
        const id = pathname.split('/').pop();
        const party = db.prepare('SELECT name FROM parties WHERE id = ?').get(id);
        if (!party) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Party not found' }));
          return;
        }
        const hasSales = db.prepare('SELECT id FROM sales WHERE party_name = ? LIMIT 1').get(party.name);
        const hasPur = db.prepare('SELECT id FROM purchases WHERE party_name = ? LIMIT 1').get(party.name);
        const hasPay = db.prepare('SELECT id FROM payments WHERE party_name = ? LIMIT 1').get(party.name);
        if (hasSales || hasPur || hasPay) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Cannot delete party with existing transactions. Delete transactions first.' }));
          return;
        }
        db.prepare('DELETE FROM parties WHERE id = ?').run(id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 2b. Outstanding Summary (Master Ledger Summary for all parties)
      if (pathname === '/api/outstanding-summary' && method === 'GET') {
        const parties = db.prepare('SELECT * FROM parties ORDER BY type DESC, name ASC').all();
        const summary = parties.map(p => {
          const isCust = p.type === 'Customer';
          const turnover = isCust
            ? db.prepare('SELECT COALESCE(SUM(total), 0) as tot, count(*) as cnt FROM sales WHERE party_name = ?').get(p.name)
            : db.prepare('SELECT COALESCE(SUM(total), 0) as tot, count(*) as cnt FROM purchases WHERE party_name = ?').get(p.name);
          const paid = db.prepare("SELECT COALESCE(SUM(amount), 0) as tot, count(*) as cnt FROM payments WHERE party_name = ? AND type = 'PAID'").get(p.name);
          const received = db.prepare("SELECT COALESCE(SUM(amount), 0) as tot, count(*) as cnt FROM payments WHERE party_name = ? AND type = 'RECEIVED'").get(p.name);
          const balance = getPartyBalance(p.name, p.type);

          let lastDate = p.opening_date || '';
          const lastSale = isCust ? db.prepare('SELECT date FROM sales WHERE party_name = ? ORDER BY date DESC LIMIT 1').get(p.name) : null;
          const lastPur = !isCust ? db.prepare('SELECT date FROM purchases WHERE party_name = ? ORDER BY date DESC LIMIT 1').get(p.name) : null;
          const lastPay = db.prepare('SELECT date FROM payments WHERE party_name = ? ORDER BY date DESC LIMIT 1').get(p.name);

          const dates = [lastDate, lastSale?.date, lastPur?.date, lastPay?.date].filter(Boolean);
          if (dates.length > 0) {
            dates.sort();
            lastDate = dates[dates.length - 1];
          }

          return {
            id: p.id,
            name: p.name,
            type: p.type,
            phone: p.phone,
            opening_balance: p.opening_balance || 0,
            opening_date: p.opening_date || '',
            total_turnover: turnover ? turnover.tot : 0,
            tx_count: turnover ? turnover.cnt : 0,
            total_paid: paid ? paid.tot : 0,
            total_received: received ? received.tot : 0,
            balance: balance,
            last_date: lastDate
          };
        });
        res.writeHead(200);
        res.end(JSON.stringify(summary));
        return;
      }

      // 2c. Update Opening Balance for a Party
      if (pathname === '/api/parties/opening-balance' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.party_name) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'party_name required' }));
          return;
        }
        const opBal = parseFloat(body.opening_balance) || 0;
        const opDate = body.opening_date || '';

        const pName = body.party_name.trim();
        const existing = db.prepare('SELECT name FROM parties WHERE name = ?').get(pName);
        if (existing) {
          db.prepare('UPDATE parties SET opening_balance = ?, opening_date = ? WHERE name = ?').run(opBal, opDate, pName);
        } else {
          const isSupplier = db.prepare('SELECT id FROM purchases WHERE party_name = ? LIMIT 1').get(pName);
          const pType = isSupplier ? 'Supplier' : 'Customer';
          db.prepare('INSERT INTO parties (name, type, opening_balance, opening_date) VALUES (?, ?, ?, ?)').run(pName, pType, opBal, opDate);
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Opening balance updated' }));
        return;
      }

      // 3. Party Ledger Statement
      if (pathname === '/api/ledger' && method === 'GET') {
        const partyName = url.searchParams.get('party');
        if (!partyName) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Party required' }));
          return;
        }

        const party = db.prepare('SELECT * FROM parties WHERE name = ?').get(partyName) || { name: partyName, type: 'Customer', opening_balance: 0, opening_date: '' };
        const openBal = parseFloat(party.opening_balance) || 0;

        // Collect all transactions
        const txs = [];

        // Sales (Debit for customer)
        const sales = db.prepare('SELECT * FROM sales WHERE party_name = ?').all(partyName);
        for (const s of sales) {
          txs.push({
            id: 'S-' + s.id,
            date: s.date,
            description: `Sale: Inv ${s.invoice_no} | ${s.product} - ${s.bags} Bags = ${s.quantity_kg}KG/77 X ${s.rate}` + (s.vehicle_no ? ` (Veh: ${s.vehicle_no}, RST: ${s.rst_no})` : ''),
            debit: s.total,
            credit: 0,
            type: 'SALE'
          });
        }

        // Purchases (Credit for supplier)
        const purchases = db.prepare('SELECT * FROM purchases WHERE party_name = ?').all(partyName);
        for (const p of purchases) {
          txs.push({
            id: 'P-' + p.id,
            date: p.date,
            description: `Purchase: Inv ${p.invoice_no} | ${p.product} - ${p.bags} Bags = ${p.quantity_kg}KG/77 X ${p.rate}` + (p.vehicle_no ? ` (Veh: ${p.vehicle_no}, RST: ${p.rst_no})` : ''),
            debit: 0,
            credit: p.total,
            type: 'PURCHASE'
          });
        }

        // Payments
        const payments = db.prepare('SELECT * FROM payments WHERE party_name = ?').all(partyName);
        for (const pay of payments) {
          const isPaid = pay.type.toUpperCase() === 'PAID';
          txs.push({
            id: 'PAY-' + pay.id,
            date: pay.date,
            description: `${isPaid ? 'Paid' : 'Received'} via ${pay.mode}` + (pay.remarks ? ` (${pay.remarks})` : ''),
            debit: isPaid ? pay.amount : 0,
            credit: isPaid ? 0 : pay.amount,
            type: isPaid ? 'PAYMENT_PAID' : 'PAYMENT_RECEIVED'
          });
        }

        // Sort chronologically
        txs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        // Handle Date Range Filtering
        const fromDate = url.searchParams.get('from');
        const toDate = url.searchParams.get('to');

        let startBal = openBal;
        const inRangeTxs = [];

        for (const t of txs) {
          const tDate = t.date || '';
          if (fromDate && tDate < fromDate) {
            if (party.type === 'Customer') {
              startBal += (t.debit - t.credit);
            } else {
              startBal += (t.credit - t.debit);
            }
          } else if (!toDate || tDate <= toDate) {
            inRangeTxs.push(t);
          }
        }

        const allRows = [];
        let runningBal = startBal;

        if (startBal !== 0 || fromDate) {
          const opDateLabel = fromDate || party.opening_date || '-';
          allRows.push({
            id: 'OP-0',
            date: opDateLabel,
            description: `OPENING BALANCE B/F ${opDateLabel ? 'AS ON ' + opDateLabel : ''}`,
            debit: party.type === 'Customer' ? (startBal > 0 ? startBal : 0) : (startBal < 0 ? Math.abs(startBal) : 0),
            credit: party.type === 'Supplier' ? (startBal > 0 ? startBal : 0) : (startBal < 0 ? Math.abs(startBal) : 0),
            balance: Math.round(startBal * 100) / 100,
            type: 'OPENING'
          });
        }

        // Calculate Running Balance across transactions in range
        for (const t of inRangeTxs) {
          if (party.type === 'Customer') {
            runningBal += (t.debit - t.credit);
          } else {
            runningBal += (t.credit - t.debit);
          }
          allRows.push({
            ...t,
            balance: Math.round(runningBal * 100) / 100
          });
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          party,
          currentBalance: Math.round(runningBal * 100) / 100,
          transactions: allRows
        }));
        return;
      }

      // 4. Sales CRUD
      if (pathname === '/api/sales' && method === 'GET') {
        const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC, id DESC').all();
        res.writeHead(200);
        res.end(JSON.stringify(sales));
        return;
      }

      if (pathname === '/api/sales' && method === 'POST') {
        const body = await parseBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = body.total ? parseFloat(body.total) : Math.round(((qty / 77.0) * rate) * 100) / 100;

        db.prepare("INSERT OR IGNORE INTO parties (name, type) VALUES (?, 'Customer')").run(body.party_name.trim());

        const insert = db.prepare('INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        insert.run(body.date, body.invoice_no || '', body.party_name.trim(), body.rst_no || '', body.vehicle_no || '', body.product.trim(), parseInt(body.bags) || 0, qty, rate, total);

        res.writeHead(201);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/sales/') && method === 'PUT') {
        const id = pathname.split('/').pop();
        const body = await parseBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = body.total ? parseFloat(body.total) : Math.round(((qty / 77.0) * rate) * 100) / 100;

        db.prepare(`UPDATE sales SET date = ?, invoice_no = ?, party_name = ?, rst_no = ?, vehicle_no = ?, product = ?, bags = ?, quantity_kg = ?, rate = ?, total = ? WHERE id = ?`)
          .run(body.date, body.invoice_no || '', body.party_name.trim(), body.rst_no || '', body.vehicle_no || '', body.product.trim(), parseInt(body.bags) || 0, qty, rate, total, id);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/sales/') && method === 'DELETE') {
        const id = pathname.split('/').pop();
        db.prepare('DELETE FROM sales WHERE id = ?').run(id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 5. Purchases CRUD
      if (pathname === '/api/purchases' && method === 'GET') {
        const purchases = db.prepare('SELECT * FROM purchases ORDER BY date DESC, id DESC').all();
        res.writeHead(200);
        res.end(JSON.stringify(purchases));
        return;
      }

      if (pathname === '/api/purchases' && method === 'POST') {
        const body = await parseBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = body.total ? parseFloat(body.total) : Math.round(((qty / 77.0) * rate) * 100) / 100;

        db.prepare("INSERT OR IGNORE INTO parties (name, type) VALUES (?, 'Supplier')").run(body.party_name.trim());

        const insert = db.prepare('INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        insert.run(body.date, body.invoice_no || '', body.party_name.trim(), body.rst_no || '', body.vehicle_no || '', body.product.trim(), parseInt(body.bags) || 0, qty, rate, total);

        res.writeHead(201);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/purchases/') && method === 'PUT') {
        const id = pathname.split('/').pop();
        const body = await parseBody(req);
        const qty = parseFloat(body.quantity_kg) || 0;
        const rate = parseFloat(body.rate) || 0;
        const total = body.total ? parseFloat(body.total) : Math.round(((qty / 77.0) * rate) * 100) / 100;

        db.prepare(`UPDATE purchases SET date = ?, invoice_no = ?, party_name = ?, rst_no = ?, vehicle_no = ?, product = ?, bags = ?, quantity_kg = ?, rate = ?, total = ? WHERE id = ?`)
          .run(body.date, body.invoice_no || '', body.party_name.trim(), body.rst_no || '', body.vehicle_no || '', body.product.trim(), parseInt(body.bags) || 0, qty, rate, total, id);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/purchases/') && method === 'DELETE') {
        const id = pathname.split('/').pop();
        db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 6. Payments CRUD
      if (pathname === '/api/payments' && method === 'GET') {
        const payments = db.prepare('SELECT * FROM payments ORDER BY date DESC, id DESC').all();
        res.writeHead(200);
        res.end(JSON.stringify(payments));
        return;
      }

      if (pathname === '/api/payments' && method === 'POST') {
        const body = await parseBody(req);
        const insert = db.prepare('INSERT INTO payments (date, party_name, type, mode, amount, remarks) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run(body.date, body.party_name.trim(), body.type, body.mode || 'CASH', parseFloat(body.amount) || 0, body.remarks || '');
        res.writeHead(201);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/payments/') && method === 'PUT') {
        const id = pathname.split('/').pop();
        const body = await parseBody(req);
        db.prepare(`UPDATE payments SET date = ?, party_name = ?, type = ?, mode = ?, amount = ?, remarks = ? WHERE id = ?`)
          .run(body.date, body.party_name.trim(), body.type, body.mode || 'CASH', parseFloat(body.amount) || 0, body.remarks || '', id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname.startsWith('/api/payments/') && method === 'DELETE') {
        const id = pathname.split('/').pop();
        db.prepare('DELETE FROM payments WHERE id = ?').run(id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // 7. Stock
      if (pathname === '/api/stock' && method === 'GET') {
        const stockItems = db.prepare(`
          SELECT 
            p.product,
            COALESCE(pur.bags, 0) as bought_bags,
            COALESCE(pur.kg, 0) as bought_kg,
            COALESCE(sal.bags, 0) as sold_bags,
            COALESCE(sal.kg, 0) as sold_kg,
            (COALESCE(pur.bags, 0) - COALESCE(sal.bags, 0)) as current_bags,
            (COALESCE(pur.kg, 0) - COALESCE(sal.kg, 0)) as current_kg
          FROM (SELECT DISTINCT product FROM (SELECT product FROM purchases UNION SELECT product FROM sales)) p
          LEFT JOIN (SELECT product, SUM(bags) as bags, SUM(quantity_kg) as kg FROM purchases GROUP BY product) pur ON p.product = pur.product
          LEFT JOIN (SELECT product, SUM(bags) as bags, SUM(quantity_kg) as kg FROM sales GROUP BY product) sal ON p.product = sal.product
          ORDER BY current_bags DESC
        `).all();
        res.writeHead(200);
        res.end(JSON.stringify(stockItems));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=====================================================`);
  console.log(`🌾 Rice Sales & Stock Web Server is running!`);
  console.log(`🔗 Local PC access:  http://localhost:${PORT}`);
  console.log(`📱 Mobile phone:     http://<your-pc-ip>:${PORT}`);
  console.log(`=====================================================`);
});
