/**
 * Suggestion Card Component
 * Displays individual merge/split suggestions with visual timeline and actions
 */

import React, { useState } from 'react';
import { GitMerge, Scissors, Check, X, Edit3 } from 'lucide-react';

/**
 * Generate timeline data for visualization
 */
function generateTimelineData(items) {
    if (!items || items.length === 0) return [];

    // Get all transactions from all items
    const allDates = new Map();

    items.forEach((item, idx) => {
        const transactions = item.allTransactions || [];
        transactions.forEach(txn => {
            const date = new Date(txn.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!allDates.has(monthKey)) {
                allDates.set(monthKey, { month: monthKey, items: new Array(items.length).fill(0) });
            }
            allDates.get(monthKey).items[idx] += 1;
        });
    });

    // Sort by date
    return Array.from(allDates.values())
        .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Format date for display
 */
function formatDateRange(item) {
    const first = item.firstDate ? new Date(item.firstDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    }) : '?';
    const last = item.lastDate ? new Date(item.lastDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    }) : '?';
    return `${first} - ${last}`;
}

export default function SuggestionCard({
    suggestion,
    onApprove,
    onDismiss,
    onModify,
    globalRenames = {}
}) {
    const [editingName, setEditingName] = useState(false);
    const [mergedName, setMergedName] = useState(() => {
        // Use existing globalRename if present
        for (const item of suggestion.items || []) {
            if (globalRenames[item.merchantKey]?.displayName) {
                return globalRenames[item.merchantKey].displayName;
            }
        }
        return suggestion.suggestedName || 'Merged Subscription';
    });

    const isMerge = suggestion.type === 'merge';
    const items = suggestion.items || [];
    const timelineData = isMerge ? generateTimelineData(items) : [];

    // Colors for different items in timeline
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

    return (
        <div style={{
            background: 'var(--card-bg)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                background: isMerge
                    ? 'rgba(139, 92, 246, 0.1)'
                    : 'rgba(59, 130, 246, 0.1)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isMerge ? (
                        <GitMerge size={18} style={{ color: '#8b5cf6' }} />
                    ) : (
                        <Scissors size={18} style={{ color: '#3b82f6' }} />
                    )}
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        {isMerge ? 'Merge Suggestion' : 'Split Suggestion'}
                    </span>
                </div>
                <div style={{
                    background: suggestion.confidence >= 0.8
                        ? 'rgba(16, 185, 129, 0.2)'
                        : suggestion.confidence >= 0.6
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                    color: suggestion.confidence >= 0.8
                        ? '#10b981'
                        : suggestion.confidence >= 0.6
                            ? '#f59e0b'
                            : '#ef4444',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                }}>
                    {Math.round(suggestion.confidence * 100)}% confidence
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
                {/* Items Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: items.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    {items.map((item, idx) => {
                        // Use globalRename if available, otherwise fall back to merchant
                        const displayName = globalRenames[item.merchantKey]?.displayName || item.merchant;

                        return (
                            <div
                                key={item.merchantKey}
                                style={{
                                    padding: '12px',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    borderLeft: `3px solid ${colors[idx % colors.length]}`
                                }}
                            >
                                <div style={{
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    marginBottom: '4px'
                                }}>
                                    {displayName}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <span>{item.count} charges</span>
                                    <span>•</span>
                                    <span>~${(item.latestAmount || 0).toFixed(2)}</span>
                                    {item.frequency && (
                                        <>
                                            <span>•</span>
                                            <span style={{
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                color: '#a78bfa',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem'
                                            }}>
                                                {item.frequency}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    marginTop: '4px'
                                }}>
                                    {formatDateRange(item)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Timeline Visualization (for merges) - CSS based */}
                {isMerge && items.length >= 2 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Timeline
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '12px',
                            borderRadius: '8px'
                        }}>
                            {items.map((item, idx) => {
                                const firstDate = item.firstDate ? new Date(item.firstDate) : null;
                                const lastDate = item.lastDate ? new Date(item.lastDate) : null;

                                // Calculate position relative to combined timespan
                                const allFirstDates = items.map(i => i.firstDate ? new Date(i.firstDate) : new Date()).filter(Boolean);
                                const allLastDates = items.map(i => i.lastDate ? new Date(i.lastDate) : new Date()).filter(Boolean);
                                const minDate = new Date(Math.min(...allFirstDates));
                                const maxDate = new Date(Math.max(...allLastDates));
                                const totalSpan = maxDate - minDate || 1;

                                const startPercent = firstDate ? ((firstDate - minDate) / totalSpan * 100) : 0;
                                const endPercent = lastDate ? ((lastDate - minDate) / totalSpan * 100) : 100;
                                const widthPercent = endPercent - startPercent;

                                return (
                                    <div key={item.merchantKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '60px',
                                            fontSize: '0.7rem',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            ${(item.latestAmount || 0).toFixed(0)}
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            height: '20px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '4px',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: `${startPercent}%`,
                                                width: `${Math.max(widthPercent, 5)}%`,
                                                height: '100%',
                                                background: colors[idx % colors.length],
                                                borderRadius: '4px',
                                                opacity: 0.8
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Date labels */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.65rem',
                                color: 'var(--text-secondary)',
                                marginTop: '4px',
                                paddingLeft: '68px'
                            }}>
                                <span>{items[0]?.firstDate ? new Date(Math.min(...items.map(i => new Date(i.firstDate || 0)))).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}</span>
                                <span>{items[0]?.lastDate ? new Date(Math.max(...items.map(i => new Date(i.lastDate || 0)))).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Split Clusters (for splits) */}
                {!isMerge && suggestion.suggestedSplits && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Detected {suggestion.suggestedSplits.length} subscriptions:
                        </div>
                        <table style={{
                            width: '100%',
                            fontSize: '0.8rem',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                                <tr style={{
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Amount</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>Charges</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Interval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suggestion.suggestedSplits.map((split, idx) => (
                                    <tr key={idx} style={{
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <td style={{
                                            padding: '8px',
                                            color: colors[idx % colors.length],
                                            fontWeight: '600'
                                        }}>
                                            ~${(split.amount || 0).toFixed(2)}
                                        </td>
                                        <td style={{
                                            padding: '8px',
                                            textAlign: 'center'
                                        }}>
                                            {split.count} txns
                                        </td>
                                        <td style={{
                                            padding: '8px',
                                            textAlign: 'right',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {split.name?.includes('Monthly') ? 'Monthly' :
                                                split.name?.includes('Quarterly') ? 'Quarterly' :
                                                    'Varies'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Reason */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px'
                    }}>
                        📊 Why {isMerge ? 'merge' : 'split'}?
                    </div>
                    <ul style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                    }}>
                        {suggestion.reason?.details?.map((detail, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{detail}</li>
                        ))}
                    </ul>
                </div>

                {/* Merged Name Input (for merges) */}
                {isMerge && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '6px'
                        }}>
                            Merged name:
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            {/* Dropdown to select from candidates */}
                            <select
                                value={mergedName}
                                onChange={(e) => setMergedName(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Options from candidates */}
                                {items.map((item, idx) => {
                                    const name = globalRenames[item.merchantKey]?.displayName || item.merchant;
                                    return (
                                        <option key={item.merchantKey} value={name}>
                                            {name} (from {item.merchant})
                                        </option>
                                    );
                                })}
                                <option value="__custom__">Enter custom name...</option>
                            </select>

                            {/* Show text input if custom selected */}
                            {mergedName === '__custom__' && (
                                <input
                                    type="text"
                                    placeholder="Enter merged name"
                                    onChange={(e) => setMergedName(e.target.value || '__custom__')}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => onApprove({ ...suggestion, mergedName })}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                        }}
                    >
                        <Check size={14} />
                        {isMerge ? 'Merge Items' : `Split Into ${suggestion.suggestedSplits?.length || 2}`}
                    </button>
                    <button
                        onClick={onDismiss}
                        style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.85rem'
                        }}
                    >
                        <X size={14} />
                        Dismiss
                    </button>
                    {onModify && (
                        <button
                            onClick={onModify}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Edit3 size={14} />
                            Modify
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
