import React, { useState } from 'react';
import { CreditCard, Building2, Users, Plus, Check, X, Edit2, RefreshCw } from 'lucide-react';
import { ALL_CATEGORIES } from '../../../utils/constants';
import { getMerchantKey } from '../../../utils/categorize';

export default function TransactionRow({
    transaction: t,
    isExiting,
    globalRenames,
    personName,
    people,
    onAssignPerson,
    onRemovePerson,
    onCategoryChange,
    onAddToRecurring,
    onAddAllRecurring,
    isRecurring,
    matchCount,
    chargeAssignment // New prop
}) {
    const [categoryEditOpen, setCategoryEditOpen] = useState(false);
    const [nameSelectorOpen, setNameSelectorOpen] = useState(false);
    const [newNameInput, setNewNameInput] = useState('');

    const getDisplayMerchantInfo = (txn) => {
        // Use assigned key if available (covers splits and umbrella items)
        const merchantKey = chargeAssignment || getMerchantKey(txn.description);
        const globalRename = globalRenames[merchantKey];

        if (globalRename) {
            return {
                displayName: globalRename.displayName,
                originalName: txn.merchant,
                isRenamed: true
            };
        }
        return {
            displayName: txn.merchant,
            originalName: txn.merchant,
            isRenamed: false
        };
    };

    const getAccountType = (txn) => {
        if (txn.accountType) return txn.accountType;
        return (txn.amount || txn.debit || 0) > 0 ? 'Checking' : 'Credit Card';
    };

    const displayInfo = getDisplayMerchantInfo(t);
    const accountType = getAccountType(t);

    return (
        <tr className={isExiting ? 'exiting' : ''}>
            <td>{new Date(t.date).toLocaleDateString()}</td>
            <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span
                    title={displayInfo.isRenamed ? `Original: ${displayInfo.originalName}` : undefined}
                    style={displayInfo.isRenamed ? {
                        color: 'var(--accent-primary)',
                        fontWeight: '500'
                    } : undefined}
                >
                    {displayInfo.displayName}
                </span>
            </td>
            <td>{t.merchant}</td>
            <td style={{ position: 'relative' }}>
                <span
                    className={`category-badge ${t.category === 'GAMBLING' ? 'gambling' : ''} ${t.category === 'FEES' ? 'fees' : ''}`}
                    onClick={() => setCategoryEditOpen(!categoryEditOpen)}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                    {t.category}
                    <Edit2 size={10} style={{ opacity: 0.5 }} />
                </span>

                {/* Category edit dropdown */}
                {categoryEditOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 100,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '8px',
                            minWidth: '150px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Change Category
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {ALL_CATEGORIES.map((cat) => (
                                <div
                                    key={cat}
                                    onClick={() => {
                                        onCategoryChange(cat);
                                        setCategoryEditOpen(false);
                                    }}
                                    style={{
                                        padding: '6px 10px',
                                        background: cat === t.category ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '4px',
                                        marginBottom: '2px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    {cat}
                                    {cat === t.category && <Check size={12} color="var(--accent-success)" />}
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                            Rule will apply to future imports
                        </div>
                    </div>
                )}
            </td>
            <td style={{
                textAlign: 'right',
                fontWeight: '600',
                color: (t.credit || 0) > 0 ? 'var(--accent-success)' : 'inherit'
            }}>
                {(t.debit || 0) > 0 ? `-$${(t.debit || 0).toLocaleString()}` : `+$${(t.credit || 0).toLocaleString()}`}
            </td>
            <td>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: accountType === 'Credit Card' ? 'var(--accent-warning)' : 'var(--accent-success)'
                }}>
                    {accountType === 'Credit Card' ? <CreditCard size={12} /> : <Building2 size={12} />}
                    {accountType}
                </span>
            </td>
            <td style={{ position: 'relative' }}>
                {personName ? (
                    <span
                        onClick={() => setNameSelectorOpen(!nameSelectorOpen)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <Users size={10} />
                        {personName}
                    </span>
                ) : (
                    <button
                        onClick={() => setNameSelectorOpen(!nameSelectorOpen)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            padding: 0,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                        title="Assign to person"
                    >
                        <Plus size={12} />
                    </button>
                )}

                {/* Name selector dropdown */}
                {nameSelectorOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            zIndex: 100,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '8px',
                            minWidth: '180px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Assign to Person
                        </div>

                        {people && people.length > 0 && (
                            <div style={{ marginBottom: '6px' }}>
                                {people.map((name, j) => (
                                    <div
                                        key={j}
                                        onClick={() => { onAssignPerson(name); setNameSelectorOpen(false); }}
                                        style={{
                                            padding: '4px 8px',
                                            background: personName === name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '4px',
                                            marginBottom: '2px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Users size={10} color="var(--accent-primary)" />
                                        {name}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                                type="text"
                                value={newNameInput}
                                onChange={(e) => setNewNameInput(e.target.value)}
                                placeholder="New name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newNameInput.trim()) {
                                        onAssignPerson(newNameInput.trim());
                                        setNameSelectorOpen(false);
                                    }
                                    if (e.key === 'Escape') setNameSelectorOpen(false);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.75rem'
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (newNameInput.trim()) {
                                        onAssignPerson(newNameInput.trim());
                                        setNameSelectorOpen(false);
                                    }
                                }}
                                disabled={!newNameInput.trim()}
                                style={{
                                    padding: '4px 8px',
                                    background: newNameInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: newNameInput.trim() ? 'pointer' : 'default',
                                    color: 'white'
                                }}
                            >
                                <Check size={12} />
                            </button>
                        </div>

                        {personName && (
                            <button
                                onClick={() => { onRemovePerson(); setNameSelectorOpen(false); }}
                                style={{
                                    marginTop: '6px',
                                    padding: '2px 6px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-danger)',
                                    fontSize: '0.65rem',
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
                )}
            </td>
            <td style={{ padding: '4px' }}>
                <button
                    onClick={() => !isRecurring && onAddToRecurring()}
                    title={isRecurring ? "Already in Recurring" : "Add Single to Recurring"}
                    style={{
                        padding: '4px 6px',
                        background: isRecurring
                            ? 'rgba(34, 197, 94, 0.3)'
                            : 'rgba(99, 102, 241, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: isRecurring
                            ? 'var(--accent-success)'
                            : 'var(--accent-primary)',
                        cursor: isRecurring ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.65rem',
                        opacity: isRecurring ? 1 : 0.7
                    }}
                >
                    <RefreshCw size={10} />
                    {isRecurring && <Check size={8} />}
                </button>
                {!isRecurring && matchCount > 1 && (
                    <button
                        onClick={onAddAllRecurring}
                        title={`Add all ${matchCount} matching transactions`}
                        style={{
                            padding: '4px 6px',
                            background: 'rgba(249, 115, 22, 0.2)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'var(--accent-warning)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '0.65rem'
                        }}
                    >
                        <Plus size={10} />
                        <span style={{ fontWeight: 600 }}>{matchCount}</span>
                    </button>
                )}
            </td>
        </tr>
    );
}
