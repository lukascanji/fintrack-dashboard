import { useState, useMemo } from 'react';
import { X, Scissors, Plus, Trash2, Check } from 'lucide-react';

/**
 * SplitMerchantModal - Split bundled transactions into components
 * 
 * This modal is used ONLY for cases where a single transaction actually
 * contains multiple services bundled together. For renaming subscriptions,
 * use the pencil/rename feature instead.
 */
export default function SplitMerchantModal({
    isOpen,
    onClose,
    merchantKey,
    merchantName,
    transactions,  // All transactions for this merchant
    existingSplits, // Previously saved splits for this merchant
    onSave
}) {
    // Bundle splitting state
    const [bundles, setBundles] = useState(() => {
        return existingSplits?.bundles || {};
    });

    // Selected bundle for editing
    const [selectedBundleKey, setSelectedBundleKey] = useState(null);
    const [bundleComponents, setBundleComponents] = useState([]);

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
            bundles: bundles
        });
        onClose();
    };

    // Clear all splits
    const clearAllSplits = () => {
        setBundles({});
    };

    if (!isOpen) return null;

    // Get unique transactions that could be bundles
    const bundleableTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        // Sort by date, most recent first
        return [...transactions]
            .sort((a, b) => b.date - a.date)
            .slice(0, 10); // Show last 10 transactions
    }, [transactions]);

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
                    width: '500px',
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
                            Split Bundled Transaction
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

                {/* Content */}
                <div style={{
                    padding: '16px 20px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {!selectedBundleKey ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                margin: 0
                            }}>
                                Use this for transactions that bundle multiple services into one charge.
                                For simple renaming, use the ✏️ pencil button instead.
                            </p>

                            <div style={{ fontSize: '0.8rem', fontWeight: '500', marginTop: '8px' }}>
                                Select a transaction to split:
                            </div>

                            {bundleableTransactions.map((txn, idx) => {
                                const txnKey = `${txn.date.toISOString().split('T')[0]}_${txn.amount.toFixed(2)}`;
                                const isSplit = !!bundles[txnKey];

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => selectBundleToSplit(txn)}
                                        style={{
                                            background: isSplit
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
                                        {isSplit ? (
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
                                );
                            })}

                            {Object.keys(bundles).length > 0 && (
                                <button
                                    onClick={clearAllSplits}
                                    style={{
                                        marginTop: '8px',
                                        padding: '8px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '6px',
                                        color: 'var(--accent-danger)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    Clear All Splits
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: '500' }}>
                                    Splitting: ${selectedBundleAmount.toFixed(2)}
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
                                    Remaining (tax/fees):
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
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
