import React from 'react';

export default function PaymentHistory({ transactions }) {
    if (!transactions || transactions.length === 0) return null;

    return (
        <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Payment History
            </div>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ color: 'var(--text-secondary)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Amount</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Change</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.slice().reverse().slice(0, 10).map((txn, j, arr) => {
                        const amount = txn.amount || txn.debit;
                        const prevTxn = j < arr.length - 1 ? arr[j + 1] : null;
                        const prevAmount = prevTxn ? (prevTxn.amount || prevTxn.debit) : amount;
                        const change = prevTxn ? amount - prevAmount : 0;
                        return (
                            <tr key={j} style={{ borderTop: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '6px 8px' }}>{new Date(txn.date).toLocaleDateString()}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>${amount.toFixed(2)}</td>
                                <td style={{
                                    padding: '6px 8px',
                                    textAlign: 'right',
                                    color: change > 0 ? 'var(--accent-danger)' : change < 0 ? 'var(--accent-success)' : 'var(--text-secondary)'
                                }}>
                                    {change !== 0 ? `${change > 0 ? '+' : ''}$${change.toFixed(2)}` : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {transactions.length > 10 && (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Showing 10 of {transactions.length} payments
                </div>
            )}
        </div>
    );
}
