import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import ManagePeopleCard from '../features/people/components/ManagePeopleCard';
import PeopleSummaryCards from '../features/people/components/PeopleSummaryCards';
import PersonCard from '../features/people/components/PersonCard';
import AssignedTransactionsList from '../features/people/components/AssignedTransactionsList';

export default function People() {
    const [view, setView] = useState('people'); // 'people' or 'all'
    const [expandedPerson, setExpandedPerson] = useState(null);

    // --- Global State from Context ---
    const {
        transactions,
        personNames, setPersonNames,
        settlements, setSettlements,
        peopleList, setPeopleList
    } = useTransactions();

    // Aliases for backward compatibility
    const names = personNames;
    const setNames = setPersonNames;
    // ---------------------------------

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

    // --- Handlers ---
    const addPerson = (name) => {
        if (name && !peopleList.includes(name)) {
            setPeopleList(prev => [...prev, name]);
        }
    };

    const removePerson = (name) => {
        if (name !== 'You') {
            setPeopleList(prev => prev.filter(p => p !== name));
        }
    };

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Manage People Section */}
            <ManagePeopleCard
                peopleList={peopleList}
                onAddPerson={addPerson}
                onRemovePerson={removePerson}
            />

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
                        <PeopleSummaryCards peopleData={peopleData} />
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
                                    <PersonCard
                                        key={i}
                                        person={person}
                                        isExpanded={expandedPerson === person.name}
                                        onToggleExpand={() => togglePersonExpand(person.name)}
                                        onSettle={() => settlePerson(person.name)}
                                        onUnsettle={() => unsettlePerson(person.name)}
                                        onRemoveTransaction={removeName}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* All assigned transactions view */
                <AssignedTransactionsList
                    transactions={assignedTransactions}
                    names={names}
                    uniqueNames={uniqueNames}
                    onAssignName={assignName}
                    onRemoveName={removeName}
                />
            )}
        </div>
    );
}
