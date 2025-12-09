import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Users } from 'lucide-react';
import NameSelectorDropdown from './NameSelectorDropdown';

export default function AssignedTransactionsList({
    transactions,
    names,
    uniqueNames,
    onAssignName,
    onRemoveName
}) {
    const [nameSelectorOpen, setNameSelectorOpen] = useState(null);

    if (transactions.length === 0) {
        return (
            <div className="card">
                <div className="card-title">All Assigned Transactions</div>
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No transactions assigned to people yet.
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-title">All Assigned Transactions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {transactions.map((t, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                padding: '8px',
                                background: t.debit > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px'
                            }}>
                                {t.debit > 0 ? (
                                    <ArrowUpRight size={16} color="var(--accent-danger)" />
                                ) : (
                                    <ArrowDownLeft size={16} color="var(--accent-success)" />
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                    {t.merchant || t.description}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {t.date.toLocaleDateString()} • {t.category}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                                onClick={() => setNameSelectorOpen(nameSelectorOpen === t.id ? null : t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 12px',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    borderRadius: '16px',
                                    fontSize: '0.8rem',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Users size={12} />
                                {names[t.id]}
                            </div>

                            <div style={{
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                color: t.debit > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
                                minWidth: '80px',
                                textAlign: 'right'
                            }}>
                                {t.debit > 0 ? `-$${t.debit.toFixed(2)}` : `+$${t.credit.toFixed(2)}`}
                            </div>
                        </div>

                        {nameSelectorOpen === t.id && (
                            <NameSelectorDropdown
                                currentName={names[t.id]}
                                availableNames={uniqueNames}
                                onAssign={(name) => {
                                    onAssignName(t.id, name);
                                    setNameSelectorOpen(null);
                                }}
                                onRemove={() => onRemoveName(t.id)}
                                onClose={() => setNameSelectorOpen(null)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
