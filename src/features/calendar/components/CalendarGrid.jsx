import React from 'react';
import CalendarDayCell from './CalendarDayCell';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({
    calendarDays,
    onSelectDate,
    getDisplayMerchantInfo
}) {
    return (
        <>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {DAYS.map(day => (
                    <div key={day} style={{
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        padding: '8px'
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((cell, i) => (
                    <CalendarDayCell
                        key={i}
                        cell={cell}
                        onSelect={onSelectDate}
                        getDisplayMerchantInfo={getDisplayMerchantInfo}
                    />
                ))}
            </div>
        </>
    );
}
