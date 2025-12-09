import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Check, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import PersonTransactions from './PersonTransactions';

export default function PersonCard({
    person,
    isExpanded,
    onToggleExpand,
    onSettle,
    onUnsettle,
    onRemoveTransaction
}) {
    return (
        <div>
            <div
                onClick={onToggleExpand}
                style={{
                    padding: '16px',
                    background: person.isSettled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                    border: `1px solid ${person.isSettled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                    borderBottom: isExpanded ? 'none' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>{person.name}</span>
                            {person.isSettled && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    borderRadius: '12px',
                                    fontSize: '0.65rem',
                                    color: 'var(--accent-success)'
                                }}>
                                    <CheckCircle size={10} /> Settled
                                </span>
                            )}
                            {isExpanded ? (
                                <ChevronUp size={16} color="var(--text-secondary)" />
                            ) : (
                                <ChevronDown size={16} color="var(--text-secondary)" />
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-danger)' }}>
                                <ArrowUpRight size={14} />
                                Spent: ${person.sent.toFixed(2)}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)' }}>
                                <ArrowDownLeft size={14} />
                                Received: ${person.received.toFixed(2)}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            {person.transactions.length} transaction{person.transactions.length > 1 ? 's' : ''} •
                            Last: {person.lastDate?.toLocaleDateString()}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: person.balance < 0 ? 'var(--accent-warning)' : person.balance > 0 ? 'var(--accent-success)' : 'var(--text-secondary)'
                        }}>
                            {person.balance < 0 ? '-' : person.balance > 0 ? '+' : ''}${Math.abs(person.balance).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {person.balance < 0 ? 'They owe you' : person.balance > 0 ? 'You owe them' : 'Even'}
                        </div>
                        {!person.isSettled ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSettle(); }}
                                style={{
                                    marginTop: '8px',
                                    padding: '4px 12px',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                Settle
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onUnsettle(); }}
                                style={{
                                    marginTop: '8px',
                                    padding: '4px 12px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Unsettle
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded transaction list */}
            {isExpanded && (
                <PersonTransactions
                    transactions={person.transactions}
                    isSettled={person.isSettled}
                    onRemoveTransaction={onRemoveTransaction}
                />
            )}
        </div>
    );
}
