import React, { useState, useRef } from 'react';
import {
    RefreshCw, Check, X, Pencil, ChevronDown, ChevronUp,
    Users, Scissors, Mail, Trash2, Calendar, Activity, DollarSign, TrendingUp, Clock, RotateCcw, Layers, Unlink
} from 'lucide-react';
import { useTransactions } from '../../../context/TransactionContext';
import { ALL_CATEGORIES } from '../../../utils/constants';
import { saveCategoryRule } from '../../../utils/categorize';
import PaymentTimeline from './PaymentTimeline';
import PaymentHistory from './PaymentHistory';
import Dropdown from '../../../components/Dropdown';
import styles from './RecurringItem.module.css';

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
        mergedSubscriptions, setMergedSubscriptions,
        splitSubscriptions, setSplitSubscriptions,
        approvedItems, setApprovedItems, setDeniedItems,
        recategorizeAll // For triggering transaction updates
    } = useTransactions();

    // Local UI State
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameInput, setRenameInput] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [emailOpen, setEmailOpen] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');

    // Refs for dropdown trigger elements (used by Dropdown component for positioning)
    const categoryRef = useRef(null);
    const shareRef = useRef(null);
    const emailRef = useRef(null);

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

    // Category Handler - syncs to both categoryOverrides AND pattern rules
    const handleSetCategory = (cat) => {
        // Update categoryOverrides (for Recurring tab)
        setCategoryOverrides(prev => ({ ...prev, [sub.merchantKey]: cat }));

        // Save pattern rules using ACTUAL transaction descriptions
        // IMPORTANT: Use the ORIGINAL merchant name to avoid changing the merchant column
        if (sub.allTransactions && sub.allTransactions.length > 0) {
            // Save a rule for each unique description, preserving original merchant
            const uniqueDescriptions = [...new Set(sub.allTransactions.map(t => t.description))];
            uniqueDescriptions.forEach(desc => {
                // Find a transaction with this description to get the original merchant
                const txn = sub.allTransactions.find(t => t.description === desc);
                const originalMerchant = txn?.merchant || sub.merchant;
                saveCategoryRule(desc, originalMerchant, cat);
            });
        } else {
            // Fallback: use baseMerchant or merchant as pattern
            const pattern = sub.baseMerchant || sub.merchant;
            if (pattern) {
                saveCategoryRule(pattern, sub.merchant, cat);
            }
        }

        // Trigger recategorization so Transactions tab updates immediately
        if (recategorizeAll) {
            recategorizeAll();
        }

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

        // Cleanup split records that reference this subscription
        setSplitSubscriptions(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            Object.entries(updated).forEach(([key, split]) => {
                // If this subscription was created by a split, clean up
                if (split.createdSubscriptions?.includes(sub.merchantKey)) {
                    // Remove this subscription from the split record
                    updated[key] = {
                        ...split,
                        createdSubscriptions: split.createdSubscriptions.filter(k => k !== sub.merchantKey),
                        splitTo: (split.splitTo || []).filter(k => k !== sub.merchantKey)
                    };
                    // If no more targets, remove the split record entirely
                    if (updated[key].splitTo?.length === 0) {
                        delete updated[key];
                    }
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                localStorage.setItem('fintrack_split_subscriptions', JSON.stringify(updated));
            }
            return hasChanges ? updated : prev;
        });
    };

    // Revert to Pending Handler
    const handleRevert = (e) => {
        e.stopPropagation();

        // 1. Remove from approved list
        setApprovedItems(prev => {
            const updated = prev.filter(k => k !== sub.merchantKey);
            localStorage.setItem('fintrack_recurring_approved', JSON.stringify(updated));
            return updated;
        });

        // 2. Remove charge assignments (unlink transactions)
        setChargeAssignments(prev => {
            const updated = { ...prev };
            let changed = false;
            Object.keys(updated).forEach(txnId => {
                if (updated[txnId] === sub.merchantKey) {
                    delete updated[txnId];
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('fintrack_charge_assignments', JSON.stringify(updated));
            }
            return changed ? updated : prev;
        });
    };

    // Unmerge Handler - breaks apart merged item into original constituents
    const handleUnmerge = (e) => {
        e.stopPropagation();

        // 1. Remove the merge record
        setMergedSubscriptions(prev => {
            const updated = { ...prev };
            delete updated[sub.merchantKey];
            localStorage.setItem('fintrack_merged_subscriptions', JSON.stringify(updated));
            return updated;
        });

        // 2. Clear all charge assignments pointing to this merged key
        // This returns transactions to their original detected subscriptions
        setChargeAssignments(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            Object.keys(updated).forEach(txnId => {
                if (updated[txnId] === sub.merchantKey) {
                    delete updated[txnId];
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                localStorage.setItem('fintrack_charge_assignments', JSON.stringify(updated));
            }
            return hasChanges ? updated : prev;
        });
    };

    const sharedWith = sharedSubscriptions[sub.merchantKey] || [];
    const hasEmail = emails[sub.merchantKey];
    const isSplit = merchantSplits[sub.merchantKey];

    // Check if any dropdown is open to elevate z-index
    const hasOpenDropdown = categoryOpen || shareOpen || emailOpen;

    return (
        <div
            onClick={onExpand}
            className={`${styles.recurringItem} ${expanded ? styles.expanded : ''}`}
            style={hasOpenDropdown ? { zIndex: 999, position: 'relative' } : undefined}
        >
            <div className={styles.summaryRow} style={{ opacity: sub.status === 'Expired' ? 0.6 : 1 }}>
                <div className={styles.leftSection}>
                    {/* Merge selection checkbox */}
                    <input
                        type="checkbox"
                        checked={mergeSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleMerge(sub.merchantKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.mergeCheckbox}
                        title="Select for merge"
                    />
                    <div className={styles.mergeIcon}>
                        <RefreshCw size={16} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <div className={styles.nameSection}>
                            {isRenaming ? (
                                <div className={styles.renameContainer} onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={renameInput}
                                        onChange={(e) => setRenameInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveRename();
                                            if (e.key === 'Escape') cancelRename();
                                        }}
                                        autoFocus
                                        className={styles.renameInput}
                                    />
                                    <button onClick={saveRename} className={`${styles.actionButton} ${styles.success}`}>
                                        <Check size={12} color="white" />
                                    </button>
                                    <button onClick={cancelRename} className={`${styles.actionButton} ${styles.danger}`}>
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
                                        className={`${styles.actionButton} ${styles.primary} dim`}
                                        style={{
                                            background: globalRenames[sub.merchantKey]
                                                ? 'rgba(99, 102, 241, 0.2)'
                                                : 'rgba(255, 255, 255, 0.1)',
                                            color: globalRenames[sub.merchantKey]
                                                ? 'var(--accent-primary)'
                                                : 'var(--text-secondary)',
                                        }}
                                    >
                                        <Pencil size={10} />
                                    </button>
                                    {/* Revert button - only show when renamed */}
                                    {globalRenames[sub.merchantKey] && (
                                        <button
                                            onClick={revertRename}
                                            title="Revert to original name"
                                            className={`${styles.actionButton} ${styles.danger}`}
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </>
                            )}

                            {/* BADGES */}
                            {/* Split Badge (Yellow) */}
                            {(sub.isManual || sub.isManuallyCreated) && !sub.isMerged && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '2px 4px', borderRadius: '4px',
                                    backgroundColor: 'rgba(234, 179, 8, 0.2)', // Slightly stronger opacity
                                    border: '1px solid rgba(234, 179, 8, 0.4)',
                                    color: '#fcd34d', // Brighter text
                                    marginLeft: '8px', // More spacing
                                    minWidth: '20px', // Prevent collapse
                                    flexShrink: 0 // Prevent shrinking
                                }} title="Split Item">
                                    <Scissors size={10} />
                                </div>
                            )}

                            {/* Merged Badge (Purple) */}
                            {sub.isMerged && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '2px 4px', borderRadius: '4px',
                                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                    color: '#d8b4fe',
                                    marginLeft: '8px',
                                    minWidth: '20px',
                                    flexShrink: 0
                                }} title="Merged Bundle">
                                    <Layers size={10} />
                                </div>
                            )}

                            {/* Expired Badge (Red) */}
                            {sub.status === 'Expired' && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '2px 6px', borderRadius: '4px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#fca5a5',
                                    marginLeft: '8px',
                                    fontSize: '0.65rem',
                                    fontWeight: '600',
                                    flexShrink: 0
                                }} title="Subscription likely expired">
                                    EXPIRED
                                </div>
                            )}
                            {/* Category badge */}
                            <span
                                ref={categoryRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCategoryOpen(!categoryOpen);
                                }}
                                className={styles.categoryBadge}
                                style={{ position: 'relative' }}
                            >
                                {sub.splitCategory || sub.effectiveCategory}
                                <ChevronDown size={10} />
                            </span>

                            {/* Category Dropdown - Portal */}
                            <Dropdown
                                isOpen={categoryOpen}
                                onClose={() => setCategoryOpen(false)}
                                triggerRef={categoryRef}
                                minWidth={150}
                            >
                                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Change Category
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {ALL_CATEGORIES.map(cat => (
                                        <div
                                            key={cat}
                                            onClick={() => handleSetCategory(cat)}
                                            className={`${styles.dropdownItem} ${sub.effectiveCategory === cat ? styles.active : ''}`}
                                        >
                                            {sub.effectiveCategory === cat && <Check size={12} color="var(--accent-primary)" />}
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            </Dropdown>

                            {/* Share button */}
                            <button
                                ref={shareRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShareOpen(!shareOpen);
                                }}
                                className={`${styles.actionButton}`}
                                style={{
                                    background: sharedWith.length > 0
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    color: sharedWith.length > 0
                                        ? 'var(--accent-success)'
                                        : 'var(--text-secondary)',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}
                            >
                                <Users size={10} />
                                {sharedWith.length > 0 ? `${sharedWith.length + 1}` : '+'}
                            </button>

                            {/* Share Dropdown - Portal */}
                            <Dropdown
                                isOpen={shareOpen}
                                onClose={() => setShareOpen(false)}
                                triggerRef={shareRef}
                                minWidth={180}
                            >
                                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Split with
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {peopleList.map((person, j) => (
                                        <div
                                            key={j}
                                            onClick={() => toggleSharedWith(person)}
                                            className={`${styles.dropdownItem} ${sharedWith.includes(person) ? styles.sharedActive : ''}`}
                                            style={{ gap: '8px' }}
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
                            </Dropdown>

                            {/* Split button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSplit(sub);
                                }}
                                title="Split/Reassign Charges"
                                className={styles.actionButton}
                                style={{
                                    background: isSplit
                                        ? 'rgba(251, 191, 36, 0.2)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    color: isSplit
                                        ? 'var(--accent-warning)'
                                        : 'var(--text-secondary)',
                                    borderRadius: '10px',
                                    padding: '2px 6px',
                                    gap: '4px'
                                }}
                            >
                                <Scissors size={10} />
                            </button>

                            {/* Email button */}
                            <button
                                ref={emailRef}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEmailOpen(!emailOpen);
                                    setNewEmailInput('');
                                }}
                                title="Associate email/account"
                                className={styles.actionButton}
                                style={{
                                    background: hasEmail
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    color: hasEmail
                                        ? 'rgb(59, 130, 246)'
                                        : 'var(--text-secondary)',
                                    borderRadius: '10px',
                                    padding: '2px 6px',
                                    gap: '4px'
                                }}
                            >
                                <Mail size={10} />
                                {hasEmail && (
                                    <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {hasEmail}
                                    </span>
                                )}
                            </button>

                            {/* Email Dropdown - Portal */}
                            <Dropdown
                                isOpen={emailOpen}
                                onClose={() => setEmailOpen(false)}
                                triggerRef={emailRef}
                                minWidth={220}
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
                                        className={`${styles.actionButton} ${styles.success}`}
                                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                                    >
                                        Save
                                    </button>
                                    {hasEmail && (
                                        <button
                                            onClick={handleRemoveEmail}
                                            className={`${styles.actionButton} ${styles.danger}`}
                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </Dropdown>

                            {/* Remove button for manual items */}
                            {sub.isManual && !sub.isMerged && (
                                <button
                                    onClick={removeManualItem}
                                    title="Remove from recurring"
                                    className={`${styles.actionButton} ${styles.danger}`}
                                    style={{ borderRadius: '10px', padding: '2px 6px' }}
                                >
                                    <Trash2 size={10} />
                                </button>
                            )}

                            {/* Unmerge button for merged items */}
                            {sub.isMerged && (
                                <button
                                    onClick={handleUnmerge}
                                    title="Unmerge - separate back into original items"
                                    className={`${styles.actionButton}`}
                                    style={{
                                        borderRadius: '10px',
                                        padding: '2px 6px',
                                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                        border: '1px solid rgba(168, 85, 247, 0.4)',
                                        color: '#d8b4fe'
                                    }}
                                >
                                    <Unlink size={10} />
                                </button>
                            )}

                            {/* Revert to Pending (for auto-detected items) */}
                            {!sub.isManual && approvedItems?.includes(sub.merchantKey) && (
                                <button
                                    onClick={handleRevert}
                                    title="Revert to Pending Review"
                                    className={`${styles.actionButton} ${styles.warning}`}
                                    style={{ borderRadius: '10px', padding: '2px 6px' }}
                                >
                                    <RotateCcw size={10} />
                                </button>
                            )}
                        </div>
                        <div className={styles.details}>
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
                <div className={styles.rightSection}>
                    <div style={{ textAlign: 'right' }}>
                        <div className={styles.amount}>${sub.latestAmount.toFixed(2)}</div>
                        <div className={styles.nextDate}>
                            Next: {sub.nextDate.toLocaleDateString()}
                        </div>
                    </div>
                    {expanded
                        ? <ChevronUp size={16} color="var(--text-secondary)" />
                        : <ChevronDown size={16} color="var(--text-secondary)" />}
                </div>
            </div>

            {/* EXPANDED CONTENT (Timeline & History) */}
            {expanded && sub.allTransactions && (
                <div
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing
                    className={styles.expandedContent}
                >
                    {/* STATS ROW */}
                    <div className={styles.statsGrid}>
                        {/* Next Payment */}
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>
                                <Calendar size={12} />
                                Next Payment
                            </div>
                            <div className={styles.statValue}>
                                {sub.nextDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className={styles.statSubtext}>
                                In {Math.ceil((sub.nextDate - new Date()) / (1000 * 60 * 60 * 24))} days
                            </div>
                        </div>

                        {/* Frequency & Average */}
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>
                                <Activity size={12} />
                                Frequency
                            </div>
                            <div className={styles.statValue}>
                                {sub.frequency}
                            </div>
                            <div className={styles.statSubtext}>
                                Avg: ${sub.avgAmount.toFixed(2)}
                            </div>
                        </div>

                        {/* Total Spent */}
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>
                                <DollarSign size={12} />
                                Total Lifetime
                            </div>
                            <div className={styles.statValue}>
                                ${sub.totalSpent.toFixed(2)}
                            </div>
                            <div className={styles.statSubtext}>
                                {sub.count} charges
                            </div>
                        </div>

                        {/* Yearly Forecast */}
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>
                                <TrendingUp size={12} />
                                Yearly Est.
                            </div>
                            <div className={styles.statValue}>
                                ${((sub.latestAmount) * (sub.frequency === 'Monthly' ? 12 : sub.frequency === 'Yearly' ? 1 : sub.frequency === 'Weekly' ? 52 : sub.frequency === 'Bi-Weekly' ? 26 : 4)).toFixed(2)}
                            </div>
                            <div className={styles.statSubtext}>
                                Based on current price
                            </div>
                        </div>
                    </div>

                    {/* CONTENT SPLIT: Timeline (Left) vs History (Right) */}
                    <div className={styles.contentGrid}>
                        <div className={styles.chartContainer}>
                            <div className={styles.sectionTitle}>
                                <TrendingUp size={14} />
                                Price History
                            </div>
                            <PaymentTimeline transactions={sub.allTransactions} />
                        </div>

                        <div className={styles.historyContainer}>
                            <div className={styles.sectionTitle} style={{ padding: '16px 16px 0 16px' }}>
                                <Clock size={14} />
                                Recent Charges
                            </div>
                            <div className={styles.scrollableHistory}>
                                <PaymentHistory transactions={sub.allTransactions} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
