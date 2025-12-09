import React, { useState } from 'react';
import { Users, Check, X } from 'lucide-react';

export default function NameSelectorDropdown({
    currentName,
    availableNames,
    onAssign,
    onRemove,
    onClose
}) {
    const [newNameInput, setNewNameInput] = useState('');

    const handleAssignNew = () => {
        if (newNameInput.trim()) {
            onAssign(newNameInput.trim());
            setNewNameInput('');
        }
    };

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'absolute',
                top: '100%',
                right: '100px',
                zIndex: 100,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                minWidth: '200px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
        >
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Assign to Person
            </div>

            {availableNames.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    {availableNames.map((name, j) => (
                        <div
                            key={j}
                            onClick={() => onAssign(name)}
                            style={{
                                padding: '6px 10px',
                                background: currentName === name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                marginBottom: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Users size={12} color="var(--accent-primary)" />
                            {name}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    placeholder="New name..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAssignNew();
                        if (e.key === 'Escape') onClose();
                    }}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                />
                <button
                    onClick={handleAssignNew}
                    disabled={!newNameInput.trim()}
                    style={{
                        padding: '6px 10px',
                        background: newNameInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: newNameInput.trim() ? 'pointer' : 'default',
                        color: 'white'
                    }}
                >
                    <Check size={14} />
                </button>
            </div>

            {currentName && (
                <button
                    onClick={() => {
                        onRemove();
                        onClose();
                    }}
                    style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-danger)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <X size={10} /> Remove
                </button>
            )}
        </div>
    );
}
