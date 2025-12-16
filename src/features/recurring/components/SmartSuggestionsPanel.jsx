/**
 * Smart Suggestions Panel
 * Displays consolidation suggestions at the top of the Recurring tab
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import SuggestionCard from './SuggestionCard';

export default function SmartSuggestionsPanel({
    suggestions,
    onApprove,
    onDismiss,
    onModify,
    globalRenames = {}
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);

    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    // Sort: ALL Splits first, then ALL Merges (each group by confidence)
    // This supports the workflow: split messy items first, then merge clean ones
    const sortedSuggestions = [...suggestions].sort((a, b) => {
        // Primary sort: splits before merges
        if (a.type === 'split' && b.type !== 'split') return -1;
        if (a.type !== 'split' && b.type === 'split') return 1;

        // Secondary sort: confidence descending (within type)
        return b.confidence - a.confidence;
    });

    const visibleSuggestions = sortedSuggestions.slice(0, visibleCount);
    const hasMore = sortedSuggestions.length > visibleCount;

    const splitCount = suggestions.filter(s => s.type === 'split').length;
    const mergeCount = suggestions.filter(s => s.type === 'merge').length;

    return (
        <div style={{
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))',
            borderRadius: '12px',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(147, 51, 234, 0.15)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Lightbulb size={20} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        Smart Suggestions
                    </span>
                    <span style={{
                        background: 'var(--accent-primary)',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                    }}>
                        {suggestions.length}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                    }}>
                        {splitCount} splits • {mergeCount} merges
                    </span>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div style={{ padding: '16px 20px' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        {visibleSuggestions.map(suggestion => (
                            <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                onApprove={() => onApprove(suggestion)}
                                onDismiss={() => onDismiss(suggestion)}
                                onModify={() => onModify?.(suggestion)}
                                globalRenames={globalRenames}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '16px'
                        }}>
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                style={{
                                    padding: '8px 20px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Show {Math.min(10, suggestions.length - visibleCount)} more suggestions
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
