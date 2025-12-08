import React, { useState } from 'react';
import {
    RefreshCw, Check, X, Pencil, ChevronDown, ChevronUp,
    Users, Scissors, Mail, Trash2, TrendingUp, TrendingDown
} from 'lucide-react';
import { useTransactions } from '../../../context/TransactionContext';

const ALL_CATEGORIES = [
    'ENTERTAINMENT', 'DINING', 'GROCERIES', 'SHOPPING', 'TRANSPORTATION',
    'UTILITIES', 'GAMBLING', 'FEES', 'OTHER'
];

export default function RecurringItem({
    sub,
    expanded,
    onExpand,
    onSplit,
    mergeSelected,
    onToggleMerge
}) {
    const {
        globalRenames, setGlobalRenames,
        customNames, setCustomNames,
        categoryOverrides, setCategoryOverrides,
        sharedSubscriptions, setSharedSubscriptions,
        emails, setEmails,
        merchantSplits,
        peopleList,
        manualRecurring, setManualRecurring,
        setChargeAssignments,
        setApprovedItems, setDeniedItems // For removing manual items
    } = useTransactions();

    // Local UI State
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameInput, setRenameInput] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [emailOpen, setEmailOpen] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');

    // Renaming Handlers
    const startRename = (e) => {
        e.stopPropagation();
        setIsRenaming(true);
        setRenameInput(globalRenames[sub.merchantKey]?.displayName || sub.displayName || sub.merchant);
    };

    const saveRename = (e) => {
        e?.stopPropagation();
        if (renameInput.trim()) {
            setGlobalRenames(prev => ({
                ...prev,
                [sub.merchantKey]: {
                    displayName: renameInput.trim(),
                    originalMerchant: sub.baseMerchant || sub.merchant,
                    amount: sub.latestAmount
                }
            }));
        }
        setIsRenaming(false);
    };

    const cancelRename = (e) => {
        e?.stopPropagation();
        setIsRenaming(false);
    };

    const revertRename = (e) => {
        e.stopPropagation();
        setGlobalRenames(prev => {
            const updated = { ...prev };
            delete updated[sub.merchantKey];
            return updated;
        });
    };

    // Category Handler
    const handleSetCategory = (cat) => {
        setCategoryOverrides(prev => ({ ...prev, [sub.merchantKey]: cat }));
        setCategoryOpen(false);
    };

    // Share Handler
    const toggleSharedWith = (person) => {
        setSharedSubscriptions(prev => {
            const current = prev[sub.merchantKey] || [];
            if (current.includes(person)) {
                return { ...prev, [sub.merchantKey]: current.filter(p => p !== person) };
            } else {
                return { ...prev, [sub.merchantKey]: [...current, person] };
            }
        });
    };

    // Email Handler
    const handleSaveEmail = () => {
        if (newEmailInput.trim()) {
            setEmails(prev => ({ ...prev, [sub.merchantKey]: newEmailInput.trim() }));
            setNewEmailInput('');
            setEmailOpen(false);
        }
    };

    const handleRemoveEmail = () => {
        setEmails(prev => {
            const updated = { ...prev };
            delete updated[sub.merchantKey];
            return updated;
        });
        setEmailOpen(false);
    };

    // Remove Manual Item Handler
    const removeManualItem = (e) => {
        e.stopPropagation();

        // Remove from manual list
        setManualRecurring(prev => {
            const updated = prev.filter(m => m.merchantKey !== sub.merchantKey);
            localStorage.setItem('fintrack_manual_recurring', JSON.stringify(updated));
            return updated;
        });

        // Remove from approved list
        setApprovedItems(prev => {
            const updated = prev.filter(k => k !== sub.merchantKey);
            localStorage.setItem('fintrack_recurring_approved', JSON.stringify(updated));
            return updated;
        });

        // Cleanup charge assignments
        setChargeAssignments(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(txnId => {
                if (updated[txnId] === sub.merchantKey) {
                    delete updated[txnId];
                }
            });
            localStorage.setItem('fintrack_charge_assignments', JSON.stringify(updated));
            return updated;
        });
    };

    const sharedWith = sharedSubscriptions[sub.merchantKey] || [];
    const hasEmail = emails[sub.merchantKey];
    const isSplit = merchantSplits[sub.merchantKey];

    return (
        <div
            onClick={onExpand}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: expanded
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'rgba(255, 255, 255, 0.03)',
                borderRadius: expanded
                    ? '8px 8px 0 0'
                    : '8px',
                border: '1px solid var(--border-color)',
                borderBottom: expanded
                    ? 'none'
                    : '1px solid var(--border-color)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.15s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Merge selection checkbox */}
                <input
                    type="checkbox"
                    checked={mergeSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleMerge(sub.merchantKey);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: 'var(--accent-primary)'
                    }}
                    title="Select for merge"
                />
                <div style={{
                    padding: '8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px'
                }}>
                    <RefreshCw size={16} color="var(--accent-primary)" />
                </div>
                <div>
                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isRenaming ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={renameInput}
                                    onChange={(e) => setRenameInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveRename();
                                        if (e.key === 'Escape') cancelRename();
                                    }}
                                    autoFocus
                                    style={{
                                        padding: '4px 8px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--accent-primary)',
                                        borderRadius: '4px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        width: '180px'
                                    }}
                                />
                                <button onClick={saveRename} style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                                    <Check size={12} color="white" />
                                </button>
                                <button onClick={cancelRename} style={{ background: 'var(--accent-danger)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                                    <X size={12} color="white" />
                                </button>
                            </div>
                        ) : (
                            <>
                                {globalRenames[sub.merchantKey]?.displayName || sub.displayName || customNames[sub.merchantKey] || sub.merchant}
                                {/* Rename button */}
                                <button
                                    onClick={startRename}
                                    title="Rename subscription"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 4px',
                                        background: globalRenames[sub.merchantKey]
                                            ? 'rgba(99, 102, 241, 0.2)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: globalRenames[sub.merchantKey]
                                            ? 'var(--accent-primary)'
                                            : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.6rem'
                                    }}
                                >
                                    <Pencil size={10} />
                                </button>
                                {/* Revert button - only show when renamed */}
                                {globalRenames[sub.merchantKey] && (
                                    <button
                                        onClick={revertRename}
                                        title="Revert to original name"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '2px 4px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'var(--accent-danger)',
                                            cursor: 'pointer',
                                            fontSize: '0.6rem'
                                        }}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </>
                        )}
                        {/* Category badge */}
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                setCategoryOpen(!categoryOpen);
                            }}
                            style={{
                                fontSize: '0.6rem',
                                padding: '2px 6px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                borderRadius: '10px',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                position: 'relative'
                            }}
                        >
                            {sub.splitCategory || sub.effectiveCategory}
                            <ChevronDown size={10} />

                            {/* Category Dropdown */}
                            {categoryOpen && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        left: '0',
                                        top: '100%',
                                        zIndex: 100,
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        minWidth: '150px',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Change Category
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {ALL_CATEGORIES.map(cat => (
                                            <div
                                                key={cat}
                                                onClick={() => handleSetCategory(cat)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: sub.effectiveCategory === cat
                                                        ? 'rgba(99, 102, 241, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {sub.effectiveCategory === cat && <Check size={12} color="var(--accent-primary)" />}
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </span>

                        {/* Share button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShareOpen(!shareOpen);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                background: sharedWith.length > 0
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                color: sharedWith.length > 0
                                    ? 'var(--accent-success)'
                                    : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                position: 'relative'
                            }}
                        >
                            <Users size={10} />
                            {sharedWith.length > 0 ? `${sharedWith.length + 1}` : '+'}

                            {/* Share Dropdown */}
                            {shareOpen && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        left: '0',
                                        top: '100%',
                                        zIndex: 100,
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        minWidth: '180px',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Split with
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {peopleList.map((person, j) => (
                                            <div
                                                key={j}
                                                onClick={() => toggleSharedWith(person)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: sharedWith.includes(person)
                                                        ? 'rgba(16, 185, 129, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '3px',
                                                    border: `2px solid ${sharedWith.includes(person) ? 'var(--accent-success)' : 'var(--text-secondary)'}`,
                                                    background: sharedWith.includes(person) ? 'var(--accent-success)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {sharedWith.includes(person) && <Check size={8} color="white" />}
                                                </div>
                                                {person}
                                            </div>
                                        ))}
                                    </div>
                                    {sharedWith.length > 0 && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--accent-success)' }}>
                                            Your share: ${(sub.latestAmount / (sharedWith.length + 1)).toFixed(2)}/mo
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>

                        {/* Split button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSplit(sub);
                            }}
                            title="Split/Reassign Charges"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                background: isSplit
                                    ? 'rgba(251, 191, 36, 0.2)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                color: isSplit
                                    ? 'var(--accent-warning)'
                                    : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.6rem'
                            }}
                        >
                            <Scissors size={10} />
                        </button>

                        {/* Email button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEmailOpen(!emailOpen);
                                setNewEmailInput('');
                            }}
                            title="Associate email/account"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                background: hasEmail
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                color: hasEmail
                                    ? 'rgb(59, 130, 246)'
                                    : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                position: 'relative'
                            }}
                        >
                            <Mail size={10} />
                            {hasEmail && (
                                <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {hasEmail}
                                </span>
                            )}

                            {/* Email Dropdown */}
                            {emailOpen && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        left: '0',
                                        top: '100%',
                                        zIndex: 100,
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        minWidth: '220px',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Associate Email/Account
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={newEmailInput}
                                        onChange={(e) => setNewEmailInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEmail();
                                        }}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '6px 10px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.8rem',
                                            marginBottom: '8px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={handleSaveEmail}
                                            style={{
                                                flex: 1,
                                                padding: '4px 8px',
                                                background: 'var(--accent-success)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            Save
                                        </button>
                                        {hasEmail && (
                                            <button
                                                onClick={handleRemoveEmail}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: 'var(--accent-danger)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </button>

                        {/* Remove button for manual items */}
                        {sub.isManual && (
                            <button
                                onClick={removeManualItem}
                                title="Remove from recurring"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 6px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'var(--accent-danger)',
                                    cursor: 'pointer',
                                    fontSize: '0.6rem'
                                }}
                            >
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {sub.frequency} • {sub.count} charges
                        {sharedWith.length > 0 && (
                            <span style={{ marginLeft: '8px', color: 'var(--accent-success)' }}>
                                • Your share: ${(sub.latestAmount / (sharedWith.length + 1)).toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side: Amount and chevron */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600' }}>${sub.latestAmount.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Next: {sub.nextDate.toLocaleDateString()}
                    </div>
                </div>
                {expanded
                    ? <ChevronUp size={16} color="var(--text-secondary)" />
                    : <ChevronDown size={16} color="var(--text-secondary)" />}
            </div>

            {/* EXPANDED CONTENT (Timeline) */}
            {expanded && sub.allTransactions && (
                <div
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing
                    style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-color)',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        padding: '16px',
                        marginTop: '-1px', // Merge borders
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {/* Timeline visualization */}
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
                                {sub.allTransactions.map((txn, idx) => {
                                    const prevTxn = idx > 0 ? sub.allTransactions[idx - 1] : null;
                                    const priceIncrease = prevTxn && (txn.amount - prevTxn.amount) > 0.5;
                                    const priceDecrease = prevTxn && (prevTxn.amount - txn.amount) > 0.5;

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
                                                    <span>+${(txn.amount - prevTxn.amount).toFixed(2)}</span>
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
                                                    <span>-${(prevTxn.amount - txn.amount).toFixed(2)}</span>
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
                                            {idx < sub.allTransactions.length - 1 && (
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
                                                ${(txn.amount || txn.debit).toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Transaction table */}
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
                            {sub.allTransactions.slice().reverse().slice(0, 10).map((txn, j, arr) => {
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
                    {sub.allTransactions.length > 10 && (
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Showing 10 of {sub.allTransactions.length} payments
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
