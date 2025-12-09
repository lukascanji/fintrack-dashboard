import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarHeader({
    currentMonth,
    currentYear,
    onPrevMonth,
    onNextMonth,
    onToday
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                    onClick={onPrevMonth}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, minWidth: '180px', textAlign: 'center' }}>
                    {MONTHS[currentMonth]} {currentYear}
                </h2>
                <button
                    onClick={onNextMonth}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
            <button
                onClick={onToday}
                className="btn"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', fontSize: '0.75rem' }}
            >
                Today
            </button>
        </div>
    );
}
