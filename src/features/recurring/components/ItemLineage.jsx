import React from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { getEventsByKey, formatEventForDisplay } from '../../../utils/transformationLog';
import LineageEvent from './LineageEvent';
import styles from './ItemLineage.module.css';

/**
 * ItemLineage - Shows transformation history for a recurring item
 * 
 * Displays a chronological list of all changes made to this item:
 * renames, merges, splits, reassignments, categorizations, etc.
 */
export default function ItemLineage({ merchantKey, expanded = false, onToggle }) {
    const events = getEventsByKey(merchantKey);
    const formattedEvents = events.map(formatEventForDisplay);

    if (formattedEvents.length === 0) {
        return (
            <div className={styles.noHistory}>
                <History size={14} />
                <span>No transformation history</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button
                className={styles.header}
                onClick={onToggle}
            >
                <div className={styles.headerLeft}>
                    <History size={16} />
                    <span>Transformation History</span>
                    <span className={styles.count}>({formattedEvents.length})</span>
                </div>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded && (
                <div className={styles.eventList}>
                    {formattedEvents.map((event, index) => (
                        <LineageEvent
                            key={event.id}
                            event={event}
                            isLast={index === formattedEvents.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
