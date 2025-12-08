import { useState, useMemo } from 'react';
import { X, Plus, Check, ArrowRight } from 'lucide-react';
import { getTransactionId } from '../utils/transactionId';

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
    // For bulk cluster new subscription input
    const [clusterNewInput, setClusterNewInput] = useState(null); // cluster index or null
    const [clusterNewName, setClusterNewName] = useState('');
    // Track which subscription was assigned to each cluster pattern
    const [clusterAssignments, setClusterAssignments] = useState({}); // { clusterIndex: merchantKey }
    // Track newly created subscriptions during this session
    const [createdSubs, setCreatedSubs] = useState([]);

    // Get all charges for this subscription - use the transactions already attached to the subscription
    // Must be before early return to satisfy React hooks rules
    const subscriptionCharges = useMemo(() => {
        if (!subscription || !isOpen) return [];

        // Load existing assignments to filter out already-reassigned charges
        const existingAssignments = JSON.parse(localStorage.getItem(CHARGE_ASSIGNMENTS_KEY) || '{}');

        // Use the transactions already attached to the subscription object
        // Use utility function for consistent ID generation across all components
        const charges = (subscription.allTransactions || [])
            .map(t => ({
                ...t,
                // Use consistent ID utility - same algorithm everywhere
                id: getTransactionId(t),
                // Ensure we have a proper amount
                displayAmount: t.amount || t.debit || t.credit || 0
            }))
            .filter(t => {
                // Check if already assigned elsewhere
                const isReassigned = existingAssignments[t.id] && existingAssignments[t.id] !== subscription.merchantKey;
                return !isReassigned;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return charges;
    }, [subscription, isOpen]);

    // Cluster charges by day-of-month pattern to help identify different subscriptions
    const dateClusters = useMemo(() => {
        if (subscriptionCharges.length === 0) return [];

        // Group by approximate day of month (allow ±3 days fuzziness)
        const clusters = {};
        subscriptionCharges.forEach(charge => {
            const dayOfMonth = new Date(charge.date).getDate();
            // Find or create cluster
            let foundCluster = null;
            for (const clusterDay of Object.keys(clusters)) {
                if (Math.abs(dayOfMonth - parseInt(clusterDay)) <= 3) {
                    foundCluster = clusterDay;
                    break;
                }
            }
            if (foundCluster) {
                clusters[foundCluster].push(charge);
            } else {
                clusters[dayOfMonth] = [charge];
            }
        });

        // Convert to array and sort by day
        return Object.entries(clusters)
            .map(([day, charges]) => ({
                dayOfMonth: parseInt(day),
                charges,
                count: charges.length,
                label: `~${day}${['st', 'nd', 'rd'][parseInt(day) - 1] || 'th'} of month`
            }))
            .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    }, [subscriptionCharges]);

    // Get other subscriptions for dropdown (exclude current)
    const otherSubscriptions = useMemo(() => {
        if (!subscription || !allSubscriptions) return createdSubs;
        const others = allSubscriptions.filter(s => s.merchantKey !== subscription.merchantKey);
        // Add any newly created subs from this session
        return [...others, ...createdSubs];
    }, [allSubscriptions, subscription, createdSubs]);

    // Early return AFTER hooks
    if (!isOpen || !subscription) return null;

    // Assign all charges in a cluster to a target subscription
    const assignCluster = (clusterIndex, targetKey) => {
        const cluster = dateClusters[clusterIndex];
        if (!cluster) return;

        if (targetKey === '__NEW__') {
            // Will be handled by bulk new input
            return;
        }

        // Assign all charges in this cluster
        const newAssignments = {};
        cluster.charges.forEach(charge => {
            newAssignments[charge.id] = targetKey;
        });

        setAssignments(prev => ({
            ...prev,
            ...newAssignments
        }));

        // Track which subscription was assigned to this cluster
        setClusterAssignments(prev => ({
            ...prev,
            [clusterIndex]: targetKey
        }));
    };

    // Create new subscription and assign all cluster charges to it
    const createNewForCluster = (clusterIndex, name) => {
        if (!name.trim()) return;

        const cluster = dateClusters[clusterIndex];
        if (!cluster) return;

        // Create new subscription entry
        const newKey = `manual_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const newSub = {
            merchantKey: newKey,
            merchant: name,
            displayName: name,
            isManuallyCreated: true
        };

        setCreatedSubs(prev => [...prev, newSub]);

        // Assign all charges in cluster to new subscription
        const newAssignments = {};
        cluster.charges.forEach(charge => {
            newAssignments[charge.id] = newKey;
        });

        setAssignments(prev => ({
            ...prev,
            ...newAssignments
        }));

        // Track which subscription was assigned to this cluster
        setClusterAssignments(prev => ({
            ...prev,
            [clusterIndex]: newKey
        }));

        // Notify parent
        if (onCreateNewSubscription) {
            onCreateNewSubscription(newSub);
        }
    };

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
                    {dateClusters.length > 1 ? (
                        <>
                            <strong style={{ color: 'var(--accent-warning)' }}>
                                Found {dateClusters.length} billing patterns!
                            </strong>{' '}
                            Charges grouped by day-of-month. Assign each pattern to a different subscription.
                        </>
                    ) : (
                        'Assign charges to different subscriptions. Use this when the same price point contains multiple different subscriptions.'
                    )}
                </p>

                {/* Date Cluster Summary - Interactive */}
                {dateClusters.length > 1 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        {dateClusters.map((cluster, i) => {
                            // Check if all charges in this cluster are assigned
                            const assignedCount = cluster.charges.filter(c => assignments[c.id]).length;
                            const isFullyAssigned = assignedCount === cluster.charges.length;

                            // Get the assigned subscription for this cluster
                            const clusterAssignedKey = clusterAssignments[i];
                            const clusterAssignedSub = clusterAssignedKey
                                ? [...otherSubscriptions, subscription].find(s => s.merchantKey === clusterAssignedKey)
                                || createdSubs.find(s => s.merchantKey === clusterAssignedKey)
                                : null;

                            return (
                                <div key={cluster.dayOfMonth} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    background: isFullyAssigned
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : `rgba(${i === 0 ? '99, 102, 241' : '249, 115, 22'}, 0.15)`,
                                    borderRadius: '8px',
                                    border: isFullyAssigned
                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                        : `1px solid rgba(${i === 0 ? '99, 102, 241' : '249, 115, 22'}, 0.3)`
                                }}>
                                    <div style={{
                                        flex: 1,
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: isFullyAssigned ? 'var(--accent-success)' : 'var(--text-primary)'
                                    }}>
                                        Pattern {i + 1}: {cluster.label}
                                        <span style={{
                                            color: 'var(--text-secondary)',
                                            fontWeight: 400,
                                            marginLeft: '8px'
                                        }}>
                                            ({cluster.count} charges)
                                        </span>
                                        {isFullyAssigned && (
                                            <span style={{ marginLeft: '8px' }}>✓</span>
                                        )}
                                    </div>

                                    {clusterNewInput === i ? (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={clusterNewName}
                                                onChange={(e) => setClusterNewName(e.target.value)}
                                                placeholder="New subscription name..."
                                                autoFocus
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.8rem',
                                                    width: '160px'
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        createNewForCluster(i, clusterNewName);
                                                        setClusterNewInput(null);
                                                        setClusterNewName('');
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setClusterNewInput(null);
                                                        setClusterNewName('');
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    createNewForCluster(i, clusterNewName);
                                                    setClusterNewInput(null);
                                                    setClusterNewName('');
                                                }}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'var(--accent-success)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setClusterNewInput(null);
                                                    setClusterNewName('');
                                                }}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : clusterAssignedSub ? (
                                        // Show assigned subscription with change option
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                padding: '6px 12px',
                                                background: 'rgba(34, 197, 94, 0.2)',
                                                borderRadius: '6px',
                                                color: 'var(--accent-success)',
                                                fontSize: '0.8rem',
                                                fontWeight: 500
                                            }}>
                                                → {clusterAssignedSub.displayName || clusterAssignedSub.merchant}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    // Clear assignments for this cluster
                                                    const clusterChargeIds = cluster.charges.map(c => c.id);
                                                    setAssignments(prev => {
                                                        const updated = { ...prev };
                                                        clusterChargeIds.forEach(id => delete updated[id]);
                                                        return updated;
                                                    });
                                                    setClusterAssignments(prev => {
                                                        const updated = { ...prev };
                                                        delete updated[i];
                                                        return updated;
                                                    });
                                                }}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '__NEW__') {
                                                    setClusterNewInput(i);
                                                } else if (val) {
                                                    assignCluster(i, val);
                                                }
                                            }}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                minWidth: '160px'
                                            }}
                                        >
                                            <option value="">Assign all {cluster.count}...</option>
                                            <option value={subscription.merchantKey}>
                                                Keep with {subscription.displayName || subscription.merchant}
                                            </option>
                                            {otherSubscriptions.length > 0 && (
                                                <optgroup label="Move to existing">
                                                    {otherSubscriptions.map(s => (
                                                        <option key={s.merchantKey} value={s.merchantKey}>
                                                            {s.displayName || s.merchant}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            <option value="__NEW__">+ Create New Subscription</option>
                                        </select>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Charges List - Only show unassigned or individually-assigned charges */}
                {(() => {
                    // Get all charge IDs that were bulk-assigned via cluster
                    const clusterAssignedChargeIds = new Set();
                    Object.keys(clusterAssignments).forEach(clusterIdx => {
                        const cluster = dateClusters[parseInt(clusterIdx)];
                        if (cluster) {
                            cluster.charges.forEach(c => clusterAssignedChargeIds.add(c.id));
                        }
                    });

                    // Filter to only show charges NOT assigned via cluster
                    const unassignedCharges = subscriptionCharges.filter(c => !clusterAssignedChargeIds.has(c.id));
                    const clusterAssignedCount = clusterAssignedChargeIds.size;

                    return (
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            marginBottom: '16px'
                        }}>
                            {clusterAssignedCount > 0 && unassignedCharges.length > 0 && (
                                <div style={{
                                    padding: '8px 12px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '6px',
                                    marginBottom: '12px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    ✓ {clusterAssignedCount} charges assigned via pattern selection above
                                </div>
                            )}

                            {unassignedCharges.length === 0 && clusterAssignedCount > 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                    All {clusterAssignedCount} charges have been assigned via pattern selection.
                                    <br />
                                    <span style={{ fontSize: '0.75rem' }}>
                                        Click "Change" above to modify assignments.
                                    </span>
                                </p>
                            ) : unassignedCharges.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    No charges found for this subscription.
                                    <br />
                                    <span style={{ fontSize: '0.75rem' }}>
                                        (Subscription may not have transaction data attached)
                                    </span>
                                </p>
                            ) : (
                                unassignedCharges.map(charge => {
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
                    );
                })()}

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
