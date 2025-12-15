import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor } from '../utils/categorize';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryDonut({ categoryBreakdown, onNavigateToTransactions, currentDateRange, currentCustomDates }) {
    if (!categoryBreakdown || Object.keys(categoryBreakdown).length === 0) return null;

    const sortedCategories = Object.entries(categoryBreakdown)
        .filter(([cat]) => cat !== 'TRANSFER')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Limit to top 8 for readability

    const totalSpend = sortedCategories.reduce((sum, [, value]) => sum + value, 0);

    const data = {
        labels: sortedCategories.map(([cat]) => cat),
        datasets: [
            {
                data: sortedCategories.map(([, value]) => value),
                backgroundColor: sortedCategories.map(([cat]) => getCategoryColor(cat)),
                borderColor: 'rgba(15, 15, 26, 1)',
                borderWidth: 3,
                hoverOffset: 8
            }
        ]
    };

    // Handle click on chart segment
    const handleClick = (event, elements) => {
        if (!onNavigateToTransactions || elements.length === 0) return;

        const element = elements[0];
        const category = sortedCategories[element.index][0];

        const filters = {
            category: category,
            type: 'spending'
        };

        // Preserve current date range from Dashboard
        if (currentDateRange) {
            filters.period = currentDateRange;
        }
        if (currentCustomDates) {
            filters.customDates = currentCustomDates;
        }

        onNavigateToTransactions(filters);
    };

    // Handle click on legend item
    const handleLegendClick = (category) => {
        if (!onNavigateToTransactions) return;

        const filters = {
            category: category,
            type: 'spending'
        };

        // Preserve current date range from Dashboard
        if (currentDateRange) {
            filters.period = currentDateRange;
        }
        if (currentCustomDates) {
            filters.customDates = currentCustomDates;
        }

        onNavigateToTransactions(filters);
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        onClick: handleClick,
        plugins: {
            legend: {
                display: false // We'll render a custom legend below
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#a0a0b0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        const percentage = ((context.raw / totalSpend) * 100).toFixed(1);
                        return ` $${context.raw.toLocaleString()} (${percentage}%)`;
                    },
                    footer: () => 'Click to view transactions'
                }
            }
        },
        // Add cursor pointer on hover
        onHover: (event, elements) => {
            event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
    };

    return (
        <div className="card">
            <div className="card-title">Spending by Category</div>

            {/* Chart with center label */}
            <div style={{ height: '220px', position: 'relative', marginBottom: '16px' }}>
                <Doughnut data={data} options={options} />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>${totalSpend.toLocaleString()}</div>
                </div>
            </div>

            {/* Custom legend grid - clickable */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px'
            }}>
                {sortedCategories.map(([cat, value]) => (
                    <div
                        key={cat}
                        onClick={() => handleLegendClick(cat)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: onNavigateToTransactions ? 'pointer' : 'default',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (onNavigateToTransactions) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: getCategoryColor(cat),
                            flexShrink: 0
                        }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {cat}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', marginLeft: 'auto' }}>
                            {((value / totalSpend) * 100).toFixed(0)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
