# 🌾 Rice Sales & Stock Ledger ERP

A modern, fast, mobile-responsive Web ERP for Rice Mill & Trading businesses, built with Node.js, SQLite, and Tailwind CSS.

---

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ricestockrice-cmd/ricestock-ERP.git
   cd ricestock-ERP
   ```

2. **Start the application:**
   - On Windows: Double-click **`start_app.bat`** (or run `node server.js` in terminal).
   - The web app will launch automatically at:
     ```
     http://localhost:3000
     ```

3. **Open on Mobile Phone (At Mill / Weighbridge):**
   - Connect your phone to the same Wi-Fi network as the server PC.
   - Open your mobile browser (Chrome / Safari) and navigate to:
     ```
     http://<your-pc-ip>:3000
     ```

---

## ✨ Features

- **📊 Executive Dashboard:** Real-time metrics for Total Receivables, Total Payables, Total Sales, and Live Godown Stock.
- **📱 Fully Mobile Responsive:** Custom mobile navigation bar, touch-friendly swipe tables with pinned variety/party columns, and virtual keyboard protection on modals.
- **🌾 Sales Register:** Track outbound dispatches with bags, weight in KG, rate (per 77 KG Kata), RST weighbridge numbers, and automatic total calculations.
- **🚛 Purchase Register:** Inbound paddy and rice procurements with automatic inventory and ledger balance updates.
- **💵 Payments & Cash Register:** Record payments made to suppliers and collections received from customers via UPI, Cash, Bank Transfer, or Cheque.
- **📋 Party Statements & Detailed Ledger:**
  - Dynamic searchable combobox with keyboard navigation.
  - Date-range filtering (From / To).
  - Opening balance forward tracking (`OPENING BALANCE B/F`).
  - WhatsApp statement sharing and printable PDF views.
- **⚖️ Master Outstanding Summary:** Single-glance balance sheet showing every customer (Receivables) and supplier (Payables) with grand totals.
- **📦 Godown Stock Inventory:** Real-time variety-wise stock tracking with pinned product column on mobile.
- **🧾 Printable Delivery Challans & Inward Slips:** Generate clean, print-ready delivery slips with driver signatures and RST weighbridge details.
- **📥 1-Click Excel Export (CSV):** Export any table directly to Microsoft Excel with UTF-8 BOM encoding.

---

## 🛠 Tech Stack

- **Backend:** Node.js (Built-in HTTP, SQLite3 via node:sqlite / sqlite3)
- **Database:** SQLite (`rice_erp.db`)
- **Frontend:** Vanilla JavaScript, HTML5, Tailwind CSS, FontAwesome 6

---

## 📄 License

MIT License. Designed for Rice Mills & Agro Trading Enterprises.
