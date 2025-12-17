import React, { useState, useMemo } from 'react';
import { Clock, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getEventLog, formatEventForDisplay, EventTypes } from '../utils/transformationLog';
import TimelineSlider from './TimelineSlider';
import TimelineEventList from './TimelineEventList';
import styles from './TransformationTimeline.module.css';

/**
 * TransformationTimeline - Full timeline view of all transformation events
 * 
 * Features:
 * - Interactive slider to navigate through time
 * - Filterable event list
 * - Event type and date range filters
 */
export default function TransformationTimeline({ onClose }) {
    const [selectedEventTypes, setSelectedEventTypes] = useState([]);
    const [sliderPosition, setSliderPosition] = useState(100); // 0-100, 100 = now

    // Get all events
    const allEvents = useMemo(() => {
        const log = getEventLog();
        return log.events.map(formatEventForDisplay).reverse(); // Newest first
    }, []);

    // Get date range
    const dateRange = useMemo(() => {
        if (allEvents.length === 0) {
            return { start: new Date(), end: new Date() };
        }
        const dates = allEvents.map(e => new Date(e.timestamp));
        return {
            start: new Date(Math.min(...dates)),
            end: new Date(Math.max(...dates))
        };
    }, [allEvents]);

    // Calculate the "view date" based on slider position
    const viewDate = useMemo(() => {
        const range = dateRange.end.getTime() - dateRange.start.getTime();
        const offset = (sliderPosition / 100) * range;
        return new Date(dateRange.start.getTime() + offset);
    }, [sliderPosition, dateRange]);

    // Filter events based on selected types and slider position
    const filteredEvents = useMemo(() => {
        let events = allEvents;

        // Filter by event type
        if (selectedEventTypes.length > 0) {
            events = events.filter(e => selectedEventTypes.includes(e.type));
        }

        // Filter by date (show events up to slider position)
        events = events.filter(e => new Date(e.timestamp) <= viewDate);

        return events;
    }, [allEvents, selectedEventTypes, viewDate]);

    // Get unique event types for filter
    const eventTypeOptions = useMemo(() => {
        const types = new Set(allEvents.map(e => e.type));
        return [...types];
    }, [allEvents]);

    // Toggle event type filter
    const toggleEventType = (type) => {
        setSelectedEventTypes(prev => {
            if (prev.includes(type)) {
                return prev.filter(t => t !== type);
            }
            return [...prev, type];
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setSelectedEventTypes([]);
        setSliderPosition(100);
    };

    if (allEvents.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Clock size={20} />
                        <h2>Transformation Timeline</h2>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className={styles.closeButton}>
                            <X size={20} />
                        </button>
                    )}
                </div>
                <div className={styles.emptyState}>
                    <Clock size={48} />
                    <h3>No transformations yet</h3>
                    <p>Perform actions like renaming, merging, or approving items to see them here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Clock size={20} />
                    <h2>Transformation Timeline</h2>
                    <span className={styles.eventCount}>
                        {filteredEvents.length} of {allEvents.length} events
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Timeline Slider */}
            <div className={styles.sliderSection}>
                <TimelineSlider
                    position={sliderPosition}
                    onChange={setSliderPosition}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    events={allEvents}
                />
                <div className={styles.viewDateLabel}>
                    Viewing: {viewDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filterSection}>
                <div className={styles.filterLabel}>
                    <Filter size={14} />
                    <span>Filter by type:</span>
                </div>
                <div className={styles.filterChips}>
                    {eventTypeOptions.map(type => (
                        <button
                            key={type}
                            className={`${styles.chip} ${selectedEventTypes.includes(type) ? styles.chipActive : ''}`}
                            onClick={() => toggleEventType(type)}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                    {(selectedEventTypes.length > 0 || sliderPosition < 100) && (
                        <button
                            className={styles.clearButton}
                            onClick={clearFilters}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Event List */}
            <TimelineEventList events={filteredEvents} />
        </div>
    );
}
