import React from 'react';
import { X } from 'lucide-react';

export default function PersonTransactions({
    transactions,
    isSettled,
    onRemoveTransaction
}) {
    return (
        <div style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: `1px solid ${isSettled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '300px',
            overflowY: 'auto'
        }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Transaction History
            </div>
            <table style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ color: 'var(--text-secondary)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Description</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Category</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Amount</th>
                        <th style={{ textAlign: 'center', padding: '4px 8px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((txn, j) => (
                        <tr key={j} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px 8px' }}>{txn.date.toLocaleDateString()}</td>
                            <td style={{ padding: '6px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {txn.merchant || txn.description}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                                <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.7rem' }}>
                                    {txn.category}
                                </span>
                            </td>
                            <td style={{
                                padding: '6px 8px',
                                textAlign: 'right',
                                fontWeight: '600',
                                color: txn.debit > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'
                            }}>
                                {txn.debit > 0 ? `-$${txn.debit.toFixed(2)}` : `+$${txn.credit.toFixed(2)}`}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveTransaction(txn.id); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                                    title="Remove association"
                                >
                                    <X size={12} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
