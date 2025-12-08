import { useState, useMemo } from 'react';
import { X, Plus, Check, ArrowRight } from 'lucide-react';

const CHARGE_ASSIGNMENTS_KEY = 'fintrack_charge_assignments';

export default function SplitChargesModal({
    isOpen,
    onClose,
    subscription,
    allSubscriptions,
    transactions,
    onCreateNewSubscription,
    onSave
}) {
    // Track assignment for each charge: { transactionId: targetSubscriptionKey }
    const [assignments, setAssignments] = useState({});
    // For creating new subscriptions inline
    const [newSubName, setNewSubName] = useState('');
    const [showNewSubInput, setShowNewSubInput] = useState(null); // transactionId or null
    // Track newly created subscriptions during this session
    const [createdSubs, setCreatedSubs] = useState([]);

    // Get all charges for this subscription from transactions
    // Must be before early return to satisfy React hooks rules
    const subscriptionCharges = useMemo(() => {
        if (!transactions || !subscription || !isOpen) return [];

        // Load existing assignments to filter out already-reassigned charges
        const existingAssignments = JSON.parse(localStorage.getItem(CHARGE_ASSIGNMENTS_KEY) || '{}');

        return transactions.filter(t => {
            const amount = t.debit || t.credit || t.amount || 0;
            // Match by merchantKey pattern - this is a simplified match
            // In reality we'd want to match the exact charging pattern
            const matchesAmount = subscription.latestAmount > 0
                ? Math.abs(amount - subscription.latestAmount) / subscription.latestAmount < 0.03
                : false;
            const merchantSlice = subscription.merchant?.toUpperCase().slice(0, 8) || '';
            const matchesMerchant = merchantSlice && t.description?.toUpperCase().includes(merchantSlice);

            // Check if already assigned elsewhere
            const isReassigned = existingAssignments[t.id] && existingAssignments[t.id] !== subscription.merchantKey;

            return matchesAmount && matchesMerchant && !isReassigned;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, subscription, isOpen]);

    // Get other subscriptions for dropdown (exclude current)
    const otherSubscriptions = useMemo(() => {
        if (!subscription || !allSubscriptions) return createdSubs;
        const others = allSubscriptions.filter(s => s.merchantKey !== subscription.merchantKey);
        // Add any newly created subs from this session
        return [...others, ...createdSubs];
    }, [allSubscriptions, subscription, createdSubs]);

    // Early return AFTER hooks
    if (!isOpen || !subscription) return null;

    const handleAssignmentChange = (transactionId, targetKey) => {
        if (targetKey === '__NEW__') {
            setShowNewSubInput(transactionId);
        } else {
            setAssignments(prev => ({
                ...prev,
                [transactionId]: targetKey
            }));
            setShowNewSubInput(null);
        }
    };

    const handleCreateNew = (transactionId) => {
        if (!newSubName.trim()) return;

        // Create a new subscription entry
        const newKey = `manual_${newSubName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const newSub = {
            merchantKey: newKey,
            merchant: newSubName,
            displayName: newSubName,
            isManuallyCreated: true
        };

        setCreatedSubs(prev => [...prev, newSub]);
        setAssignments(prev => ({
            ...prev,
            [transactionId]: newKey
        }));
        setNewSubName('');
        setShowNewSubInput(null);

        // Notify parent to create the subscription
        if (onCreateNewSubscription) {
            onCreateNewSubscription(newSub);
        }
    };

    const handleSave = () => {
        // Save assignments to localStorage
        const existing = JSON.parse(localStorage.getItem(CHARGE_ASSIGNMENTS_KEY) || '{}');
        const updated = { ...existing, ...assignments };
        localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(updated));

        if (onSave) {
            onSave(assignments, createdSubs);
        }
        onClose();
    };

    const hasChanges = Object.keys(assignments).length > 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        Split Charges: {subscription.displayName || subscription.merchant}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Instructions */}
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    marginBottom: '16px'
                }}>
                    Assign charges to different subscriptions. Use this when the same price point
                    contains multiple different subscriptions.
                </p>

                {/* Charges List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: '16px'
                }}>
                    {subscriptionCharges.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                            No charges found for this subscription.
                        </p>
                    ) : (
                        subscriptionCharges.map(charge => {
                            const amount = charge.debit || charge.credit || charge.amount || 0;
                            const dateStr = new Date(charge.date).toLocaleDateString();
                            const currentAssignment = assignments[charge.id];
                            const isShowingNewInput = showNewSubInput === charge.id;

                            return (
                                <div key={charge.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    background: currentAssignment ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    border: currentAssignment ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent'
                                }}>
                                    {/* Date & Amount */}
                                    <div style={{ minWidth: '140px' }}>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {dateStr}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            ${amount.toFixed(2)}
                                        </div>
                                    </div>

                                    <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />

                                    {/* Assignment Dropdown or New Input */}
                                    <div style={{ flex: 1 }}>
                                        {isShowingNewInput ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={newSubName}
                                                    onChange={(e) => setNewSubName(e.target.value)}
                                                    placeholder="New subscription name..."
                                                    autoFocus
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        borderRadius: '6px',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.9rem'
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCreateNew(charge.id);
                                                        if (e.key === 'Escape') setShowNewSubInput(null);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleCreateNew(charge.id)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'var(--accent-success)',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setShowNewSubInput(null)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                value={currentAssignment || subscription.merchantKey}
                                                onChange={(e) => handleAssignmentChange(charge.id, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value={subscription.merchantKey}>
                                                    Keep with {subscription.displayName || subscription.merchant}
                                                </option>
                                                <optgroup label="Move to existing">
                                                    {otherSubscriptions.map(s => (
                                                        <option key={s.merchantKey} value={s.merchantKey}>
                                                            {s.displayName || s.merchant}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <option value="__NEW__">+ Create New Subscription</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {Object.keys(assignments).length} charge(s) will be reassigned
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            style={{
                                padding: '10px 20px',
                                background: hasChanges ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: hasChanges ? 'white' : 'var(--text-secondary)',
                                cursor: hasChanges ? 'pointer' : 'not-allowed',
                                fontWeight: 500
                            }}
                        >
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
