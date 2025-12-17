import React from 'react';
import { User, Cpu, Sparkles, ChevronRight } from 'lucide-react';
import styles from './TimelineEventList.module.css';

/**
 * TimelineEventList - List of transformation events for the timeline view
 */
export default function TimelineEventList({ events }) {
    if (events.length === 0) {
        return (
            <div className={styles.empty}>
                No events match your filters
            </div>
        );
    }

    // Group events by date
    const groupedEvents = events.reduce((groups, event) => {
        const date = new Date(event.timestamp).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(event);
        return groups;
    }, {});

    // Get source icon
    const SourceIcon = ({ triggeredBy }) => {
        switch (triggeredBy) {
            case 'user':
                return <User size={10} />;
            case 'smart_suggestion':
                return <Sparkles size={10} />;
            default:
                return <Cpu size={10} />;
        }
    };

    return (
        <div className={styles.container}>
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                <div key={date} className={styles.dateGroup}>
                    <div className={styles.dateHeader}>{date}</div>
                    <div className={styles.eventList}>
                        {dateEvents.map(event => (
                            <div key={event.id} className={styles.event}>
                                <div className={`${styles.icon} ${styles[`icon${event.color?.charAt(0).toUpperCase()}${event.color?.slice(1)}`] || ''}`}>
                                    <span>{event.icon}</span>
                                </div>
                                <div className={styles.content}>
                                    <div className={styles.description}>
                                        {event.description}
                                    </div>
                                    <div className={styles.meta}>
                                        <span className={styles.time}>
                                            {new Date(event.timestamp).toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className={styles.source}>
                                            <SourceIcon triggeredBy={event.triggeredBy} />
                                            <span>{event.triggeredBy}</span>
                                        </span>
                                        <span className={styles.type}>{event.type}</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className={styles.chevron} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
