import React from 'react';
import RecurringItem from './RecurringItem';

// Simple Error Boundary
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error("RecurringItem Render Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '0.8rem',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>Failed to load item.</span>
                    {this.props.onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                this.props.onDelete(this.props.merchantKey);
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                            }}
                        >
                            Delete Item
                        </button>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

export default function RecurringList({
    groupedSubscriptions,
    expandedKey,
    onExpand,
    onSplit,
    mergeSelected,
    onToggleMerge,
    onDelete
}) {
    return (
        <div style={{ flex: 1 }}>
            {Object.entries(groupedSubscriptions).map(([category, items]) => (
                <div key={category} className="card" style={{ marginBottom: '24px' }}>
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
                            <ErrorBoundary key={sub.merchantKey} onDelete={onDelete} merchantKey={sub.merchantKey}>
                                <RecurringItem
                                    sub={sub}
                                    expanded={expandedKey === sub.merchantKey}
                                    onExpand={() => onExpand(sub.merchantKey)}
                                    onSplit={onSplit}
                                    mergeSelected={mergeSelected.includes(sub.merchantKey)}
                                    onToggleMerge={onToggleMerge}
                                />
                            </ErrorBoundary>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
