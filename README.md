# Financial Dashboard

A local-first, privacy-focused financial dashboard built with React and Vite. Upload your bank and credit card CSV exports to visualize spending, track subscriptions, and analyze trends without your data ever leaving your browser.

## Features

- **🔒 Local-First**: All data is stored in your browser's `localStorage`. No server uploads.
- **📁 CSV Import**: Drag-and-drop support for bank (chequing) and credit card CSV exports.
- **🏷️ Auto-Categorization**: Intelligent rules to categorize merchants (e.g., Uber → Dining, Amazon → Shopping).
- **📊 Interactive Charts**:
  - Monthly Cash Flow (Income vs Expenses)
  - Spending by Category (Donut chart)
  - Top Merchants ranked by spend
- **💳 Account Analysis**: Distinguish between Credit Card and Chequing transactions.
- **🔄 Subscription Detection**: Automatically identifies recurring payments and estimates monthly costs.
- **⚡ Smart Filtering**:
  - Filter by Date Range (This Month, Last Year, etc.)
  - Filter by Account Type
  - Search by Merchant or Description

## Project Structure

```
dashboard/
├── src/
│   ├── components/       # UI Components
│   │   ├── FileUpload.jsx    # CSV parsing & dropzone
│   │   ├── KPICards.jsx      # Top stats (Net Flow, etc.)
│   │   ├── SpendingChart.jsx # Bar chart
│   │   ├── TransactionTable.jsx # Data grid with filters
│   │   └── Subscriptions.jsx # Recurring payment detector
│   ├── utils/
│   │   ├── parseCSV.js       # CSV parsing logic
│   │   └── categorize.js     # Merchant categorization rules
│   ├── App.jsx           # Main application logic & state
│   └── index.css         # Design system & theme
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open the app**:
   Visit `http://localhost:5173/` in your browser.

## Tech Stack

- **React**: UI Framework
- **Vite**: Build tool and dev server
- **Chart.js**: Data visualization
- **Lucide React**: Icons
- **PapaParse**: Fast CSV parsing
