import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

export default function BundleComponentEditor({
    selectedBundleAmount,
    bundleComponents,
    bundleTotal,
    onUpdateComponent,
    onAddComponent,
    onRemoveComponent,
    onSave,
    onBack
}) {
    const remainingAmount = selectedBundleAmount - bundleTotal;
    const validComponentCount = bundleComponents.filter(c => c.name && c.amount).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontWeight: '500' }}>
                    Splitting: ${selectedBundleAmount.toFixed(2)}
                </span>
                <button
                    onClick={onBack}
                    style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}
                >
                    ← Back
                </button>
            </div>

            {bundleComponents.map((comp, idx) => (
                <div
                    key={idx}
                    style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                    }}
                >
                    <input
                        type="text"
                        placeholder="Service name..."
                        value={comp.name}
                        onChange={(e) => onUpdateComponent(idx, 'name', e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>$</span>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={comp.amount}
                        onChange={(e) => onUpdateComponent(idx, 'amount', e.target.value)}
                        style={{
                            width: '80px',
                            padding: '8px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            textAlign: 'right'
                        }}
                    />
                    <button
                        onClick={() => onRemoveComponent(idx)}
                        style={{
                            padding: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={14} color="var(--accent-danger)" />
                    </button>
                </div>
            ))}

            <button
                onClick={onAddComponent}
                style={{
                    padding: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}
            >
                <Plus size={14} /> Add Component
            </button>

            <div style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                    Remaining (tax/fees):
                </span>
                <span style={{
                    fontWeight: '500',
                    color: remainingAmount < 0
                        ? 'var(--accent-danger)'
                        : 'var(--text-primary)'
                }}>
                    ${remainingAmount.toFixed(2)}
                </span>
            </div>

            <button
                onClick={onSave}
                disabled={validComponentCount === 0}
                style={{
                    padding: '10px',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    opacity: validComponentCount === 0 ? 0.5 : 1
                }}
            >
                <Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Save Bundle Split
            </button>
        </div>
    );
}
