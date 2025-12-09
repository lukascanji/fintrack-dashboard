import React from 'react';
import { X } from 'lucide-react';

export default function ModalOverlay({ children, onClose }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {children}
            </div>
        </div>
    );
}

export function ModalHeader({ title, onClose }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                {title}
            </h3>
            <button
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                }}
            >
                <X size={20} />
            </button>
        </div>
    );
}

export function ModalFooter({
    leftContent,
    onCancel,
    onConfirm,
    confirmDisabled = false,
    confirmLabel = 'Apply Changes',
    cancelLabel = 'Cancel'
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {leftContent}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '10px 20px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                    }}
                >
                    {cancelLabel}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={confirmDisabled}
                    style={{
                        padding: '10px 20px',
                        background: !confirmDisabled ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: !confirmDisabled ? 'white' : 'var(--text-secondary)',
                        cursor: !confirmDisabled ? 'pointer' : 'not-allowed',
                        fontWeight: 500
                    }}
                >
                    {confirmLabel}
                </button>
            </div>
        </div>
    );
}
