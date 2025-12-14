import { useEffect, useRef, useState, useCallback } from 'react';
import Portal from './Portal';
import styles from './Dropdown.module.css';

/**
 * Dropdown menu that renders via Portal to escape stacking contexts.
 * Positions itself relative to the trigger element using fixed positioning.
 * Automatically flips upward when near the bottom of the viewport.
 */
export default function Dropdown({
    isOpen,
    onClose,
    triggerRef,
    children,
    minWidth = 150,
    align = 'left' // 'left' or 'right'
}) {
    const dropdownRef = useRef(null);
    const [position, setPosition] = useState({ top: -9999, left: -9999 });

    // Position calculation function
    const calculatePosition = useCallback(() => {
        if (!triggerRef?.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const dropdownEl = dropdownRef.current;
        const dropdownHeight = dropdownEl ? dropdownEl.offsetHeight : 200; // Estimate if not mounted
        const dropdownWidth = Math.max(minWidth, dropdownEl ? dropdownEl.offsetWidth : minWidth);

        // Calculate horizontal position
        let left = triggerRect.left;
        if (align === 'right') {
            left = triggerRect.right - dropdownWidth;
        }

        // Ensure dropdown doesn't go off-screen horizontally
        const maxLeft = window.innerWidth - dropdownWidth - 16;
        left = Math.min(left, maxLeft);
        left = Math.max(16, left);

        // Check if there's enough space below
        const spaceBelow = window.innerHeight - triggerRect.bottom - 8;
        const spaceAbove = triggerRect.top - 8;

        let top;

        if (spaceBelow >= dropdownHeight) {
            // Enough space below - position normally
            top = triggerRect.bottom + 4;
        } else if (spaceAbove >= dropdownHeight) {
            // Not enough below but enough above - flip upward
            top = triggerRect.top - dropdownHeight - 4;
        } else {
            // Not enough space either way - position where there's more space
            if (spaceBelow >= spaceAbove) {
                top = triggerRect.bottom + 4;
            } else {
                top = triggerRect.top - dropdownHeight - 4;
            }
        }

        // Ensure dropdown doesn't go off-screen vertically
        top = Math.max(8, top);
        top = Math.min(window.innerHeight - dropdownHeight - 8, top);

        setPosition({ top, left });
    }, [triggerRef, minWidth, align]);

    // Calculate position when opening
    useEffect(() => {
        if (!isOpen) {
            setPosition({ top: -9999, left: -9999 });
            return;
        }

        // Initial position calculation
        calculatePosition();

        // Recalculate after a brief delay to account for content rendering
        const timeoutId = setTimeout(calculatePosition, 10);

        return () => clearTimeout(timeoutId);
    }, [isOpen, calculatePosition, children]);

    // Handle click outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                triggerRef?.current && !triggerRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <Portal>
            <div
                ref={dropdownRef}
                className={styles.dropdown}
                style={{
                    position: 'fixed',
                    top: position.top,
                    left: position.left,
                    minWidth: minWidth,
                    zIndex: 10000,
                    maxHeight: 'calc(100vh - 32px)',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </Portal>
    );
}
