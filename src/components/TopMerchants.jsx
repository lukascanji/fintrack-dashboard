import { getCategoryColor } from '../utils/categorize';

export default function TopMerchants({ merchantBreakdown }) {
    if (!merchantBreakdown || Object.keys(merchantBreakdown).length === 0) return null;

    const sortedMerchants = Object.entries(merchantBreakdown)
        .filter(([name]) => !['E-TRANSFER', 'CC PAYMENT', 'CASH WITHDRAWAL'].includes(name))
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);

    const maxValue = sortedMerchants[0]?.[1].total || 1;

    return (
        <div className="card">
            <div className="card-title">Top Merchants</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedMerchants.map(([name, data]) => (
                    <div key={name}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {name}
                                </span>
                                <span
                                    className={`category-badge ${data.category === 'GAMBLING' ? 'gambling' : ''} ${data.category === 'FEES' ? 'fees' : ''}`}
                                    style={{ fontSize: '0.65rem' }}
                                >
                                    {data.category}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                ${data.total.toLocaleString()}
                            </span>
                        </div>
                        <div style={{
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(data.total / maxValue) * 100}%`,
                                background: getCategoryColor(data.category),
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
