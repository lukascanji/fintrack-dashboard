import React from 'react';
import RecurringItem from './RecurringItem';

export default function RecurringList({
    groupedSubscriptions,
    expandedKey,
    onExpand,
    onSplit,
    mergeSelected,
    onToggleMerge
}) {
    return (
        <div style={{ flex: 1 }}>
            {Object.entries(groupedSubscriptions).map(([category, items]) => (
                <div key={category} className="card" style={{ marginBottom: '24px', position: 'relative', zIndex: 'auto', overflow: 'visible' }}>
                    <div className="card-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {category}
                            <div style={{
                                padding: '2px 8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 'normal'
                            }}>
                                {items.length}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            ${items.reduce((sum, item) => sum + item.latestAmount, 0).toFixed(0)}/mo
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map(sub => (
                            <RecurringItem
                                key={sub.merchantKey}
                                sub={sub}
                                expanded={expandedKey === sub.merchantKey}
                                onExpand={() => onExpand(sub.merchantKey)}
                                onSplit={onSplit}
                                mergeSelected={mergeSelected.includes(sub.merchantKey)}
                                onToggleMerge={onToggleMerge}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
