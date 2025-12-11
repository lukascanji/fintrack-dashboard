import { useEffect } from 'react';

/**
 * Hook that handles clicking outside of the passed ref
 * @param {React.RefObject} ref - The ref of the element to detect outside clicks for
 * @param {Function} handler - The callback to run when clicking outside
 * @param {boolean} active - Whether the listener is active (default: true)
 */
export function useClickOutside(ref, handler, active = true) {
    useEffect(() => {
        if (!active) return;

        const listener = (event) => {
            // Do nothing if clicking ref's element or its descendants
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler, active]);
}
