import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, Cpu, Sparkles } from 'lucide-react';
import styles from './LineageEvent.module.css';

/**
 * LineageEvent - Single event in the transformation history
 * 
 * Shows event type, description, timestamp, and source (user/system/smart_suggestion).
 * Expandable to show full event details.
 */
export default function LineageEvent({ event, isLast }) {
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Get source icon
    const SourceIcon = () => {
        switch (event.triggeredBy) {
            case 'user':
                return <User size={10} />;
            case 'smart_suggestion':
                return <Sparkles size={10} />;
            default:
                return <Cpu size={10} />;
        }
    };

    // Get color class based on event color
    const colorClass = styles[`color${event.color?.charAt(0).toUpperCase()}${event.color?.slice(1)}`] || styles.colorBlue;

    return (
        <div className={`${styles.event} ${isLast ? styles.isLast : ''}`}>
            {/* Timeline connector */}
            <div className={styles.timeline}>
                <div className={`${styles.dot} ${colorClass}`}>
                    <span className={styles.icon}>{event.icon}</span>
                </div>
                {!isLast && <div className={styles.line} />}
            </div>

            {/* Event content */}
            <div className={styles.content}>
                <button
                    className={styles.eventHeader}
                    onClick={() => setDetailsOpen(!detailsOpen)}
                >
                    <div className={styles.eventInfo}>
                        <span className={styles.description}>{event.description}</span>
                        <div className={styles.meta}>
                            <span className={styles.time}>{event.formattedTime}</span>
                            <span className={styles.source}>
                                <SourceIcon />
                                <span>{event.triggeredBy}</span>
                            </span>
                        </div>
                    </div>
                    {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {detailsOpen && (
                    <div className={styles.details}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Event ID:</span>
                            <code className={styles.detailValue}>{event.id}</code>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Type:</span>
                            <code className={styles.detailValue}>{event.type}</code>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Affected Keys:</span>
                            <code className={styles.detailValue}>
                                {event.affectedKeys?.join(', ') || 'None'}
                            </code>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Data:</span>
                            <pre className={styles.detailPre}>
                                {JSON.stringify(event.data, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
