import { useState, useMemo, useEffect } from 'react';
import { Users, ArrowUpRight, ArrowDownLeft, Check, Plus, X, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const NAMES_STORAGE_KEY = 'fintrack_person_names';
const SETTLEMENTS_STORAGE_KEY = 'fintrack_person_settlements';
const PEOPLE_LIST_KEY = 'fintrack_people_list';

export default function People({ transactions }) {
    const [view, setView] = useState('people'); // 'people' or 'all'
    const [nameSelectorOpen, setNameSelectorOpen] = useState(null);
    const [newNameInput, setNewNameInput] = useState('');
    const [expandedPerson, setExpandedPerson] = useState(null);

    // Load saved names from localStorage
    const [names, setNames] = useState(() => {
        try {
            // Check both old and new keys for backwards compatibility
            const saved = localStorage.getItem(NAMES_STORAGE_KEY) || localStorage.getItem('fintrack_etransfer_names');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Load settlements from localStorage
    const [settlements, setSettlements] = useState(() => {
        try {
            const saved = localStorage.getItem(SETTLEMENTS_STORAGE_KEY) || localStorage.getItem('fintrack_etransfer_settlements');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(names));
    }, [names]);

    useEffect(() => {
        localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(settlements));
    }, [settlements]);

    // Pre-defined people list (for quick selection)
    const [peopleList, setPeopleList] = useState(() => {
        try {
            const saved = localStorage.getItem(PEOPLE_LIST_KEY);
            return saved ? JSON.parse(saved) : ['You'];
        } catch {
            return ['You'];
        }
    });
    const [newPersonInput, setNewPersonInput] = useState('');

    useEffect(() => {
        localStorage.setItem(PEOPLE_LIST_KEY, JSON.stringify(peopleList));
    }, [peopleList]);

    const addPerson = () => {
        const name = newPersonInput.trim();
        if (name && !peopleList.includes(name)) {
            setPeopleList(prev => [...prev, name]);
            setNewPersonInput('');
        }
    };

    const removePerson = (name) => {
        if (name !== 'You') {
            setPeopleList(prev => prev.filter(p => p !== name));
        }
    };

    // Get unique names used
    const uniqueNames = useMemo(() => {
        const allNames = Object.values(names).filter(n => n && n.trim());
        return [...new Set(allNames)].sort();
    }, [names]);

    // Assigned transactions (any transaction with a name)
    const assignedTransactions = useMemo(() => {
        return transactions.filter(t => names[t.id]).sort((a, b) => b.date - a.date);
    }, [transactions, names]);

    // Calculate people balances from ALL assigned transactions
    const peopleData = useMemo(() => {
        const people = {};

        transactions.forEach(t => {
            const name = names[t.id];
            if (!name) return;

            if (!people[name]) {
                people[name] = {
                    name,
                    sent: 0,
                    received: 0,
                    transactions: [],
                    lastDate: null
                };
            }

            // Debits = money out (you paid), Credits = money in (they paid you back)
            if (t.debit > 0) {
                people[name].sent += t.debit;
            }
            if (t.credit > 0) {
                people[name].received += t.credit;
            }

            people[name].transactions.push(t);

            if (!people[name].lastDate || t.date > people[name].lastDate) {
                people[name].lastDate = t.date;
            }
        });

        // Calculate net balance and apply settlements
        return Object.values(people).map(p => {
            // Sort transactions by date descending
            p.transactions.sort((a, b) => b.date - a.date);

            const rawBalance = p.received - p.sent; // Positive = they paid you more, Negative = you paid them more
            const settlement = settlements[p.name] || { settledBalance: 0 };
            const adjustedBalance = rawBalance - settlement.settledBalance;

            return {
                ...p,
                rawBalance,
                balance: adjustedBalance,
                isSettled: Math.abs(adjustedBalance) < 0.01,
                settlementDate: settlement.settledAt
            };
        }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    }, [transactions, names, settlements]);

    const assignName = (txnId, name) => {
        setNames(prev => ({ ...prev, [txnId]: name }));
        setNameSelectorOpen(null);
        setNewNameInput('');
    };

    const addNewName = (txnId) => {
        if (newNameInput.trim()) {
            assignName(txnId, newNameInput.trim());
        }
    };

    const removeName = (txnId) => {
        setNames(prev => {
            const updated = { ...prev };
            delete updated[txnId];
            return updated;
        });
    };

    const settlePerson = (personName) => {
        const person = peopleData.find(p => p.name === personName);
        if (!person) return;

        setSettlements(prev => ({
            ...prev,
            [personName]: {
                settledBalance: person.rawBalance,
                settledAt: new Date().toISOString()
            }
        }));
    };

    const unsettlePerson = (personName) => {
        setSettlements(prev => {
            const updated = { ...prev };
            delete updated[personName];
            return updated;
        });
    };

    const togglePersonExpand = (personName) => {
        setExpandedPerson(expandedPerson === personName ? null : personName);
    };

    // Render name selector dropdown
    const renderNameSelector = (txnId) => (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'absolute',
                top: '100%',
                right: '100px',
                zIndex: 100,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                minWidth: '200px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
        >
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Assign to Person
            </div>

            {uniqueNames.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    {uniqueNames.map((name, j) => (
                        <div
                            key={j}
                            onClick={() => assignName(txnId, name)}
                            style={{
                                padding: '6px 10px',
                                background: names[txnId] === name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Users size={12} color="var(--accent-primary)" />
                            {name}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    placeholder="New name..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') addNewName(txnId);
                        if (e.key === 'Escape') setNameSelectorOpen(null);
                    }}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                />
                <button
                    onClick={() => addNewName(txnId)}
                    disabled={!newNameInput.trim()}
                    style={{
                        padding: '6px 10px',
                        background: newNameInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: newNameInput.trim() ? 'pointer' : 'default',
                        color: 'white'
                    }}
                >
                    <Check size={14} />
                </button>
            </div>

            {names[txnId] && (
                <button
                    onClick={() => {
                        removeName(txnId);
                        setNameSelectorOpen(null);
                    }}
                    style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-danger)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <X size={10} /> Remove
                </button>
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Manage People Section */}
            <div className="card">
                <div className="card-title">Manage People</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newPersonInput}
                        onChange={(e) => setNewPersonInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPerson()}
                        placeholder="Add person name..."
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    />
                    <button
                        onClick={addPerson}
                        disabled={!newPersonInput.trim()}
                        style={{
                            padding: '8px 16px',
                            background: newPersonInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: newPersonInput.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {peopleList.map((person) => (
                        <div
                            key={person}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                borderRadius: '20px',
                                fontSize: '0.8rem'
                            }}
                        >
                            <Users size={12} />
                            {person}
                            {person !== 'You' && (
                                <button
                                    onClick={() => removePerson(person)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Header with tabs */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card-title" style={{ margin: 0 }}>People & Shared Expenses</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setView('people')}
                            style={{
                                padding: '6px 16px',
                                background: view === 'people' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '20px',
                                color: 'white',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            People ({peopleData.length})
                        </button>
                        <button
                            onClick={() => setView('all')}
                            style={{
                                padding: '6px 16px',
                                background: view === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '20px',
                                color: 'white',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Assigned ({assignedTransactions.length})
                        </button>
                    </div>
                </div>
            </div>

            {view === 'people' ? (
                <>
                    {/* Summary cards */}
                    {peopleData.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Total Spent on Others
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-danger)' }}>
                                    ${peopleData.reduce((sum, p) => sum + p.sent, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Total Received Back
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                                    ${peopleData.reduce((sum, p) => sum + p.received, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Outstanding
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                    {peopleData.filter(p => !p.isSettled).length} people
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {peopleData.length === 0 && (
                        <div className="card">
                            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <div style={{ fontWeight: '600', marginBottom: '8px' }}>No People Assigned Yet</div>
                                <div style={{ fontSize: '0.8rem' }}>
                                    Assign transactions to people from the Transactions tab<br />
                                    or associate e-transfers with names to track who owes you.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* People list */}
                    {peopleData.length > 0 && (
                        <div className="card">
                            <div className="card-title">People</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {peopleData.map((person, i) => (
                                    <div key={i}>
                                        <div
                                            onClick={() => togglePersonExpand(person.name)}
                                            style={{
                                                padding: '16px',
                                                background: person.isSettled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: expandedPerson === person.name ? '8px 8px 0 0' : '8px',
                                                border: `1px solid ${person.isSettled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                                                borderBottom: expandedPerson === person.name ? 'none' : undefined,
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
                                                        {expandedPerson === person.name ? (
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
                                                            onClick={(e) => { e.stopPropagation(); settlePerson(person.name); }}
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
                                                            onClick={(e) => { e.stopPropagation(); unsettlePerson(person.name); }}
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
                                        {expandedPerson === person.name && (
                                            <div style={{
                                                padding: '12px',
                                                background: 'rgba(0, 0, 0, 0.2)',
                                                border: `1px solid ${person.isSettled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
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
                                                        {person.transactions.map((txn, j) => (
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
                                                                        onClick={(e) => { e.stopPropagation(); removeName(txn.id); }}
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
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* All assigned transactions view */
                <div className="card">
                    <div className="card-title">All Assigned Transactions</div>
                    {assignedTransactions.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No transactions assigned to people yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {assignedTransactions.map((t, i) => (
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

                                    {nameSelectorOpen === t.id && renderNameSelector(t.id)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Export assignName function and state getter for use in TransactionTable
export function usePeopleNames() {
    const [names, setNames] = useState(() => {
        try {
            const saved = localStorage.getItem(NAMES_STORAGE_KEY) || localStorage.getItem('fintrack_etransfer_names');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(names));
    }, [names]);

    const uniqueNames = useMemo(() => {
        const allNames = Object.values(names).filter(n => n && n.trim());
        return [...new Set(allNames)].sort();
    }, [names]);

    const assignName = (txnId, name) => {
        setNames(prev => ({ ...prev, [txnId]: name }));
    };

    const removeName = (txnId) => {
        setNames(prev => {
            const updated = { ...prev };
            delete updated[txnId];
            return updated;
        });
    };

    return { names, uniqueNames, assignName, removeName };
}
