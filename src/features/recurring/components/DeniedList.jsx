import React from 'react';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function DeniedList({
    deniedItems,
    onRevert
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!deniedItems || deniedItems.length === 0) return null;

    const displayItems = isExpanded ? deniedItems : deniedItems.slice(0, 3);

    return (
        <div className="card" style={{
            borderColor: 'rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.03)'
        }}>
            <div
                className="card-title"
                style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span style={{ color: 'var(--accent-danger)' }}>
                    Denied ({deniedItems.length})
                </span>
                {deniedItems.length > 3 && (
                    isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayItems.map(sub => (
                    <div
                        key={sub.merchantKey}
                        style={{
                            padding: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{sub.merchant}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {sub.frequency} • ${sub.latestAmount?.toFixed(2) || '?'}
                            </div>
                        </div>
                        <button
                            onClick={() => onRevert(sub.merchantKey)}
                            title="Move back to Pending"
                            style={{
                                padding: '6px 10px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem'
                            }}
                        >
                            <RotateCcw size={12} /> Revert
                        </button>
                    </div>
                ))}
                {!isExpanded && deniedItems.length > 3 && (
                    <div
                        style={{
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            padding: '4px',
                            cursor: 'pointer'
                        }}
                        onClick={() => setIsExpanded(true)}
                    >
                        + {deniedItems.length - 3} more denied items
                    </div>
                )}
            </div>
        </div>
    );
}
