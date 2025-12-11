import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A dropdown component that renders via Portal to escape stacking contexts
 */
export default function DropdownPortal({
    isOpen,
    triggerRef,
    onClose,
    children,
    align = 'left' // 'left' or 'right'
}) {
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && triggerRef?.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            const scrollX = window.scrollX || document.documentElement.scrollLeft;

            setPosition({
                top: rect.bottom + scrollY + 4,
                left: align === 'right'
                    ? rect.right + scrollX - 180 // Adjust for dropdown width
                    : rect.left + scrollX
            });
        }
    }, [isOpen, triggerRef, align]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (triggerRef?.current?.contains(e.target)) return;
            onClose();
        };

        const handleScroll = () => {
            if (triggerRef?.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const scrollY = window.scrollY || document.documentElement.scrollTop;
                const scrollX = window.scrollX || document.documentElement.scrollLeft;

                setPosition({
                    top: rect.bottom + scrollY + 4,
                    left: align === 'right'
                        ? rect.right + scrollX - 180
                        : rect.left + scrollX
                });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, triggerRef, onClose, align]);

    if (!isOpen) return null;

    return createPortal(
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                zIndex: 99999,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                minWidth: '150px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)'
            }}
        >
            {children}
        </div>,
        document.body
    );
}
