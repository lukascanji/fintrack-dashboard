import React from 'react';

/**
 * Reusable loading skeleton component with shimmer animation
 * @param {string} variant - 'card', 'table', or 'chart'
 * @param {number} count - Number of skeleton items to show
 */
export default function LoadingSkeleton({ variant = 'card', count = 3 }) {
    const shimmerStyle = {
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        borderRadius: '8px'
    };

    if (variant === 'card') {
        return (
            <div className="card" style={{ opacity: 0.7 }}>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <div style={{ ...shimmerStyle, height: '24px', width: '140px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} style={{ flex: 1 }}>
                            <div style={{ ...shimmerStyle, height: '48px', marginBottom: '8px' }} />
                            <div style={{ ...shimmerStyle, height: '16px', width: '60%' }} />
                        </div>
                    ))}
                </div>
                <div style={{ ...shimmerStyle, height: '200px', marginTop: '24px' }} />
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className="card" style={{ opacity: 0.7 }}>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <div style={{ ...shimmerStyle, height: '24px', width: '160px', marginBottom: '20px' }} />
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ ...shimmerStyle, height: '36px', flex: i === 0 ? 2 : 1 }} />
                    ))}
                </div>
                {[...Array(count)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                        <div style={{ ...shimmerStyle, height: '16px', width: '80px' }} />
                        <div style={{ ...shimmerStyle, height: '16px', flex: 2 }} />
                        <div style={{ ...shimmerStyle, height: '16px', flex: 1 }} />
                        <div style={{ ...shimmerStyle, height: '24px', width: '60px', borderRadius: '12px' }} />
                        <div style={{ ...shimmerStyle, height: '16px', width: '60px', marginLeft: 'auto' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'chart') {
        return (
            <div className="card" style={{ opacity: 0.7 }}>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <div style={{ ...shimmerStyle, height: '24px', width: '120px', marginBottom: '20px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '16px 0' }}>
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                ...shimmerStyle,
                                flex: 1,
                                height: `${30 + Math.random() * 70}%`
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Default fallback
    return (
        <div style={{ ...shimmerStyle, height: '100px', margin: '16px 0' }}>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
