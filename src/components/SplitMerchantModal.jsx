import { useState, useMemo } from 'react';
import { X, Scissors, Plus, Trash2, Check } from 'lucide-react';

const ALL_CATEGORIES = [
    'INCOME', 'HOUSING', 'UTILITIES', 'GROCERIES', 'DINING', 'TRANSPORTATION',
    'HEALTHCARE', 'ENTERTAINMENT', 'SHOPPING', 'TRAVEL', 'EDUCATION',
    'PERSONAL', 'GIFTS', 'FEES', 'TRANSFER', 'OTHER'
];

export default function SplitMerchantModal({
    isOpen,
    onClose,
    merchantKey,
    merchantName,
    transactions,  // All transactions for this merchant
    existingSplits, // Previously saved splits for this merchant
    onSave
}) {
    const [activeTab, setActiveTab] = useState('clusters');

    // Cluster naming state
    const [clusterNames, setClusterNames] = useState(() => {
        return existingSplits?.clusters || {};
    });

    // Bundle splitting state
    const [bundles, setBundles] = useState(() => {
        return existingSplits?.bundles || {};
    });

    // Selected bundle for editing
    const [selectedBundleKey, setSelectedBundleKey] = useState(null);
    const [bundleComponents, setBundleComponents] = useState([]);

    // Group transactions by amount (fuzzy 15%)
    const amountClusters = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const clusters = [];
        const sorted = [...transactions].sort((a, b) => a.amount - b.amount);

        sorted.forEach(txn => {
            let foundCluster = false;
            for (const cluster of clusters) {
                const diff = Math.abs(cluster.baseAmount - txn.amount) / Math.max(cluster.baseAmount, txn.amount);
                if (diff < 0.15) {
                    cluster.transactions.push(txn);
                    foundCluster = true;
                    break;
                }
            }
            if (!foundCluster) {
                clusters.push({
                    baseAmount: txn.amount,
                    amountKey: txn.amount.toFixed(2),
                    transactions: [txn]
                });
            }
        });

        return clusters.sort((a, b) => b.transactions.length - a.transactions.length);
    }, [transactions]);

    // Handle cluster name change
    const updateClusterName = (amountKey, name, category) => {
        setClusterNames(prev => ({
            ...prev,
            [amountKey]: {
                name: name || prev[amountKey]?.name || '',
                category: category || prev[amountKey]?.category || 'OTHER'
            }
        }));
    };

    // Handle bundle selection for splitting
    const selectBundleToSplit = (txn) => {
        const key = `${txn.date.toISOString().split('T')[0]}_${txn.amount.toFixed(2)}`;
        setSelectedBundleKey(key);

        // Load existing components or start fresh
        if (bundles[key]) {
            setBundleComponents(bundles[key].components);
        } else {
            setBundleComponents([
                { name: '', amount: '' },
                { name: '', amount: '' }
            ]);
        }
        setActiveTab('bundles');
    };

    // Add bundle component
    const addBundleComponent = () => {
        setBundleComponents(prev => [...prev, { name: '', amount: '' }]);
    };

    // Remove bundle component
    const removeBundleComponent = (index) => {
        setBundleComponents(prev => prev.filter((_, i) => i !== index));
    };

    // Update bundle component
    const updateBundleComponent = (index, field, value) => {
        setBundleComponents(prev => prev.map((comp, i) =>
            i === index ? { ...comp, [field]: value } : comp
        ));
    };

    // Calculate remaining amount (tax)
    const bundleTotal = useMemo(() => {
        return bundleComponents.reduce((sum, comp) => {
            const amt = parseFloat(comp.amount) || 0;
            return sum + amt;
        }, 0);
    }, [bundleComponents]);

    const selectedBundleAmount = selectedBundleKey
        ? parseFloat(selectedBundleKey.split('_')[1])
        : 0;
    const remainingAmount = selectedBundleAmount - bundleTotal;

    // Save bundle split
    const saveBundleSplit = () => {
        if (!selectedBundleKey) return;

        const validComponents = bundleComponents.filter(c => c.name && c.amount);
        if (validComponents.length === 0) return;

        setBundles(prev => ({
            ...prev,
            [selectedBundleKey]: {
                components: validComponents.map(c => ({
                    name: c.name,
                    amount: parseFloat(c.amount),
                    category: c.category || 'ENTERTAINMENT'
                }))
            }
        }));

        setSelectedBundleKey(null);
        setBundleComponents([]);
    };

    // Save all and close
    const handleSave = () => {
        onSave({
            clusters: clusterNames,
            bundles: bundles
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
            style={{
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
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    width: '600px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Scissors size={20} color="var(--accent-primary)" />
                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                            Split: {merchantName}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={20} color="var(--text-secondary)" />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <button
                        onClick={() => setActiveTab('clusters')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'clusters'
                                ? 'rgba(99, 102, 241, 0.1)'
                                : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'clusters'
                                ? '2px solid var(--accent-primary)'
                                : '2px solid transparent',
                            color: activeTab === 'clusters'
                                ? 'var(--accent-primary)'
                                : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Name Clusters
                    </button>
                    <button
                        onClick={() => setActiveTab('bundles')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'bundles'
                                ? 'rgba(99, 102, 241, 0.1)'
                                : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'bundles'
                                ? '2px solid var(--accent-primary)'
                                : '2px solid transparent',
                            color: activeTab === 'bundles'
                                ? 'var(--accent-primary)'
                                : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Split Bundles
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '16px 20px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {activeTab === 'clusters' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                margin: 0
                            }}>
                                Name each amount cluster to create separate subscriptions.
                            </p>

                            {amountClusters.map((cluster, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{ fontWeight: '500' }}>
                                            ~${cluster.baseAmount.toFixed(2)}
                                        </span>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {cluster.transactions.length} charges
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center'
                                    }}>
                                        <input
                                            type="text"
                                            placeholder="Subscription name..."
                                            value={clusterNames[cluster.amountKey]?.name || ''}
                                            onChange={(e) => updateClusterName(
                                                cluster.amountKey,
                                                e.target.value,
                                                clusterNames[cluster.amountKey]?.category
                                            )}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        <select
                                            value={clusterNames[cluster.amountKey]?.category || 'OTHER'}
                                            onChange={(e) => updateClusterName(
                                                cluster.amountKey,
                                                clusterNames[cluster.amountKey]?.name,
                                                e.target.value
                                            )}
                                            style={{
                                                padding: '8px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {ALL_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {cluster.transactions.length <= 3 && (
                                        <button
                                            onClick={() => selectBundleToSplit(cluster.transactions[0])}
                                            style={{
                                                marginTop: '8px',
                                                padding: '6px 12px',
                                                background: 'rgba(99, 102, 241, 0.2)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            → Might be a bundle? Split it
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'bundles' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {!selectedBundleKey ? (
                                <>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        margin: 0
                                    }}>
                                        Select a transaction to split into multiple subscriptions.
                                    </p>

                                    {/* Show transactions that might be bundles */}
                                    {amountClusters
                                        .filter(c => c.transactions.length <= 3)
                                        .map((cluster, idx) => (
                                            cluster.transactions.map((txn, tIdx) => (
                                                <div
                                                    key={`${idx}-${tIdx}`}
                                                    onClick={() => selectBundleToSplit(txn)}
                                                    style={{
                                                        background: bundles[`${txn.date.toISOString().split('T')[0]}_${txn.amount.toFixed(2)}`]
                                                            ? 'rgba(16, 185, 129, 0.1)'
                                                            : 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>
                                                            ${txn.amount.toFixed(2)}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            {txn.date.toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    {bundles[`${txn.date.toISOString().split('T')[0]}_${txn.amount.toFixed(2)}`] ? (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--accent-success)'
                                                        }}>
                                                            ✓ Split defined
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--accent-primary)'
                                                        }}>
                                                            Click to split →
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ))}
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: '500' }}>
                                            Splitting: ${selectedBundleAmount.toFixed(2)} on {selectedBundleKey.split('_')[0]}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedBundleKey(null);
                                                setBundleComponents([]);
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            ← Back
                                        </button>
                                    </div>

                                    {bundleComponents.map((comp, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <input
                                                type="text"
                                                placeholder="Service name..."
                                                value={comp.name}
                                                onChange={(e) => updateBundleComponent(idx, 'name', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)' }}>$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={comp.amount}
                                                onChange={(e) => updateBundleComponent(idx, 'amount', e.target.value)}
                                                style={{
                                                    width: '80px',
                                                    padding: '8px',
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem',
                                                    textAlign: 'right'
                                                }}
                                            />
                                            <button
                                                onClick={() => removeBundleComponent(idx)}
                                                style={{
                                                    padding: '6px',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={14} color="var(--accent-danger)" />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={addBundleComponent}
                                        style={{
                                            padding: '8px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px dashed var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'var(--accent-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Plus size={14} /> Add Component
                                    </button>

                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Remaining (tax):
                                        </span>
                                        <span style={{
                                            fontWeight: '500',
                                            color: remainingAmount < 0
                                                ? 'var(--accent-danger)'
                                                : 'var(--text-primary)'
                                        }}>
                                            ${remainingAmount.toFixed(2)}
                                        </span>
                                    </div>

                                    <button
                                        onClick={saveBundleSplit}
                                        disabled={bundleComponents.filter(c => c.name && c.amount).length === 0}
                                        style={{
                                            padding: '10px',
                                            background: 'var(--accent-primary)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            opacity: bundleComponents.filter(c => c.name && c.amount).length === 0 ? 0.5 : 1
                                        }}
                                    >
                                        <Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                        Save Bundle Split
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '10px 20px',
                            background: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Save All
                    </button>
                </div>
            </div>
        </div>
    );
}
