import React from 'react';
import { RefreshCw } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categorize';

export default function CalendarLegend() {
    return (
        <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('DINING') }} />
                Dining
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('SHOPPING') }} />
                Shopping
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor('SUBSCRIPTIONS') }} />
                Subscriptions
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <RefreshCw size={10} color="var(--accent-primary)" />
                Projected Renewal
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-success)' }} />
                Income
            </div>
        </div>
    );
}
