import React from 'react';
import { GitMerge } from 'lucide-react';

export default function RecurringStats({
    monthlyTotal,
    hasSplits,
    onClearSplits,
    mergeSelectedCount,
    onShowMergePrompt,
    onClearMergeSelection,
    hasApprovedItems
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ margin: 0 }}>Recurring Charges</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasSplits && (
                    <button
                        onClick={onClearSplits}
                        title="Clear old split data"
                        style={{
                            padding: '4px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: 'var(--accent-danger)',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: '500'
                        }}
                    >
                        Clear Splits
                    </button>
                )}
                {hasApprovedItems && (
                    <div style={{
                        padding: '6px 12px',
                        background: 'var(--gradient-primary)',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                    }}>
                        ~${monthlyTotal.toFixed(0)}/mo
                    </div>
                )}
                {/* Merge button when items selected */}
                {mergeSelectedCount >= 2 && (
                    <button
                        onClick={onShowMergePrompt}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: 'none',
                            borderRadius: '20px',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}
                    >
                        <GitMerge size={14} />
                        Merge {mergeSelectedCount} Selected
                    </button>
                )}
                {mergeSelectedCount > 0 && (
                    <button
                        onClick={onClearMergeSelection}
                        style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '20px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        Clear Selection
                    </button>
                )}
            </div>
        </div>
    );
}
