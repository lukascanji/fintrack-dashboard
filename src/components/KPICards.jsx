import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpDown } from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function KPICard({ title, value, icon: Icon, trend, isPositive }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className="card-title">{title}</div>
                    <div className={`card-value ${isPositive === true ? 'positive' : isPositive === false ? 'negative' : ''}`}>
                        {value}
                    </div>
                    {trend && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '8px',
                            fontSize: '0.875rem',
                            color: trend > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}>
                            {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {Math.abs(trend).toFixed(1)}% vs last month
                        </div>
                    )}
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--gradient-primary)',
                    opacity: 0.8
                }}>
                    <Icon size={24} color="white" />
                </div>
            </div>
        </div>
    );
}

export default function KPICards({ stats }) {
    if (!stats) return null;

    return (
        <div className="kpi-grid">
            <KPICard
                title="Total Spending"
                value={formatCurrency(stats.totalSpend)}
                icon={CreditCard}
            />
            <KPICard
                title="Total Income"
                value={formatCurrency(stats.totalIncome)}
                icon={DollarSign}
            />
            <KPICard
                title="Net Flow"
                value={formatCurrency(stats.netFlow)}
                icon={ArrowUpDown}
                isPositive={stats.netFlow >= 0}
            />
            <KPICard
                title="Avg Monthly Spend"
                value={formatCurrency(stats.avgMonthlySpend)}
                icon={TrendingUp}
            />
        </div>
    );
}
