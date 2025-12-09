import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';

export default function ChargeRow({
    charge,
    subscription,
    otherSubscriptions,
    currentAssignment,
    isShowingNewInput,
    newSubName,
    onNewSubNameChange,
    onAssignmentChange,
    onCreateNew,
    onShowNewInput,
    onHideNewInput
}) {
    const amount = charge.debit || charge.credit || charge.amount || 0;
    const dateStr = new Date(charge.date).toLocaleDateString();

    return (
        <div style={{
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
                            onChange={(e) => onNewSubNameChange(e.target.value)}
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
                                if (e.key === 'Enter') onCreateNew(charge.id);
                                if (e.key === 'Escape') onHideNewInput();
                            }}
                        />
                        <button
                            onClick={() => onCreateNew(charge.id)}
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
                            onClick={onHideNewInput}
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
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__NEW__') {
                                onShowNewInput(charge.id);
                            } else {
                                onAssignmentChange(charge.id, val);
                            }
                        }}
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
}
