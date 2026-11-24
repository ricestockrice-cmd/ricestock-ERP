const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'rice_erp.db');
const db = new DatabaseSync(dbPath);

const parties = db.prepare('SELECT * FROM parties').all();
const sales = db.prepare('SELECT * FROM sales').all();
const purchases = db.prepare('SELECT * FROM purchases').all();
const payments = db.prepare('SELECT * FROM payments').all();

let sql = `-- ====================================================
-- 🌾 RICE SALES & STOCK LEDGER ERP - SUPABASE SCHEMA
-- Run this entire script in Supabase -> SQL Editor -> Run
-- ====================================================

-- 1. DROP EXISTING TABLES (IF RE-CREATING)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS parties CASCADE;

-- 2. CREATE TABLES
CREATE TABLE parties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'Customer' or 'Supplier'
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  opening_balance DOUBLE PRECISION DEFAULT 0,
  opening_date TEXT DEFAULT ''
);

CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  invoice_no TEXT DEFAULT '',
  party_name TEXT NOT NULL,
  rst_no TEXT DEFAULT '',
  vehicle_no TEXT DEFAULT '',
  product TEXT NOT NULL,
  bags INTEGER DEFAULT 0,
  quantity_kg DOUBLE PRECISION NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  invoice_no TEXT DEFAULT '',
  party_name TEXT NOT NULL,
  rst_no TEXT DEFAULT '',
  vehicle_no TEXT DEFAULT '',
  product TEXT NOT NULL,
  bags INTEGER DEFAULT 0,
  quantity_kg DOUBLE PRECISION NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  party_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'PAID' or 'RECEIVED'
  amount DOUBLE PRECISION NOT NULL,
  mode TEXT DEFAULT 'PHONE PE',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow public access for this ERP
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all parties" ON parties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all payments" ON payments FOR ALL USING (true) WITH CHECK (true);

`;

function esc(val) {
  if (val === null || val === undefined) return "''";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

sql += `-- 3. SEED PARTIES (${parties.length} records)\n`;
for (const p of parties) {
  sql += `INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES (${esc(p.name)}, ${esc(p.type)}, ${esc(p.phone)}, ${esc(p.address)}, ${p.opening_balance || 0}, ${esc(p.opening_date)});\n`;
}

sql += `\n-- 4. SEED PURCHASES (${purchases.length} records)\n`;
for (const p of purchases) {
  sql += `INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES (${esc(p.date)}, ${esc(p.invoice_no)}, ${esc(p.party_name)}, ${esc(p.rst_no)}, ${esc(p.vehicle_no)}, ${esc(p.product)}, ${p.bags || 0}, ${p.quantity_kg || 0}, ${p.rate || 0}, ${p.total || 0});\n`;
}

sql += `\n-- 5. SEED SALES (${sales.length} records)\n`;
for (const s of sales) {
  sql += `INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES (${esc(s.date)}, ${esc(s.invoice_no)}, ${esc(s.party_name)}, ${esc(s.rst_no)}, ${esc(s.vehicle_no)}, ${esc(s.product)}, ${s.bags || 0}, ${s.quantity_kg || 0}, ${s.rate || 0}, ${s.total || 0});\n`;
}

sql += `\n-- 6. SEED PAYMENTS (${payments.length} records)\n`;
for (const p of payments) {
  sql += `INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES (${esc(p.date)}, ${esc(p.party_name)}, ${esc(p.type)}, ${p.amount || 0}, ${esc(p.mode)}, ${esc(p.remarks)});\n`;
}

const outPath = path.join(__dirname, '..', 'supabase_setup.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Successfully generated supabase_setup.sql (' + sql.length + ' bytes)');
