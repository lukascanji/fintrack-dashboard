import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categorize';

export default function CalendarDayCell({
    cell,
    onSelect,
    getDisplayMerchantInfo
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!cell.day) {
        return (
            <div style={{
                minHeight: '80px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                opacity: 0.3
            }} />
        );
    }

    // Calculate summary for tooltip
    const totalSpent = cell.transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalIncome = cell.transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const topMerchants = cell.transactions
        .slice(0, 3)
        .map(t => getDisplayMerchantInfo(t).displayName);

    return (
        <div
            onClick={() => onSelect(cell.date)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
                minHeight: '80px',
                padding: '8px',
                background: cell.isSelected
                    ? 'rgba(99, 102, 241, 0.2)'
                    : cell.isToday
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: cell.isToday ? '1px solid var(--accent-success)' : '1px solid transparent',
                cursor: 'pointer',
                opacity: cell.isPast ? 0.7 : 1,
                transition: 'background 0.15s',
                position: 'relative'
            }}
        >
            {/* Hover tooltip */}
            {showTooltip && (cell.transactions.length > 0 || cell.renewals.length > 0) && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    zIndex: 100,
                    minWidth: '160px',
                    maxWidth: '220px',
                    pointerEvents: 'none'
                }}>
                    {/* Arrow */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: '10px',
                        height: '10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderTop: 'none',
                        borderLeft: 'none'
                    }} />

                    {/* Content */}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {cell.transactions.length} transaction{cell.transactions.length !== 1 ? 's' : ''}
                    </div>

                    {totalSpent > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Spent:</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: '600' }}>
                                -${totalSpent.toFixed(2)}
                            </span>
                        </div>
                    )}

                    {totalIncome > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Income:</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600' }}>
                                +${totalIncome.toFixed(2)}
                            </span>
                        </div>
                    )}

                    {topMerchants.length > 0 && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                            {topMerchants.map((name, i) => (
                                <div key={i} style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {name}
                                </div>
                            ))}
                            {cell.transactions.length > 3 && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    +{cell.transactions.length - 3} more
                                </div>
                            )}
                        </div>
                    )}

                    {cell.renewals.length > 0 && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RefreshCw size={10} color="var(--accent-primary)" />
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                                {cell.renewals.length} renewal{cell.renewals.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div style={{
                fontSize: '0.875rem',
                fontWeight: cell.isToday ? '700' : '500',
                color: cell.isToday ? 'var(--accent-success)' : 'var(--text-primary)',
                marginBottom: '4px'
            }}>
                {cell.day}
            </div>

            {/* Transaction dots */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                {cell.transactions.slice(0, 5).map((t, j) => (
                    <div
                        key={j}
                        style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: t.credit > 0 ? 'var(--accent-success)' : getCategoryColor(t.category)
                        }}
                        title={`${getDisplayMerchantInfo(t).displayName}: ${t.debit > 0 ? '-$' + t.debit.toFixed(2) : '+$' + t.credit.toFixed(2)}`}
                    />
                ))}
                {cell.transactions.length > 5 && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                        +{cell.transactions.length - 5}
                    </div>
                )}
            </div>

            {/* Subscription renewal markers */}
            {cell.renewals.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    fontSize: '0.6rem',
                    color: 'var(--accent-primary)'
                }}>
                    <RefreshCw size={10} />
                    <span>{cell.renewals.length}</span>
                </div>
            )}
        </div>
    );
}
