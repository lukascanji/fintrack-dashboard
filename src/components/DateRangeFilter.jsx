import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export const PRESETS = [
    { label: 'All Time', value: 'all' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Last 3 Months', value: 'last3Months' },
    { label: 'Last 6 Months', value: 'last6Months' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Last Year', value: 'lastYear' },
    { label: 'Custom Range', value: 'custom' }
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

export default function DateRangeFilter({ value, onChange, customDates, onCustomDatesChange }) {
    const [isOpen, setIsOpen] = useState(false);

    // Determine label: if custom with dates, show date range
    let selectedLabel;
    if (value === 'custom' && customDates?.start && customDates?.end) {
        const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        selectedLabel = `${formatDate(customDates.start)} - ${formatDate(customDates.end)}`;
    } else {
        selectedLabel = PRESETS.find(p => p.value === value)?.label || 'All Time';
    }

    const handleSelect = (preset) => {
        onChange(preset);
        if (preset !== 'custom') {
            setIsOpen(false);
        }
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
                    minWidth: '200px',
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

                    {value === 'custom' && onCustomDatesChange && (
                        <div style={{
                            padding: '12px 16px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="date"
                                    value={customDates?.start || ''}
                                    onChange={(e) => onCustomDatesChange({ ...customDates, start: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.8rem',
                                        flex: 1
                                    }}
                                />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>to</span>
                                <input
                                    type="date"
                                    value={customDates?.end || ''}
                                    onChange={(e) => onCustomDatesChange({ ...customDates, end: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.8rem',
                                        flex: 1
                                    }}
                                />
                            </div>
                            {customDates?.start && customDates?.end && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'var(--gradient-primary)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        marginTop: '4px'
                                    }}
                                >
                                    Apply
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Utility function to filter transactions by date range
// Now supports both preset strings and custom date objects
export function filterByDateRange(transactions, preset, customDates = null) {
    if (preset === 'all' || !preset) return transactions;

    let start, end;

    if (preset === 'custom' && customDates?.start && customDates?.end) {
        start = new Date(customDates.start);
        end = new Date(customDates.end);
        end.setHours(23, 59, 59, 999); // Include entire end day
    } else {
        const range = getDateRange(preset);
        start = range.start;
        end = range.end;
    }

    if (!start || !end) return transactions;

    return transactions.filter(t => {
        const date = t.date;
        return date >= start && date <= end;
    });
}
