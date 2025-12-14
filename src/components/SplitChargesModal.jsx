import { useState, useMemo } from 'react';
import { getTransactionId } from '../utils/transactionId';
import ModalOverlay, { ModalHeader, ModalFooter } from '../features/split-charges/components/ModalComponents';
import ClusterPatternRow from '../features/split-charges/components/ClusterPatternRow';
import ChargeRow from '../features/split-charges/components/ChargeRow';

const CHARGE_ASSIGNMENTS_KEY = 'fintrack_charge_assignments';

export default function SplitChargesModal({
    isOpen,
    onClose,
    subscription,
    allSubscriptions,
    transactions,
    globalRenames = {},
    mergedSubscriptions = {},
    onCreateNewSubscription,
    onSave
}) {
    // Track assignment for each charge: { transactionId: targetSubscriptionKey }
    const [assignments, setAssignments] = useState({});
    // For creating new subscriptions inline
    const [newSubName, setNewSubName] = useState('');
    const [showNewSubInput, setShowNewSubInput] = useState(null);
    // For bulk cluster new subscription input
    const [clusterNewInput, setClusterNewInput] = useState(null);
    const [clusterNewName, setClusterNewName] = useState('');
    // Track which subscription was assigned to each cluster pattern
    const [clusterAssignments, setClusterAssignments] = useState({});
    // Track newly created subscriptions during this session
    const [createdSubs, setCreatedSubs] = useState([]);

    // Get all charges for this subscription
    const subscriptionCharges = useMemo(() => {
        if (!subscription || !isOpen) return [];

        const existingAssignments = JSON.parse(localStorage.getItem(CHARGE_ASSIGNMENTS_KEY) || '{}');

        const charges = (subscription.allTransactions || [])
            .map(t => ({
                ...t,
                id: getTransactionId(t),
                displayAmount: t.amount || t.debit || t.credit || 0
            }))
            .filter(t => {
                const isReassigned = existingAssignments[t.id] && existingAssignments[t.id] !== subscription.merchantKey;
                return !isReassigned;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return charges;
    }, [subscription, isOpen]);

    // Cluster charges by day-of-month pattern
    const dateClusters = useMemo(() => {
        if (subscriptionCharges.length === 0) return [];

        const clusters = {};
        subscriptionCharges.forEach(charge => {
            const dayOfMonth = new Date(charge.date).getDate();
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

        return Object.entries(clusters)
            .map(([day, charges]) => ({
                dayOfMonth: parseInt(day),
                charges,
                count: charges.length,
                label: `~${day}${['st', 'nd', 'rd'][parseInt(day) - 1] || 'th'} of month`
            }))
            .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    }, [subscriptionCharges]);

    // Get other subscriptions for dropdown
    const otherSubscriptions = useMemo(() => {
        if (!subscription || !allSubscriptions) return createdSubs;
        const others = allSubscriptions.filter(s => s.merchantKey !== subscription.merchantKey);
        return [...others, ...createdSubs];
    }, [allSubscriptions, subscription, createdSubs]);

    // Helper to get effective display name (checks globalRenames, mergedSubscriptions, then falls back to merchant)
    const getEffectiveName = (sub) => {
        // Check globalRenames (with amount key first, then base key)
        const amountKey = `${sub.merchantKey}-${sub.latestAmount?.toFixed(2)}`;
        if (globalRenames[amountKey]?.displayName) return globalRenames[amountKey].displayName;
        if (globalRenames[sub.merchantKey]?.displayName) return globalRenames[sub.merchantKey].displayName;

        // Check mergedSubscriptions
        if (mergedSubscriptions[sub.merchantKey]?.displayName) return mergedSubscriptions[sub.merchantKey].displayName;

        // Check if item itself has displayName (manual recurring / splits)
        if (sub.displayName) return sub.displayName;

        return sub.merchant;
    };

    // Early return AFTER hooks
    if (!isOpen || !subscription) return null;

    // --- Handler functions ---
    const assignCluster = (clusterIndex, targetKey) => {
        const cluster = dateClusters[clusterIndex];
        if (!cluster || targetKey === '__NEW__') return;

        const newAssignments = {};
        cluster.charges.forEach(charge => {
            newAssignments[charge.id] = targetKey;
        });

        setAssignments(prev => ({ ...prev, ...newAssignments }));
        setClusterAssignments(prev => ({ ...prev, [clusterIndex]: targetKey }));
    };

    const createNewForCluster = (clusterIndex, name) => {
        if (!name.trim()) return;

        const cluster = dateClusters[clusterIndex];
        if (!cluster) return;

        const newKey = `manual_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const newSub = {
            merchantKey: newKey,
            merchant: name,
            displayName: name,
            isManuallyCreated: true
        };

        setCreatedSubs(prev => [...prev, newSub]);

        const newAssignments = {};
        cluster.charges.forEach(charge => {
            newAssignments[charge.id] = newKey;
        });

        setAssignments(prev => ({ ...prev, ...newAssignments }));
        setClusterAssignments(prev => ({ ...prev, [clusterIndex]: newKey }));
        setClusterNewInput(null);
        setClusterNewName('');

        if (onCreateNewSubscription) {
            onCreateNewSubscription(newSub);
        }
    };

    const clearClusterAssignment = (clusterIndex) => {
        const cluster = dateClusters[clusterIndex];
        if (!cluster) return;

        const clusterChargeIds = cluster.charges.map(c => c.id);
        setAssignments(prev => {
            const updated = { ...prev };
            clusterChargeIds.forEach(id => delete updated[id]);
            return updated;
        });
        setClusterAssignments(prev => {
            const updated = { ...prev };
            delete updated[clusterIndex];
            return updated;
        });
    };

    const handleAssignmentChange = (transactionId, targetKey) => {
        setAssignments(prev => ({ ...prev, [transactionId]: targetKey }));
    };

    const handleCreateNew = (transactionId) => {
        if (!newSubName.trim()) return;

        const newKey = `manual_${newSubName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const newSub = {
            merchantKey: newKey,
            merchant: newSubName,
            displayName: newSubName,
            isManuallyCreated: true
        };

        setCreatedSubs(prev => [...prev, newSub]);
        setAssignments(prev => ({ ...prev, [transactionId]: newKey }));
        setNewSubName('');
        setShowNewSubInput(null);

        if (onCreateNewSubscription) {
            onCreateNewSubscription(newSub);
        }
    };

    const handleSave = () => {
        const existing = JSON.parse(localStorage.getItem(CHARGE_ASSIGNMENTS_KEY) || '{}');
        const updated = { ...existing, ...assignments };
        localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(updated));

        if (onSave) {
            onSave(assignments, createdSubs);
        }
        onClose();
    };

    const hasChanges = Object.keys(assignments).length > 0;

    // Get unassigned charges (not assigned via cluster)
    const clusterAssignedChargeIds = new Set();
    Object.keys(clusterAssignments).forEach(clusterIdx => {
        const cluster = dateClusters[parseInt(clusterIdx)];
        if (cluster) {
            cluster.charges.forEach(c => clusterAssignedChargeIds.add(c.id));
        }
    });
    const unassignedCharges = subscriptionCharges.filter(c => !clusterAssignedChargeIds.has(c.id));
    const clusterAssignedCount = clusterAssignedChargeIds.size;

    return (
        <ModalOverlay onClose={onClose}>
            <ModalHeader
                title={`Split Charges: ${subscription.displayName || subscription.merchant}`}
                onClose={onClose}
            />

            {/* Instructions */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
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

            {/* Date Cluster Summary */}
            {dateClusters.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {dateClusters.map((cluster, i) => {
                        const assignedCount = cluster.charges.filter(c => assignments[c.id]).length;
                        const isFullyAssigned = assignedCount === cluster.charges.length;
                        const clusterAssignedKey = clusterAssignments[i];
                        const clusterAssignedSub = clusterAssignedKey
                            ? [...otherSubscriptions, subscription].find(s => s.merchantKey === clusterAssignedKey)
                            || createdSubs.find(s => s.merchantKey === clusterAssignedKey)
                            : null;

                        return (
                            <ClusterPatternRow
                                key={cluster.dayOfMonth}
                                cluster={cluster}
                                clusterIndex={i}
                                isFullyAssigned={isFullyAssigned}
                                clusterAssignedSub={clusterAssignedSub}
                                subscription={subscription}
                                otherSubscriptions={otherSubscriptions}
                                getEffectiveName={getEffectiveName}
                                clusterNewInput={clusterNewInput}
                                clusterNewName={clusterNewName}
                                onClusterNewInputChange={setClusterNewInput}
                                onClusterNewNameChange={setClusterNewName}
                                onCreateNew={createNewForCluster}
                                onAssignCluster={assignCluster}
                                onClearCluster={clearClusterAssignment}
                            />
                        );
                    })}
                </div>
            )}

            {/* Charges List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
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
                    unassignedCharges.map(charge => (
                        <ChargeRow
                            key={charge.id}
                            charge={charge}
                            subscription={subscription}
                            otherSubscriptions={otherSubscriptions}
                            getEffectiveName={getEffectiveName}
                            currentAssignment={assignments[charge.id]}
                            isShowingNewInput={showNewSubInput === charge.id}
                            newSubName={newSubName}
                            onNewSubNameChange={setNewSubName}
                            onAssignmentChange={handleAssignmentChange}
                            onCreateNew={handleCreateNew}
                            onShowNewInput={setShowNewSubInput}
                            onHideNewInput={() => setShowNewSubInput(null)}
                        />
                    ))
                )}
            </div>

            <ModalFooter
                leftContent={`${Object.keys(assignments).length} charge(s) will be reassigned`}
                onCancel={onClose}
                onConfirm={handleSave}
                confirmDisabled={!hasChanges}
            />
        </ModalOverlay>
    );
}
