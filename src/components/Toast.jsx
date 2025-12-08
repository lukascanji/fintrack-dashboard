import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                onClose?.();
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const icons = {
        success: <CheckCircle size={18} />,
        error: <AlertCircle size={18} />,
        info: <Info size={18} />
    };

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'var(--accent-success)', text: 'var(--accent-success)' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'var(--accent-danger)', text: 'var(--accent-danger)' },
        info: { bg: 'rgba(99, 102, 241, 0.15)', border: 'var(--accent-primary)', text: 'var(--accent-primary)' }
    };

    const color = colors[type] || colors.info;

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: '500',
                transform: isExiting ? 'translateX(120%)' : 'translateX(0)',
                opacity: isExiting ? 0 : 1,
                transition: 'all 0.3s ease'
            }}
        >
            <span style={{ color: color.text }}>{icons[type]}</span>
            <span>{message}</span>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        onClose?.();
                    }, 300);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '8px'
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}
