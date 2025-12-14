import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal component that renders children at the document body level.
 * Useful for dropdowns, modals, tooltips that need to escape stacking contexts.
 */
export default function Portal({ children }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return mounted ? createPortal(children, document.body) : null;
}
