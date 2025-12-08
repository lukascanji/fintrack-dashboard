# 💰 FinTrack Dashboard

A modern, privacy-first personal finance dashboard built with React. Upload your bank statements to visualize spending, track recurring payments, and analyze trends — all without your data ever leaving your browser.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Key Features

### 📊 Financial Dashboard
- **KPI Cards** — Net flow, income, expenses, and savings rate at a glance
- **Spending Charts** — Interactive bar charts for monthly cash flow analysis
- **Category Breakdown** — Donut chart with drill-down by spending category
- **Top Merchants** — See where your money goes most frequently

### 🔄 Smart Recurring Detection
- **Auto-Detection** — Identifies subscriptions and recurring payments automatically
- **Approval Workflow** — Review pending items, approve or deny
- **Timeline View** — Visual payment history with price change indicators
- **Split Tracking** — Track shared subscriptions with roommates/family

### 🏷️ Intelligent Categorization
- **Auto-Categorize** — 50+ merchant rules built-in (Netflix → Entertainment, Uber → Transportation)
- **Custom Rules** — Add your own categorization rules
- **Real-time Updates** — Category changes apply instantly across all views

### 📅 Additional Views
- **Calendar View** — See spending patterns across days
- **People Tracking** — Assign transactions to people for expense splitting
- **Alerts System** — Get notified about unusual spending

## 🔒 Privacy First

- **100% Local** — All data stored in browser `localStorage`
- **No Server** — Zero data transmission, no accounts required
- **Your Data, Your Control** — Export or clear anytime

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/lukascanji/fintrack-dashboard.git
cd fintrack-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📁 Supported Banks

Drag and drop CSV exports from:
- Chase Bank
- American Express
- Apple Card
- Capital One
- TD Bank
- *Most banks with standard CSV format*

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **Vite** | Build tool & dev server |
| **Chart.js** | Data visualization |
| **Lucide React** | Icon library |
| **PapaParse** | CSV parsing |

## 📂 Project Structure

```
src/
├── components/
│   ├── FileUpload.jsx      # CSV import with dedup preview
│   ├── KPICards.jsx        # Summary statistics
│   ├── SpendingChart.jsx   # Monthly bar chart
│   ├── CategoryDonut.jsx   # Category breakdown
│   ├── TransactionTable.jsx # Filterable transaction grid
│   ├── Subscriptions.jsx   # Recurring payment tracker
│   ├── CalendarView.jsx    # Calendar spending view
│   ├── People.jsx          # Person assignment
│   └── Alerts.jsx          # Spending alerts
├── utils/
│   ├── parseCSV.js         # Multi-format CSV parser
│   └── categorize.js       # Merchant categorization engine
├── App.jsx                 # Main application
└── index.css               # Dark theme design system
```

## 📄 License

MIT License — feel free to use this project for learning or personal use.

---

Built with ☕ by [Lukas Canji](https://github.com/lukascanji)
