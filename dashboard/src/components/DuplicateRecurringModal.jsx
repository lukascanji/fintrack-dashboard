import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import ModalOverlay, { ModalHeader, ModalFooter } from '../features/split-charges/components/ModalComponents';

/**
 * Modal for confirming addition of a duplicate recurring item.
 * Shows the existing item details and allows user to cancel or add anyway.
 */
export default function DuplicateRecurringModal({
    isOpen,
    onClose,
    existingItem,
    newTransaction,
    onCancel,
    onAddAnyway
}) {
    if (!isOpen || !existingItem || !newTransaction) return null;

    const handleCancel = () => {
        onCancel();
        onClose();
    };

    const handleAddAnyway = () => {
        onAddAnyway();
        onClose();
    };

    return (
        <ModalOverlay onClose={handleCancel}>
            <ModalHeader
                title="Duplicate Recurring Item"
                onClose={handleCancel}
            />

            <div style={{ padding: '20px' }}>
                {/* Warning message */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '20px'
                }}>
                    <AlertTriangle size={24} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            This item already exists in Recurring
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Adding it again may create duplicates. Review the existing item below.
                        </div>
                    </div>
                </div>

                {/* Existing item details */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '12px'
                    }}>
                        Existing Recurring Item
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: 'var(--accent-success)'
                        }}>
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>
                                {existingItem.displayName || existingItem.merchant}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {existingItem.merchantKey}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                                Amount
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                ${Math.abs(existingItem.amount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                                Category
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                {existingItem.category || 'OTHER'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                                Added On
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                {existingItem.dateAdded
                                    ? new Date(existingItem.dateAdded).toLocaleDateString()
                                    : 'Unknown'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* New transaction details */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px'
                    }}>
                        Transaction You're Adding
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                {newTransaction.merchant}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {newTransaction.date ? new Date(newTransaction.date).toLocaleDateString() : ''}
                            </div>
                        </div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            ${Math.abs(newTransaction.debit || newTransaction.credit || newTransaction.amount || 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            <ModalFooter
                onCancel={handleCancel}
                onConfirm={handleAddAnyway}
                cancelText="Cancel"
                confirmText="Add Anyway"
            />
        </ModalOverlay>
    );
}
