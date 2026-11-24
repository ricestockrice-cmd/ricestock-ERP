# 🌾 Rice Sales & Stock Ledger - Web Portal Guide

Your web application is running live and upgraded with powerful features beyond Excel!

---

## 🚀 How to Open the Website

1. Go to your folder: `c:\Users\sima\Desktop\RiceSalesStock\`
2. Double-click the file: **`start_app.bat`**
3. It will automatically start the server and open **`http://localhost:3000`** in your browser!

---

## 📱 How to Use on Your Mobile Phone (At Weighbridge / Mill)

You can open this website directly on your Android / iPhone when connected to your office/mill Wi-Fi:
1. On your computer, open Command Prompt and type `ipconfig` to find your IPv4 Address (e.g., `192.168.1.5`).
2. On your phone's browser (Chrome / Safari), open:
   ```text
   http://192.168.1.5:3000
   ```
3. You can now enter sales, purchases, and check balances directly from your phone!

---

## ✨ Features & Recent Upgrades

### 1. 📊 Executive Dashboard
* **Total Receivables**: Live sum of what all customers owe you.
* **Total Payables**: Live sum of what you owe suppliers.
* **Live Godown Stock**: Bags remaining for each variety (`NEW 1001`, `NEW MASURI`, `GEDI`, `GOMO`, etc.).

### 2. ✏️ Edit & Update Any Transaction (1-Click)
* Click the pencil icon (**✏️**) on any Sale, Purchase, or Payment row to edit dates, vehicle numbers, weight, rate, or remarks.
* Updates all running balances and party statements automatically!

### 3. 📋 Master Outstanding Summary (Mirroring Excel `Ledger Summary`)
* In the **Party Statements** tab, click **"Master Outstanding Summary"** to see all Customers and Suppliers in one table.
* Displays Party Name, Phone, Opening Balance, Total Business (Turnover), Total Paid/Received, and Net Due.
* Includes Grand Total Receivables and Payables at the bottom.

### 4. 📥 1-Click Export to Excel (CSV)
* Every table (**Sales, Purchases, Payments, Statements, and Master Summary**) now has an **"Export Excel"** button.
* Formatted with UTF-8 BOM so it opens directly in Microsoft Excel with proper formatting and currency symbols.

### 5. 🔍 Live Search & Filter
* Fast search bars across Sales, Purchases, Payments, and Parties.
* Type a vehicle number (e.g. `AP 39`), party name, product, or invoice number to filter instantly.

### 6. ⚖️ Opening Balance Management
* **Existing Party**: Select party in statement view and click **"Set Opening Balance"** (amber button).
* **New Party**: Click **"+ Party"** on the top bar and enter their opening balance directly.
* Statement places **`OPENING BALANCE B/F`** at Row 1 and starts running balances from there.

### 7. 📅 Date Range Filter for Statements
* Filter any party statement between **From Date** and **To Date** (e.g. monthly billing).
* Prior transactions are automatically rolled into `OPENING BALANCE B/F AS ON <Date>`.

### 8. 🧾 Printable Delivery Challan / Weighment Slip
* Click the receipt icon (**🧾**) on any Sale or Purchase row to preview and print an A4 / thermal delivery slip with vehicle number, RST weighment, bags, net weight, rate, and authorized signatures.

---

## 💾 Database & Safety
* All data is saved in a fast SQLite database file: `rice_erp.db`.
* You can back up this file anytime by copying `rice_erp.db`.
