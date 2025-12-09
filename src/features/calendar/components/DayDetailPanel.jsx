import React from 'react';
import { X, Users, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categorize';

export default function DayDetailPanel({
    selectedDate,
    transactions,
    renewals,
    personNames,
    getDisplayMerchantInfo,
    onClose
}) {
    if (!selectedDate) {
        return (
            <div className="card" style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                    <div style={{ fontSize: '0.875rem' }}>Click a day to see details</div>
                </div>
            </div>
        );
    }

    const dayNet = transactions.reduce((sum, t) => sum + t.credit - t.debit, 0);

    return (
        <div className="card" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="card-title" style={{ margin: 0 }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X size={16} />
                </button>
            </div>

            {transactions.length === 0 && renewals.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '24px' }}>
                    No transactions on this day
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Actual transactions */}
                    {transactions.map((t, i) => {
                        const merchantInfo = getDisplayMerchantInfo(t);
                        return (
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
                                        <span
                                            style={{ fontSize: '0.875rem', fontWeight: '500' }}
                                            title={merchantInfo.isRenamed ? `Original: ${merchantInfo.originalName}` : undefined}
                                        >
                                            {merchantInfo.displayName}
                                        </span>
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
                        );
                    })}

                    {/* Projected renewals */}
                    {renewals.map((r, i) => (
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
            {transactions.length > 0 && (
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
                    <span style={{ fontWeight: '700', color: dayNet >= 0 ? 'var(--accent-success)' : 'inherit' }}>
                        {dayNet >= 0 ? `+$${dayNet.toFixed(2)}` : `-$${Math.abs(dayNet).toFixed(2)}`}
                    </span>
                </div>
            )}
        </div>
    );
}
