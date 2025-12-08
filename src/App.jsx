import { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutDashboard, Upload, Receipt, Settings, Wallet, RefreshCw, Trash2, CalendarDays, Download, Users } from 'lucide-react';
import FileUpload from './components/FileUpload';
import KPICards from './components/KPICards';
import SpendingChart from './components/SpendingChart';
import CategoryDonut from './components/CategoryDonut';
import TopMerchants from './components/TopMerchants';
import Alerts from './components/Alerts';
import TransactionTable from './components/TransactionTable';
import Subscriptions from './components/Subscriptions';
import CalendarView from './components/CalendarView';
import People from './components/People';
import DateRangeFilter, { filterByDateRange } from './components/DateRangeFilter';
import { calculateStats } from './utils/parseCSV';
import { categorizeMerchant } from './utils/categorize';
import Toast from './components/Toast';
import './App.css';

const STORAGE_KEY = 'fintrack_transactions';

// Helper to serialize/deserialize dates
function serializeTransactions(transactions) {
  return transactions.map(t => ({
    ...t,
    date: t.date.toISOString()
  }));
}

function deserializeTransactions(data) {
  return data.map(t => {
    // Re-categorize based on current rules (including user-defined)
    const { merchant, category } = categorizeMerchant(t.description);
    return {
      ...t,
      date: new Date(t.date),
      merchant,
      category
    };
  });
}


function App() {
  const [transactions, setTransactions] = useState(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return deserializeTransactions(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
    return [];
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [dateRange, setDateRange] = useState('all');
  const [toast, setToast] = useState(null);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Recategorize all transactions based on current rules
  const recategorizeAll = useCallback(() => {
    setTransactions(prev => {
      const updated = prev.map(t => {
        const { merchant, category } = categorizeMerchant(t.description);
        return { ...t, merchant, category };
      });
      return updated;
    });
  }, []);

  // Save to localStorage whenever transactions change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTransactions(transactions)));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }, [transactions]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() =>
    filterByDateRange(transactions, dateRange),
    [transactions, dateRange]
  );

  const stats = useMemo(() => calculateStats(filteredTransactions), [filteredTransactions]);

  const handleDataLoaded = useCallback((newTransactions) => {
    setTransactions(prev => {
      // Merge and deduplicate by id
      const existingIds = new Set(prev.map(t => t.id));
      const unique = newTransactions.filter(t => !existingIds.has(t.id));
      return [...prev, ...unique];
    });
  }, []);

  const handleClearData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all transaction data?')) {
      setTransactions([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleExportData = useCallback(() => {
    if (transactions.length === 0) return;

    // Create CSV content
    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Debit', 'Credit', 'Account Type'];
    const rows = transactions.map(t => [
      t.date.toISOString().split('T')[0],
      `"${t.description.replace(/"/g, '""')}"`,
      t.merchant,
      t.category,
      t.debit.toFixed(2),
      t.credit.toFixed(2),
      t.accountType
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Wallet size={24} style={{ marginRight: '8px' }} />
          FinTrack
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </div>
          <div
            className={`nav-item ${activeView === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveView('upload')}
          >
            <Upload size={20} />
            Import Data
          </div>
          <div
            className={`nav-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveView('transactions')}
          >
            <Receipt size={20} />
            Transactions
          </div>
          <div
            className={`nav-item ${activeView === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveView('subscriptions')}
          >
            <RefreshCw size={20} />
            Recurring
          </div>
          <div
            className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <CalendarDays size={20} />
            Calendar
          </div>
          <div
            className={`nav-item ${activeView === 'people' ? 'active' : ''}`}
            onClick={() => setActiveView('people')}
          >
            <Users size={20} />
            People
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          {transactions.length > 0 && (
            <>
              <div
                className="nav-item"
                onClick={handleExportData}
                style={{ color: 'var(--accent-primary)' }}
              >
                <Download size={20} />
                Export CSV
              </div>
              <div
                className="nav-item"
                onClick={handleClearData}
                style={{ color: 'var(--accent-danger)' }}
              >
                <Trash2 size={20} />
                Clear Data
              </div>
            </>
          )}
          <div className="nav-item">
            <Settings size={20} />
            Settings
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeView === 'upload' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Import Data</h1>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} existingTransactions={transactions} />
          </>
        )}

        {activeView === 'dashboard' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Financial Dashboard</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {transactions.length > 0 && (
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                )}
                {transactions.length === 0 && (
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                )}
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <Wallet className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Data Yet</div>
                  <div className="empty-state-text">
                    Upload your bank and credit card CSV files to see your financial insights.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Your First CSV
                  </button>
                </div>
              </div>
            ) : (
              <>
                <KPICards stats={stats} />

                <Alerts stats={stats} categoryBreakdown={stats.categoryBreakdown} />

                <div className="charts-grid">
                  <SpendingChart monthlyData={stats.monthlyData} />
                  <CategoryDonut categoryBreakdown={stats.categoryBreakdown} />
                </div>

                <TopMerchants merchantBreakdown={stats.merchantBreakdown} />
              </>
            )}
          </>
        )}

        {activeView === 'transactions' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Transactions</h1>
            </div>
            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <Receipt className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Transactions</div>
                  <div className="empty-state-text">
                    Import CSV files to view your transaction history.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                </div>
              </div>
            ) : (
              <TransactionTable transactions={transactions} showToast={showToast} onRecategorize={recategorizeAll} />
            )}
          </>
        )}

        {activeView === 'subscriptions' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Recurring</h1>
            </div>
            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <RefreshCw className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Data</div>
                  <div className="empty-state-text">
                    Import CSV files to detect recurring subscriptions.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                </div>
              </div>
            ) : (
              <Subscriptions transactions={transactions} />
            )}
          </>
        )}

        {activeView === 'calendar' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Calendar</h1>
            </div>
            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <CalendarDays className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Data</div>
                  <div className="empty-state-text">
                    Import CSV files to see your spending calendar.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                </div>
              </div>
            ) : (
              <CalendarView transactions={transactions} />
            )}
          </>
        )}

        {activeView === 'people' && (
          <>
            <div className="section-header">
              <h1 className="section-title">People</h1>
            </div>
            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <Users className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Data</div>
                  <div className="empty-state-text">
                    Import CSV files to track shared expenses.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                </div>
              </div>
            ) : (
              <People transactions={transactions} />
            )}
          </>
        )}
      </main>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
