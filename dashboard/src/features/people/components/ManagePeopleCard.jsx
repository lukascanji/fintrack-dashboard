import React, { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';

export default function ManagePeopleCard({
    peopleList,
    onAddPerson,
    onRemovePerson
}) {
    const [newPersonInput, setNewPersonInput] = useState('');

    const handleAdd = () => {
        const name = newPersonInput.trim();
        if (name && !peopleList.includes(name)) {
            onAddPerson(name);
            setNewPersonInput('');
        }
    };

    return (
        <div className="card">
            <div className="card-title">Manage People</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                    type="text"
                    value={newPersonInput}
                    onChange={(e) => setNewPersonInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Add person name..."
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                    }}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newPersonInput.trim()}
                    style={{
                        padding: '8px 16px',
                        background: newPersonInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: newPersonInput.trim() ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <Plus size={16} /> Add
                </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {peopleList.map((person) => (
                    <div
                        key={person}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: '20px',
                            fontSize: '0.8rem'
                        }}
                    >
                        <Users size={12} />
                        {person}
                        {person !== 'You' && (
                            <button
                                onClick={() => onRemovePerson(person)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex'
                                }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
