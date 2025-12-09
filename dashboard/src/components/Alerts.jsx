import { AlertTriangle, TrendingUp } from 'lucide-react';

export default function Alerts({ stats, categoryBreakdown }) {
    if (!stats || !categoryBreakdown) return null;

    const alerts = [];

    // Check for gambling spend
    if (categoryBreakdown['GAMBLING'] && categoryBreakdown['GAMBLING'] > 500) {
        alerts.push({
            type: 'danger',
            title: 'High Gambling Spend',
            text: `You've spent $${categoryBreakdown['GAMBLING'].toLocaleString()} on gambling. Consider setting a budget limit.`
        });
    }

    // Check for high fees
    if (categoryBreakdown['FEES'] && categoryBreakdown['FEES'] > 200) {
        alerts.push({
            type: 'warning',
            title: 'Significant Fees Detected',
            text: `$${categoryBreakdown['FEES'].toLocaleString()} spent on fees (bank fees, cash advances, interest). Review your fee sources.`
        });
    }

    // Check for negative net flow
    if (stats.netFlow < -1000) {
        alerts.push({
            type: 'warning',
            title: 'Negative Cash Flow',
            text: `Your net flow is -$${Math.abs(stats.netFlow).toLocaleString()}. You're spending more than you're bringing in.`
        });
    }

    // Check for high average monthly spend
    if (stats.avgMonthlySpend > 3000) {
        alerts.push({
            type: 'warning',
            title: 'High Monthly Spending',
            text: `Average monthly spend of $${stats.avgMonthlySpend.toLocaleString()}. Review your budget.`
        });
    }

    if (alerts.length === 0) {
        return (
            <div className="card">
                <div className="card-title">Insights</div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--accent-success)'
                }}>
                    <TrendingUp size={24} color="var(--accent-success)" />
                    <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Looking Good!</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            No major concerns detected in your spending patterns.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-title">Alerts & Insights</div>
            {alerts.map((alert, i) => (
                <div key={i} className={`alert ${alert.type}`}>
                    <AlertTriangle size={20} color={alert.type === 'danger' ? 'var(--accent-danger)' : 'var(--accent-warning)'} />
                    <div>
                        <div className="alert-title">{alert.title}</div>
                        <div className="alert-text">{alert.text}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
