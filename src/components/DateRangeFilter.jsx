import { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const PRESETS = [
    { label: 'All Time', value: 'all' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Last 3 Months', value: 'last3Months' },
    { label: 'Last 6 Months', value: 'last6Months' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Last Year', value: 'lastYear' }
];

function getDateRange(preset) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (preset) {
        case 'thisMonth':
            return { start: startOfMonth, end: now };
        case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: lastMonthStart, end: lastMonthEnd };
        case 'last3Months':
            return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
        case 'last6Months':
            return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: now };
        case 'thisYear':
            return { start: new Date(now.getFullYear(), 0, 1), end: now };
        case 'lastYear':
            return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31) };
        default:
            return { start: null, end: null };
    }
}

export default function DateRangeFilter({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedLabel = PRESETS.find(p => p.value === value)?.label || 'All Time';

    const handleSelect = (preset) => {
        onChange(preset);
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                }}
            >
                <Calendar size={16} />
                {selectedLabel}
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 0',
                    zIndex: 100,
                    minWidth: '160px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    {PRESETS.map(preset => (
                        <div
                            key={preset.value}
                            onClick={() => handleSelect(preset.value)}
                            style={{
                                padding: '8px 16px',
                                cursor: 'pointer',
                                background: value === preset.value ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                color: value === preset.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontSize: '0.875rem'
                            }}
                        >
                            {preset.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Utility function to filter transactions by date range
export function filterByDateRange(transactions, preset) {
    if (preset === 'all' || !preset) return transactions;

    const { start, end } = getDateRange(preset);
    if (!start || !end) return transactions;

    return transactions.filter(t => {
        const date = t.date;
        return date >= start && date <= end;
    });
}
