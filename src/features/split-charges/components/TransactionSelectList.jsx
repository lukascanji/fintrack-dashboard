import React from 'react';

export default function TransactionSelectList({
    transactions,
    bundles,
    onSelect,
    onClearAll
}) {
    if (!transactions || transactions.length === 0) {
        return (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No transactions available to split.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                margin: 0
            }}>
                Use this for transactions that bundle multiple services into one charge.
                For simple renaming, use the ✏️ pencil button instead.
            </p>

            <div style={{ fontSize: '0.8rem', fontWeight: '500', marginTop: '8px' }}>
                Select a transaction to split:
            </div>

            {transactions.map((txn, idx) => {
                const txnKey = `${txn.date.toISOString().split('T')[0]}_${txn.amount.toFixed(2)}`;
                const isSplit = !!bundles[txnKey];

                return (
                    <div
                        key={idx}
                        onClick={() => onSelect(txn)}
                        style={{
                            background: isSplit
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '500' }}>
                                ${txn.amount.toFixed(2)}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                {txn.date.toLocaleDateString()}
                            </div>
                        </div>
                        {isSplit ? (
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-success)'
                            }}>
                                ✓ Split defined
                            </span>
                        ) : (
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-primary)'
                            }}>
                                Click to split →
                            </span>
                        )}
                    </div>
                );
            })}

            {Object.keys(bundles).length > 0 && (
                <button
                    onClick={onClearAll}
                    style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--accent-danger)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}
                >
                    Clear All Splits
                </button>
            )}
        </div>
    );
}
