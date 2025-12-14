import React from 'react';
import { Check, X } from 'lucide-react';

export default function ClusterPatternRow({
    cluster,
    clusterIndex,
    isFullyAssigned,
    clusterAssignedSub,
    subscription,
    otherSubscriptions,
    getEffectiveName,
    clusterNewInput,
    clusterNewName,
    onClusterNewInputChange,
    onClusterNewNameChange,
    onCreateNew,
    onAssignCluster,
    onClearCluster
}) {
    const colorIndex = clusterIndex === 0 ? '99, 102, 241' : '249, 115, 22';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            background: isFullyAssigned
                ? 'rgba(34, 197, 94, 0.15)'
                : `rgba(${colorIndex}, 0.15)`,
            borderRadius: '8px',
            border: isFullyAssigned
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : `1px solid rgba(${colorIndex}, 0.3)`
        }}>
            <div style={{
                flex: 1,
                fontSize: '0.85rem',
                fontWeight: 500,
                color: isFullyAssigned ? 'var(--accent-success)' : 'var(--text-primary)'
            }}>
                Pattern {clusterIndex + 1}: {cluster.label}
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

            {clusterNewInput === clusterIndex ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={clusterNewName}
                        onChange={(e) => onClusterNewNameChange(e.target.value)}
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
                                onCreateNew(clusterIndex, clusterNewName);
                            }
                            if (e.key === 'Escape') {
                                onClusterNewInputChange(null);
                            }
                        }}
                    />
                    <button
                        onClick={() => onCreateNew(clusterIndex, clusterNewName)}
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
                        onClick={() => onClusterNewInputChange(null)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        padding: '6px 12px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px',
                        color: 'var(--accent-success)',
                        fontSize: '0.8rem',
                        fontWeight: 500
                    }}>
                        → {getEffectiveName ? getEffectiveName(clusterAssignedSub) : (clusterAssignedSub.displayName || clusterAssignedSub.merchant)}
                    </span>
                    <button
                        onClick={() => onClearCluster(clusterIndex)}
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
                            onClusterNewInputChange(clusterIndex);
                        } else if (val) {
                            onAssignCluster(clusterIndex, val);
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
                        Keep with {getEffectiveName ? getEffectiveName(subscription) : (subscription.displayName || subscription.merchant)}
                    </option>
                    {otherSubscriptions.length > 0 && (
                        <optgroup label="Move to existing">
                            {otherSubscriptions.map(s => (
                                <option key={s.merchantKey} value={s.merchantKey}>
                                    {getEffectiveName ? getEffectiveName(s) : (s.displayName || s.merchant)}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    <option value="__NEW__">+ Create New Subscription</option>
                </select>
            )}
        </div>
    );
}
