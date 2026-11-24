-- ====================================================
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

-- 3. SEED PARTIES (10 records)
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('AKHAYA SAHU', 'Supplier', '', '', 200000, '2026-11-18');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('CHHANDA PATTNAIK', 'Supplier', '', '', 0, '');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('KURA REDDY', 'Customer', '', '', 0, '');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('LITU SARAB', 'Supplier', '', '', 10000, '2026-08-27');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('MITU PATRO', 'Supplier', '', '', 36386, '2026-11-08');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('NILADRI', 'Customer', '', '', 0, '');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('RAGHUNATH GOUDA', 'Supplier', '', '', 0, '');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('SILU ROUTA', 'Customer', '', '', 2000, '2026-11-18');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('TRITHABASI PRADHAN', 'Supplier', '', '', 0, '');
INSERT INTO parties (name, type, phone, address, opening_balance, opening_date) VALUES ('VENKET RAMAN', 'Customer', '', '', 0, '');

-- 4. SEED PURCHASES (32 records)
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-10-27', 'A6', 'LITU SARAB', '17637', 'OD 02 DJ 3360', 'NEW 1001', 77, 4340, 1660, 93563.63636363637);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-02', 'A7', 'LITU SARAB', '17681', 'OD 02 DJ 3360', 'NEW 1001', 62, 4322, 1660, 93175.58441558441);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-04', 'A8', 'LITU SARAB', '15', 'OD 02 DJ 3360', 'NEW 1001', 59, 4300, 1660, 92701.2987012987);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-06', 'A9', 'LITU SARAB', '48', 'OD 02 DJ 3360', 'NEW 1001', 58, 3880, 1660, 83646.75324675324);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-08', 'A10', 'MITU PATRO', '68', '0D 02 DH 0991', 'NEW 1001', 0, 4200, 1650, 90000);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-08', 'A11', 'LITU SARAB', '72', '0D 02 DJ 3360', 'NEW 1001', 54, 3080, 1660, 66400);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-08', 'A11', 'LITU SARAB', '72', '0D 02 DJ 3360', 'MAYURI', 0, 1100, 1770, 25285.714285714286);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-09', 'A12', 'MITU PATRO', '84', 'OD 02 DB 9691', 'NEW 1001', 75, 4400, 1650, 94285.71428571429);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-09', 'A13', 'MITU PATRO', '90', '0D 25 F 0226', 'NEW 1001', 46, 3570, 1650, 76500);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-09', 'A14', 'LITU SARAB', '93', '0D 02 DJ 3360', 'NEW 1001', 55, 3610, 1660, 77825.97402597402);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A15', 'AKHAYA SAHU', '101', '0D 02 BK 6892', 'PURUNA MASURI', 73, 4909.25, 1770, 112848.9935064935);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A15', 'AKHAYA SAHU', '101', '0D 02 BK 6892', 'GEDI', 7, 470.75, 1600, 9781.818181818182);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A16', 'MITU PATRO', '111', '0D 02 DB 9691', 'NEW 1001', 70, 4520, 1650, 96857.14285714286);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A17', 'MITU PATRO', '112', '0D 02 D4 0991', 'NEW 1001', 58, 4420, 1650, 94714.28571428571);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A18', 'LITU SARAB', '120', 'OD 32 L 7688', 'NEW 1001', 60, 4490, 1660, 96797.4025974026);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A19', 'LITU SARAB', '124', '0D 02 DJ 3360', 'NEW 1001', 55, 4310, 1660, 92916.88311688312);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A20', 'CHHANDA PATTNAIK', '122', '0D 07 6563', 'MASURI', 41, 3450, 1650, 73928.57142857142);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A21', 'CHHANDA PATTNAIK', '123', 'OD O7 AA 8120', 'MASURI', 48, 4150, 1650, 88928.57142857142);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A22', 'RAGHUNATH GOUDA', '127', 'OD 02 AB 7969', 'PURUNA MASURI', 66, 3313.81, 1730, 74453.13376623376);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A22', 'RAGHUNATH GOUDA', '127', 'OD 02 AB 7969', 'GOMO', 1, 45.39, 1300, 766.3246753246754);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A22', 'RAGHUNATH GOUDA', '127', 'OD 02 AB 7969', 'GEDI', 2, 90.78, 1578, 1860.4005194805195);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A23', 'MITU PATRO', '125', 'OD 25 F 0226', 'NEW 1001', 48, 3320, 1650, 71142.85714285714);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A24', 'MITU PATRO', '131', '0D 02 DF 0852', 'NEW 1001', 56, 4380, 1650, 93857.14285714286);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A25', 'MITU PATRO', '148', '0D 32 F 4084', 'NEW 1001', 45, 3420, 1670, 74174.02597402596);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A26', 'RAGHUNATH GOUDA', '155', '0D 02 AB 7989', 'PURUNA MASURI', 8, 365.28, 1730, 8206.940259740259);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A26', 'RAGHUNATH GOUDA', '155', '0D 02 AB 7989', 'PURUNA 1001', 27, 1232.83, 1700, 27218.324675324675);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A26', 'RAGHUNATH GOUDA', '155', '0D 02 AB 7989', 'NEW PADDY', 3, 136.98, 1600, 2846.337662337662);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A26', 'RAGHUNATH GOUDA', '155', '0D 02 AB 7989', 'GOMO', 15, 684.9, 1300, 11563.246753246753);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A27', 'TRITHABASI PRADHAN', '145', 'OD 07 AP 4077', 'NEW 1001', 188, 14400, 0, 0);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A28', 'MITU PATRO', '156', '0D 02 DB 9691', 'NEW 1001', 70, 4510, 0, 0);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A29', 'MITU PATRO', '157', 'OD O2 DF 0852', 'NEW 1001', 60, 4560, 0, 0);
INSERT INTO purchases (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A30', 'CHHANDA PATTNAIK', '159', 'OD 07 AA 8129', 'NEW MASURI', 47, 3830, 1650, 82071.42857142857);

-- 5. SEED SALES (26 records)
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-10', 'A34', 'SILU ROUTA', '117', 'AP 39 T 3159', 'NEW 1001', 380, 29410, 1730, 660770.1298701299);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-11', 'A35', 'NILADRI', '138', 'AP 39 T0 7119', 'NEW MASURI', 261, 20150, 1730, 452720.7792207792);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-12', 'A36', 'SILU ROUTA', '151', 'AP 21 TY 2587', 'NEW 1001', 330, 25320, 1730, 568877.922077922);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-13', 'A39', 'NILADRI', '173', 'MH 09 EM 2896', 'NEW 1001', 330, 25360, 1725, 568129.8701298701);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-14', 'A40', 'NILADRI', '', 'TG 36 T 4589', 'NEW 1001', 440, 33220, 1730, 746371.4285714286);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-15', 'A41', 'KURA REDDY', '229', 'AP 16 TS 4365', 'NEW 1001', 401, 30650, 1730, 688629.8701298701);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-15', 'A42', 'SILU ROUTA', '249', 'AP 39 WK 7794', '1001', 267, 20630, 1770, 474222.0779220779);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-16', 'A43', 'KURA REDDY', '252', 'TN 52 AA 9807', 'NEW 1001', 417, 32160, 1771, 739680);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-16', 'A44', 'NILADRI', '246', 'AP 39 UC 7459', 'NEW MASURI', 460, 35430, 1690, 777619.4805194805);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-16', 'A45', 'SILU ROUTA', '', 'AP 39 WW 0444', '1001', 200, 15380, 1770, 353540.25974025973);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-16', 'A46', 'SILU ROUTA', '', 'MH 47 AS 9127', 'NEW MASURI', 160, 12270, 1690, 269302.59740259737);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-17', 'A47', 'SILU ROUTA', '280', 'AP 07 TF 3690', '1001', 330, 25640, 1770, 589387.012987013);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-18', 'A48', 'KURA REDDY', '306', 'AP 39 UL 4377', '1001', 460, 35410, 1771, 814430);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-18', 'A49', 'SILU ROUTA', '332', 'AP 07 TJ 0126', 'NEW 1001', 427, 32890, 1770, 756042.8571428572);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-18', 'A50', 'SILU ROUTA', '342', 'AP 16 TH 9368', 'NEW 1001', 220, 14417.47, 1770, 331414.57012987015);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-18', 'A50', 'SILU ROUTA', '342', 'AP 16 TH 9368', 'NEW MASURI', 89, 5832.53, 1690, 128012.67142857141);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-19', 'B1', 'KURA REDDY', '366', 'AP 04 TX 2219', 'NEW 1001', 385, 29600, 1771, 680800);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-19', 'B2', 'NILADRI', '392', 'AP 07 TF 8977', '1001', 263, 20320, 1770, 467096.1038961039);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-20', 'B3', 'SILU ROUTA', '405', 'WB 50 AA 3353', '1009', 480, 36760, 1630, 778166.2337662338);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-20', 'B4', 'SILU ROUTA', '412', 'WB 11 C 7238', '1001', 265, 20400, 1770, 468935.06493506493);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-20', 'B5', 'NILADRI', '413', 'AP 05 TD 1599', 'NEW 1001', 267, 20630, 1750, 468863.63636363635);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-20', 'B6', 'SILU ROUTA', '418', 'WB 33 F 2058', 'NEW MASURI', 390, 30250, 1690, 663928.5714285714);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-21', 'B7', 'NILADRI', '423', 'AP 39 WC 3459', '1001', 361, 27800, 1750, 631818.1818181818);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-22', 'B8', 'SILU ROUTA', '440', 'TG 34T 9977', 'NEW 1001', 451, 34750, 1770, 798798.7012987013);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-22', 'B9', 'VENKET RAMAN', '443', 'AP 37 TJ 1377', 'NEW MASURI', 254, 19590, 1680, 427418.1818181818);
INSERT INTO sales (date, invoice_no, party_name, rst_no, vehicle_no, product, bags, quantity_kg, rate, total) VALUES ('2026-11-23', 'B10', 'SILU ROUTA', '496', 'WR 33 E 9616', '1001', 430, 33180, 1770, 762709.0909090909);

-- 6. SEED PAYMENTS (21 records)
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-11', 'RAGHUNATH GOUDA', 'PAID', 50000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-11', 'RAGHUNATH GOUDA', 'PAID', 6913, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-12', 'RAGHUNATH GOUDA', 'PAID', 50000, 'PHONE PE', 'PAID IN PHONE PE');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-13', 'RAGHUNATH GOUDA', 'PAID', 20000, 'PHONE PE', 'PAID IN PHONE PE');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-10', 'CHHANDA PATTNAIK', 'PAID', 100000, 'CASH', 'PAID IN CASH ');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-10', 'CHHANDA PATTNAIK', 'PAID', 2856, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-12', 'CHHANDA PATTNAIK', 'PAID', 60000, 'BANK', 'PAID IN ACCOUNT');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-08', 'MITU PATRO', 'PAID', 10000, 'CASH', 'PAID IN CASG');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-09', 'MITU PATRO', 'PAID', 50000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-10', 'MITU PATRO', 'PAID', 100000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-11', 'MITU PATRO', 'PAID', 100000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-11', 'MITU PATRO', 'PAID', 100000, 'BANK', 'PAID IN ACCOUNT');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-10-27', 'LITU SARAB', 'PAID', 50000, 'CASH', 'CASH PAID');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-01', 'LITU SARAB', 'PAID', 50000, 'PHONE PE', 'PHONE PE');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-04', 'LITU SARAB', 'PAID', 6699, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-06', 'LITU SARAB', 'PAID', 50000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-08', 'LITU SARAB', 'PAID', 50000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-10', 'LITU SARAB', 'PAID', 80000, 'CASH', 'PAID IN CASH');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-11', 'LITU SARAB', 'PAID', 100000, 'BANK', 'PAID IN ACCOUNT');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-09', 'AKHAYA SAHU', 'PAID', 40000, 'PHONE PE', 'PAID IN PHONE PE');
INSERT INTO payments (date, party_name, type, amount, mode, remarks) VALUES ('2026-11-12', 'AKHAYA SAHU', 'PAID', 70000, 'BANK', 'PAID IN ACCOUNT');
