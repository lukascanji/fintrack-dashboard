import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PaymentTimeline({ transactions }) {
    if (!transactions || transactions.length === 0) return null;

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Payment Timeline
            </div>
            <div style={{
                overflowX: 'auto',
                paddingBottom: '8px',
                position: 'relative'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '16px',
                    minWidth: 'max-content',
                    paddingTop: '24px'
                }}>
                    {transactions.map((txn, idx) => {
                        const prevTxn = idx > 0 ? transactions[idx - 1] : null;
                        const amount = txn.amount || txn.debit;
                        const prevAmount = prevTxn ? (prevTxn.amount || prevTxn.debit) : 0;
                        const priceIncrease = prevTxn && (amount - prevAmount) > 0.5;
                        const priceDecrease = prevTxn && (prevAmount - amount) > 0.5;

                        return (
                            <div key={idx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                position: 'relative'
                            }}>
                                {/* Price change indicator */}
                                {priceIncrease && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        color: 'var(--accent-danger)',
                                        fontSize: '0.65rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <TrendingUp size={12} />
                                        <span>+${(amount - prevAmount).toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDecrease && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        color: 'var(--accent-success)',
                                        fontSize: '0.65rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <TrendingDown size={12} />
                                        <span>-${(prevAmount - amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {/* Timeline node */}
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: priceIncrease
                                        ? 'var(--accent-danger)'
                                        : priceDecrease
                                            ? 'var(--accent-success)'
                                            : 'var(--accent-primary)',
                                    border: '2px solid var(--bg-card)'
                                }} />
                                {/* Connecting line */}
                                {idx < transactions.length - 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '14px',
                                        width: '16px',
                                        height: '2px',
                                        background: 'var(--border-color)',
                                        transform: 'translateY(-50%)'
                                    }} />
                                )}
                                {/* Date label */}
                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '0.6rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                {/* Amount */}
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--text-primary)',
                                    fontWeight: '500'
                                }}>
                                    ${amount.toFixed(2)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
