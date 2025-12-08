import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, X, Users, ArrowDownLeft } from 'lucide-react';
import { getCategoryColor, getMerchantKey } from '../utils/categorize';
import { detectSubscriptions } from './Subscriptions';

const NAMES_STORAGE_KEY = 'fintrack_person_names';
const GLOBAL_RENAMES_KEY = 'fintrack_global_renames';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

export default function CalendarView({ transactions }) {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);

    // Load person names from localStorage
    const [personNames, setPersonNames] = useState(() => {
        try {
            const saved = localStorage.getItem(NAMES_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Listen for localStorage changes from other components
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const saved = localStorage.getItem(NAMES_STORAGE_KEY);
                setPersonNames(saved ? JSON.parse(saved) : {});
            } catch {
                setPersonNames({});
            }
        };
        window.addEventListener('storage', handleStorageChange);
        // Also check on focus
        window.addEventListener('focus', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleStorageChange);
        };
    }, []);

    // Load global renames from localStorage
    const [globalRenames, setGlobalRenames] = useState(() => {
        try {
            const saved = localStorage.getItem(GLOBAL_RENAMES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Listen for global renames changes
    useEffect(() => {
        const handleRenameChange = () => {
            try {
                const saved = localStorage.getItem(GLOBAL_RENAMES_KEY);
                setGlobalRenames(saved ? JSON.parse(saved) : {});
            } catch {
                // ignore
            }
        };
        window.addEventListener('storage', handleRenameChange);
        window.addEventListener('focus', handleRenameChange);
        return () => {
            window.removeEventListener('storage', handleRenameChange);
            window.removeEventListener('focus', handleRenameChange);
        };
    }, []);

    // Get display info for merchant (apply global renames)
    // Returns { displayName, originalName, isRenamed }
    const getDisplayMerchantInfo = (t) => {
        // Use description for key (same as detectSubscriptions in Subscriptions.jsx)
        const merchantKey = getMerchantKey(t.description);
        const txnAmount = Math.abs(t.amount || t.debit || t.credit || 0).toFixed(2);
        const amountKey = `${merchantKey}-${txnAmount}`;

        if (globalRenames[amountKey]?.displayName) {
            return {
                displayName: globalRenames[amountKey].displayName,
                originalName: t.description,
                isRenamed: true
            };
        }
        if (globalRenames[merchantKey]?.displayName) {
            return {
                displayName: globalRenames[merchantKey].displayName,
                originalName: t.description,
                isRenamed: true
            };
        }

        // Fallback search by originalMerchant + amount
        for (const [key, rename] of Object.entries(globalRenames)) {
            if (rename.originalMerchant && rename.amount) {
                const renameOrigKey = getMerchantKey(rename.originalMerchant);
                const renameAmount = rename.amount.toFixed(2);
                if (renameOrigKey === merchantKey && renameAmount === txnAmount) {
                    return {
                        displayName: rename.displayName,
                        originalName: t.description,
                        isRenamed: true
                    };
                }
            }
        }

        return {
            displayName: t.merchant,
            originalName: t.description,
            isRenamed: false
        };
    };

    // Detect subscriptions for future projections
    const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);

    // Build map of date -> transactions
    const transactionsByDate = useMemo(() => {
        const map = {};
        transactions.forEach(t => {
            const key = t.date.toDateString();
            if (!map[key]) map[key] = [];
            map[key].push(t);
        });
        return map;
    }, [transactions]);

    // Build projected subscription renewals for FUTURE dates only
    const projectedRenewals = useMemo(() => {
        const renewals = {};
        const endDate = new Date(currentYear, currentMonth + 3, 0);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        subscriptions.forEach(sub => {
            let nextDate = new Date(sub.nextDate);
            while (nextDate <= endDate) {
                // Only show projections for TODAY or FUTURE dates
                if (nextDate >= todayStart) {
                    const key = nextDate.toDateString();
                    if (!renewals[key]) renewals[key] = [];
                    renewals[key].push({
                        merchant: sub.merchant,
                        amount: sub.latestAmount,
                        frequency: sub.frequency,
                        isProjected: true
                    });
                }

                // Calculate next occurrence
                if (sub.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (sub.frequency === 'Bi-Weekly') nextDate.setDate(nextDate.getDate() + 14);
                else if (sub.frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                else if (sub.frequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                else if (sub.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else break;
            }
        });
        return renewals;
    }, [subscriptions, currentYear, currentMonth, today]);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
        setSelectedDate(null);
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
        setSelectedDate(null);
    };

    const goToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDate(null);
    };

    // Get transactions for selected date
    const selectedDateTransactions = selectedDate
        ? transactionsByDate[selectedDate.toDateString()] || []
        : [];
    const selectedDateRenewals = selectedDate
        ? projectedRenewals[selectedDate.toDateString()] || []
        : [];

    // Build calendar grid
    const calendarDays = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ day: null, date: null });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = date.toDateString();
        const dayTransactions = transactionsByDate[dateKey] || [];
        const dayRenewals = projectedRenewals[dateKey] || [];
        const isToday = isSameDay(date, today);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const isPast = date < today;

        calendarDays.push({
            day,
            date,
            transactions: dayTransactions,
            renewals: dayRenewals,
            isToday,
            isSelected,
            isPast
        });
    }

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            {/* Calendar */}
            <div className="card" style={{ flex: 2 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={goToPrevMonth}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, minWidth: '180px', textAlign: 'center' }}>
                            {MONTHS[currentMonth]} {currentYear}
                        </h2>
                        <button
                            onClick={goToNextMonth}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                        Today
                    </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {DAYS.map(day => (
                        <div key={day} style={{
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            padding: '8px'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {calendarDays.map((cell, i) => (
                        <div
                            key={i}
                            onClick={() => cell.date && setSelectedDate(cell.date)}
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
                                cursor: cell.date ? 'pointer' : 'default',
                                opacity: cell.day ? (cell.isPast ? 0.7 : 1) : 0.3,
                                transition: 'background 0.15s'
                            }}
                        >
                            {cell.day && (
                                <>
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
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('DINING') }} />
                        Dining
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('SHOPPING') }} />
                        Shopping
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('SUBSCRIPTIONS') }} />
                        Subscriptions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={10} color="var(--accent-primary)" />
                        Projected Renewal
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-success)' }} />
                        Income
                    </div>
                </div>
            </div>

            {/* Day detail panel */}
            <div className="card" style={{ flex: 1, minWidth: '280px' }}>
                {selectedDate ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div className="card-title" style={{ margin: 0 }}>
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {selectedDateTransactions.length === 0 && selectedDateRenewals.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '24px' }}>
                                No transactions on this day
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Actual transactions */}
                                {selectedDateTransactions.map((t, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '6px',
                                            borderLeft: `3px solid ${t.credit > 0 ? 'var(--accent-success)' : getCategoryColor(t.category)}`
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '500' }} title={getDisplayMerchantInfo(t).isRenamed ? `Original: ${getDisplayMerchantInfo(t).originalName}` : undefined}>{getDisplayMerchantInfo(t).displayName}</span>
                                                {personNames[t.id] && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        padding: '1px 6px',
                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                        borderRadius: '10px',
                                                        fontSize: '0.6rem',
                                                        color: 'var(--accent-primary)'
                                                    }}>
                                                        <Users size={8} />
                                                        {personNames[t.id]}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                {t.credit > 0 && <ArrowDownLeft size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                                                {t.category}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '600', color: t.debit > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                                            {t.debit > 0 ? `-$${t.debit.toFixed(2)}` : `+$${t.credit.toFixed(2)}`}
                                        </div>
                                    </div>
                                ))}

                                {/* Projected renewals */}
                                {selectedDateRenewals.map((r, i) => (
                                    <div
                                        key={`proj-${i}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            borderRadius: '6px',
                                            borderLeft: '3px solid var(--accent-primary)',
                                            borderStyle: 'dashed'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <RefreshCw size={14} color="var(--accent-primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{r.merchant}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {r.frequency} (projected)
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                                            ~${r.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Day total */}
                        {selectedDateTransactions.length > 0 && (
                            <div style={{
                                marginTop: '16px',
                                paddingTop: '12px',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.875rem'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Day Net</span>
                                <span style={{ fontWeight: '700', color: (selectedDateTransactions.reduce((sum, t) => sum + t.credit - t.debit, 0)) >= 0 ? 'var(--accent-success)' : 'inherit' }}>
                                    {(() => {
                                        const net = selectedDateTransactions.reduce((sum, t) => sum + t.credit - t.debit, 0);
                                        return net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                        <div style={{ fontSize: '0.875rem' }}>Click a day to see details</div>
                    </div>
                )}
            </div>
        </div>
    );
}
