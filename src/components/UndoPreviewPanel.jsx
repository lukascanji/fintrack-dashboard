import React, { useState, useEffect } from 'react';
import { Undo2, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getUndoPreview, getInverseDescription, markEventsAsUndone } from '../utils/transformationLog';
import styles from './UndoPreviewPanel.module.css';

/**
 * UndoPreviewPanel - Shows preview of undo action with cascade
 * 
 * Displays what will be undone and any dependent events that will also be undone.
 */
export default function UndoPreviewPanel({ onConfirm, onCancel, isOpen }) {
    const [preview, setPreview] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Refresh preview when panel opens
    useEffect(() => {
        if (isOpen) {
            setPreview(getUndoPreview());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (!preview) {
        return (
            <div className={styles.overlay} onClick={onCancel}>
                <div className={styles.panel} onClick={e => e.stopPropagation()}>
                    <div className={styles.header}>
                        <Undo2 size={20} />
                        <h3>Undo Last Action</h3>
                    </div>
                    <div className={styles.empty}>
                        <p>No actions to undo</p>
                        <p className={styles.hint}>Perform some actions first, then you can undo them.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.cancelButton} onClick={onCancel}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { primaryEvent, cascadingEvents, totalUndoCount } = preview;
    const hasCascade = cascadingEvents.length > 0;

    const handleConfirm = () => {
        // Collect all event IDs to undo
        const eventIds = [
            ...cascadingEvents.map(e => e.id),
            primaryEvent.id
        ];

        // Mark them as undone in the log
        markEventsAsUndone(eventIds);

        // Call parent callback with the events that need inverse operations
        onConfirm({
            primaryEvent,
            cascadingEvents,
            eventIds
        });
    };

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <Undo2 size={20} />
                    <h3>Undo Last Action</h3>
                    <button className={styles.closeButton} onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>

                {/* Warning if cascade */}
                {hasCascade && (
                    <div className={styles.warning}>
                        <AlertTriangle size={16} />
                        <span>
                            This will also undo {cascadingEvents.length} dependent action{cascadingEvents.length > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Primary event */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Primary action to undo:</div>
                    <div className={styles.eventCard}>
                        <span className={styles.icon}>{primaryEvent.icon}</span>
                        <div className={styles.eventInfo}>
                            <div className={styles.description}>{primaryEvent.description}</div>
                            <div className={styles.inverse}>{getInverseDescription(primaryEvent)}</div>
                            <div className={styles.time}>{primaryEvent.formattedTime}</div>
                        </div>
                    </div>
                </div>

                {/* Cascading events */}
                {hasCascade && (
                    <div className={styles.section}>
                        <button
                            className={styles.sectionToggle}
                            onClick={() => setShowDetails(!showDetails)}
                        >
                            <span>Dependent actions ({cascadingEvents.length})</span>
                            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showDetails && (
                            <div className={styles.cascadeList}>
                                {cascadingEvents.map(event => (
                                    <div key={event.id} className={styles.cascadeEvent}>
                                        <span className={styles.icon}>{event.icon}</span>
                                        <div className={styles.eventInfo}>
                                            <div className={styles.description}>{event.description}</div>
                                            <div className={styles.inverse}>{getInverseDescription(event)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Summary */}
                <div className={styles.summary}>
                    Total: {totalUndoCount} action{totalUndoCount > 1 ? 's' : ''} will be undone
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.confirmButton} onClick={handleConfirm}>
                        <Undo2 size={14} />
                        Confirm Undo
                    </button>
                </div>
            </div>
        </div>
    );
}
