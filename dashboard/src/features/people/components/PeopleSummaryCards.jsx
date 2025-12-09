import React from 'react';

export default function PeopleSummaryCards({ peopleData }) {
    const totalSpent = peopleData.reduce((sum, p) => sum + p.sent, 0);
    const totalReceived = peopleData.reduce((sum, p) => sum + p.received, 0);
    const outstanding = peopleData.filter(p => !p.isSettled).length;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Total Spent on Others
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-danger)' }}>
                    ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Total Received Back
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                    ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Outstanding
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                    {outstanding} people
                </div>
            </div>
        </div>
    );
}
