import { useState, useMemo } from 'react';
import { X, Scissors } from 'lucide-react';
import TransactionSelectList from '../features/split-charges/components/TransactionSelectList';
import BundleComponentEditor from '../features/split-charges/components/BundleComponentEditor';

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
    transactions,
    existingSplits,
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

        if (bundles[key]) {
            setBundleComponents(bundles[key].components);
        } else {
            setBundleComponents([
                { name: '', amount: '' },
                { name: '', amount: '' }
            ]);
        }
    };

    // Calculate bundle total
    const bundleTotal = useMemo(() => {
        return bundleComponents.reduce((sum, comp) => {
            const amt = parseFloat(comp.amount) || 0;
            return sum + amt;
        }, 0);
    }, [bundleComponents]);

    const selectedBundleAmount = selectedBundleKey
        ? parseFloat(selectedBundleKey.split('_')[1])
        : 0;

    // Handler functions
    const addBundleComponent = () => {
        setBundleComponents(prev => [...prev, { name: '', amount: '' }]);
    };

    const removeBundleComponent = (index) => {
        setBundleComponents(prev => prev.filter((_, i) => i !== index));
    };

    const updateBundleComponent = (index, field, value) => {
        setBundleComponents(prev => prev.map((comp, i) =>
            i === index ? { ...comp, [field]: value } : comp
        ));
    };

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

    const handleSave = () => {
        onSave({ bundles });
        onClose();
    };

    const clearAllSplits = () => {
        setBundles({});
    };

    const handleBack = () => {
        setSelectedBundleKey(null);
        setBundleComponents([]);
    };

    if (!isOpen) return null;

    // Get unique transactions that could be bundles
    const bundleableTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        return [...transactions]
            .sort((a, b) => b.date - a.date)
            .slice(0, 10);
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
                        <TransactionSelectList
                            transactions={bundleableTransactions}
                            bundles={bundles}
                            onSelect={selectBundleToSplit}
                            onClearAll={clearAllSplits}
                        />
                    ) : (
                        <BundleComponentEditor
                            selectedBundleAmount={selectedBundleAmount}
                            bundleComponents={bundleComponents}
                            bundleTotal={bundleTotal}
                            onUpdateComponent={updateBundleComponent}
                            onAddComponent={addBundleComponent}
                            onRemoveComponent={removeBundleComponent}
                            onSave={saveBundleSplit}
                            onBack={handleBack}
                        />
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
