import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Upload, Receipt, Settings, Wallet, RefreshCw, Trash2, CalendarDays, Download, Users, FileText, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Sidebar collapse state with persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fintrack_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Page transition state
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Ref for main content scroll
  const mainContentRef = useRef(null);

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('fintrack_sidebar_collapsed', String(newState));
      return newState;
    });
  }, []);

  // Handle tab change from sidebar - resets filters and scrolls to top
  const handleTabChange = useCallback((view) => {
    // Start transition animation
    setIsTransitioning(true);

    // Reset all filters to default
    setTransactionFilters(null);
    setDateRange('all');
    setCustomDateRange({ start: null, end: null });

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Set the new view
    setActiveView(view);

    // End transition after brief delay
    setTimeout(() => setIsTransitioning(false), 150);
  }, []);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Handle navigation from Sankey to Transactions with preset filters (preserves filters)
  const handleNavigateToTransactions = useCallback((filters) => {
    // Set filters first, then navigate - use object with timestamp to force update
    setTransactionFilters({ ...filters, _ts: Date.now() });
    setActiveView('transactions');
    // Scroll to top for cross-component navigation too
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key - close modals (handled by individual modals, but we can close toast)
      if (e.key === 'Escape') {
        setToast(null);
      }

      // Ctrl/Cmd + F - focus search when on transactions
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeView === 'transactions') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search..."]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

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
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <Wallet size={24} style={{ marginRight: sidebarCollapsed ? '0' : '8px' }} />
          {!sidebarCollapsed && 'FinTrack'}
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
            title="Dashboard"
          >
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && 'Dashboard'}
          </div>
          <div
            className={`nav-item ${activeView === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabChange('upload')}
            title="Import Data"
          >
            <Upload size={20} />
            {!sidebarCollapsed && 'Import Data'}
          </div>
          <div
            className={`nav-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => handleTabChange('transactions')}
            title="Transactions"
          >
            <Receipt size={20} />
            {!sidebarCollapsed && 'Transactions'}
          </div>
          <div
            className={`nav-item ${activeView === 'subscriptions' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscriptions')}
            title="Recurring"
          >
            <RefreshCw size={20} />
            {!sidebarCollapsed && 'Recurring'}
          </div>
          <div
            className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => handleTabChange('calendar')}
            title="Calendar"
          >
            <CalendarDays size={20} />
            {!sidebarCollapsed && 'Calendar'}
          </div>
          <div
            className={`nav-item ${activeView === 'flow' ? 'active' : ''}`}
            onClick={() => handleTabChange('flow')}
            title="Flow"
          >
            <GitBranch size={20} />
            {!sidebarCollapsed && 'Flow'}
          </div>
          <div
            className={`nav-item ${activeView === 'people' ? 'active' : ''}`}
            onClick={() => handleTabChange('people')}
            title="People"
          >
            <Users size={20} />
            {!sidebarCollapsed && 'People'}
          </div>
          <div
            className={`nav-item ${activeView === 'rules' ? 'active' : ''}`}
            onClick={() => handleTabChange('rules')}
            title="Rules"
          >
            <FileText size={20} />
            {!sidebarCollapsed && 'Rules'}
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          {transactions.length > 0 && (
            <>
              <div
                className="nav-item"
                onClick={handleExportData}
                style={{ color: 'var(--accent-primary)' }}
                title="Export CSV"
              >
                <Download size={20} />
                {!sidebarCollapsed && 'Export CSV'}
              </div>
              <div
                className="nav-item"
                onClick={handleClearData}
                style={{ color: 'var(--accent-danger)' }}
                title="Clear Data"
              >
                <Trash2 size={20} />
                {!sidebarCollapsed && 'Clear Data'}
              </div>
            </>
          )}
          <div className="nav-item" title="Settings">
            <Settings size={20} />
            {!sidebarCollapsed && 'Settings'}
          </div>

          {/* Sidebar collapse toggle */}
          <div
            className="nav-item"
            onClick={toggleSidebar}
            style={{ marginTop: '8px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!sidebarCollapsed && 'Collapse'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isTransitioning ? 'transitioning' : ''}`} ref={mainContentRef}>
        {activeView === 'upload' && (
          <>
            <div className="section-header">
              <h1 className="section-title">Import Data</h1>
            </div>
            <FileUpload showToast={showToast} />
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
