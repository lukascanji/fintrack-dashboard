import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from './TimelineSlider.module.css';

/**
 * TimelineSlider - Draggable slider to navigate through transformation history
 * 
 * Shows event dots along the timeline and allows scrubbing through time.
 */
export default function TimelineSlider({
    position,
    onChange,
    startDate,
    endDate,
    events
}) {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate position for each event dot
    const eventDots = events.map(event => {
        const eventDate = new Date(event.timestamp);
        const range = endDate.getTime() - startDate.getTime();
        if (range === 0) return { ...event, position: 100 };
        const pos = ((eventDate.getTime() - startDate.getTime()) / range) * 100;
        return { ...event, position: Math.max(0, Math.min(100, pos)) };
    });

    // Handle mouse/touch movement
    const updatePosition = useCallback((clientX) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onChange(newPos);
    }, [onChange]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        updatePosition(e.clientX);
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        updatePosition(e.clientX);
    }, [isDragging, updatePosition]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove global listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Format date for display
    const formatDate = (date) => {
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={styles.container}>
            {/* Date labels */}
            <div className={styles.dateLabels}>
                <span>{formatDate(startDate)}</span>
                <span>NOW</span>
            </div>

            {/* Slider track */}
            <div
                ref={trackRef}
                className={styles.track}
                onMouseDown={handleMouseDown}
            >
                {/* Event dots */}
                {eventDots.map((event, idx) => (
                    <div
                        key={event.id || idx}
                        className={`${styles.dot} ${styles[`dot${event.color?.charAt(0).toUpperCase()}${event.color?.slice(1)}`] || ''}`}
                        style={{ left: `${event.position}%` }}
                        title={`${event.description}\n${event.formattedTime}`}
                    />
                ))}

                {/* Filled portion */}
                <div
                    className={styles.filled}
                    style={{ width: `${position}%` }}
                />

                {/* Thumb */}
                <div
                    className={`${styles.thumb} ${isDragging ? styles.thumbActive : ''}`}
                    style={{ left: `${position}%` }}
                />
            </div>

            {/* Quick navigation buttons */}
            <div className={styles.quickNav}>
                <button
                    className={styles.navButton}
                    onClick={() => onChange(0)}
                    disabled={position === 0}
                >
                    Start
                </button>
                <button
                    className={styles.navButton}
                    onClick={() => onChange(Math.max(0, position - 10))}
                    disabled={position === 0}
                >
                    ← Back
                </button>
                <button
                    className={styles.navButton}
                    onClick={() => onChange(Math.min(100, position + 10))}
                    disabled={position === 100}
                >
                    Forward →
                </button>
                <button
                    className={styles.navButton}
                    onClick={() => onChange(100)}
                    disabled={position === 100}
                >
                    Now
                </button>
            </div>
        </div>
    );
}
