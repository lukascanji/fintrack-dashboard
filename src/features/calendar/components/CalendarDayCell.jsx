import React from 'react';
import { RefreshCw } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categorize';

export default function CalendarDayCell({
    cell,
    onSelect,
    getDisplayMerchantInfo
}) {
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

    return (
        <div
            onClick={() => onSelect(cell.date)}
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
                transition: 'background 0.15s'
            }}
        >
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
