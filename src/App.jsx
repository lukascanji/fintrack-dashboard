import { useState, useMemo, useEffect, useCallback } from 'react';
import { LayoutDashboard, Upload, Receipt, Settings, Wallet, RefreshCw, Trash2, CalendarDays, Download, Users, FileText, GitBranch } from 'lucide-react';
import FileUpload from './components/FileUpload';
import KPICards from './components/KPICards';
import SpendingChart from './components/SpendingChart';
import CategoryDonut from './components/CategoryDonut';
import TopMerchants from './components/TopMerchants';
import Alerts from './components/Alerts';
import TransactionTable from './components/TransactionTable';
import Subscriptions from './components/Subscriptions';
import CalendarView from './components/CalendarView';
import SankeyFlow from './components/SankeyFlow';
import People from './components/People';
import Rules from './components/Rules';
import DateRangeFilter, { filterByDateRange } from './components/DateRangeFilter';
import { calculateStats } from './utils/stats';
import { categorizeMerchant } from './utils/categorize';
import Toast from './components/Toast';
import { useEnrichedTransactions } from './hooks/useEnrichedTransactions';
import './App.css';

function App() {
  const {
    transactions,
    clearTransactions
  } = useEnrichedTransactions();

  const [activeView, setActiveView] = useState('dashboard');
  const [dateRange, setDateRange] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [toast, setToast] = useState(null);

  // Shared filter state for cross-component navigation (e.g., Sankey -> Transactions)
  const [transactionFilters, setTransactionFilters] = useState(null);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Handle navigation from Sankey to Transactions with preset filters
  const handleNavigateToTransactions = useCallback((filters) => {
    // Set filters first, then navigate - use object with timestamp to force update
    setTransactionFilters({ ...filters, _ts: Date.now() });
    setActiveView('transactions');
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() =>
    filterByDateRange(transactions, dateRange, customDateRange),
    [transactions, dateRange, customDateRange]
  );

  const stats = useMemo(() => calculateStats(filteredTransactions), [filteredTransactions]);

  const handleClearData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all transaction data?')) {
      clearTransactions();
    }
  }, [clearTransactions]);



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
            className={`nav-item ${activeView === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveView('flow')}
          >
            <GitBranch size={20} />
            Flow
          </div>
          <div
            className={`nav-item ${activeView === 'people' ? 'active' : ''}`}
            onClick={() => setActiveView('people')}
          >
            <Users size={20} />
            People
          </div>
          <div
            className={`nav-item ${activeView === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveView('rules')}
          >
            <FileText size={20} />
            Rules
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
            <FileUpload />
          </>
        )}

        {activeView === 'dashboard' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Financial Dashboard</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {transactions.length > 0 && (
                  <DateRangeFilter
                    value={dateRange}
                    onChange={setDateRange}
                    customDates={customDateRange}
                    onCustomDatesChange={setCustomDateRange}
                  />
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

                <div className="charts-grid">
                  <SpendingChart
                    monthlyData={stats.monthlyData}
                    onNavigateToTransactions={handleNavigateToTransactions}
                  />
                  <CategoryDonut
                    categoryBreakdown={stats.categoryBreakdown}
                    onNavigateToTransactions={handleNavigateToTransactions}
                    currentDateRange={dateRange}
                    currentCustomDates={customDateRange}
                  />
                </div>

                <Alerts stats={stats} categoryBreakdown={stats.categoryBreakdown} />

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
              <TransactionTable showToast={showToast} presetFilters={transactionFilters} />
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
              <Subscriptions />
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
              <CalendarView />
            )}
          </>
        )}

        {activeView === 'flow' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Money Flow</h1>
            </div>
            {transactions.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <GitBranch className="empty-state-icon" size={80} />
                  <div className="empty-state-title">No Data</div>
                  <div className="empty-state-text">
                    Import CSV files to visualize your money flow.
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveView('upload')}>
                    <Upload size={16} />
                    Import Data
                  </button>
                </div>
              </div>
            ) : (
              <SankeyFlow onNavigateToTransactions={handleNavigateToTransactions} />
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
              <People />
            )}
          </>
        )}

        {activeView === 'rules' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Rules</h1>
            </div>
            <Rules />
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
