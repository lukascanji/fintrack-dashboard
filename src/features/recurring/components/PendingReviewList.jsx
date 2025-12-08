import React from 'react';
import { Check, X } from 'lucide-react';

export default function PendingReviewList({
    pendingItems,
    onApprove,
    onDeny
}) {
    if (!pendingItems || pendingItems.length === 0) return null;

    return (
        <div style={{ width: '320px', flexShrink: 0 }}>
            <div className="card" style={{ position: 'sticky', top: '24px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>
                    Pending Review ({pendingItems.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingItems.slice(0, 10).map(sub => (
                        <div
                            key={sub.merchantKey}
                            style={{
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ fontWeight: '500', marginBottom: '2px' }}>{sub.merchant}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {sub.frequency} • ${sub.latestAmount.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    {sub.category}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => onApprove(sub.merchantKey)}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        background: 'var(--accent-success)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <Check size={14} /> Add
                                </button>
                                <button
                                    onClick={() => onDeny(sub.merchantKey)}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'var(--accent-danger)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <X size={14} /> Skip
                                </button>
                            </div>
                        </div>
                    ))}
                    {pendingItems.length > 10 && (
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '8px' }}>
                            + {pendingItems.length - 10} more items
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
