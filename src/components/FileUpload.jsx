import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Copy, X, Eye, Check, AlertTriangle } from 'lucide-react';
import { parseMultipleCSVs, previewCSV } from '../utils/parseCSV';

import { useTransactions } from '../context/TransactionContext';

export default function FileUpload({ showToast }) {
    const { transactions: existingTransactions, addTransactions } = useTransactions();

    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [lastUploadStats, setLastUploadStats] = useState(null);
    const [errors, setErrors] = useState([]);

    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [overrideIds, setOverrideIds] = useState(new Set()); // IDs to import anyway

    const handleFiles = useCallback(async (files) => {
        const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv'));
        if (csvFiles.length === 0) return;

        setLoading(true);
        setErrors([]);
        setLastUploadStats(null);

        try {
            // Build set of existing IDs for duplicate detection
            const existingIds = new Set(existingTransactions.map(t => t.id));

            const result = await parseMultipleCSVs(csvFiles, existingIds, existingTransactions);

            // If there are duplicates, show preview modal
            if (result.duplicateDetails.length > 0) {
                setPreviewData(result);
                setPendingFiles(csvFiles);
                setShowPreview(true);
                setOverrideIds(new Set());
                setLoading(false);
                return;
            }

            // No duplicates, proceed directly
            finishImport(result, csvFiles);
        } catch (error) {
            console.error('Error parsing CSV:', error);
            setErrors([error.message]);
            setLoading(false);
        }
    }, [existingTransactions]);

    const finishImport = (result, files) => {
        setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
        setLastUploadStats(result.stats);

        if (result.stats.errors.length > 0) {
            setErrors(result.stats.errors);
        }

        if (result.transactions.length > 0) {
            addTransactions(result.transactions);
            // Show toast notification on successful import
            if (showToast) {
                showToast(`Imported ${result.stats.totalNew} new transaction${result.stats.totalNew !== 1 ? 's' : ''}`, 'success');
            }
        }
        setLoading(false);
    };

    const confirmImport = () => {
        if (!previewData) return;

        // Add overridden duplicates to the transaction list
        let finalTransactions = [...previewData.transactions];
        const overriddenDups = previewData.duplicateDetails
            .filter(d => overrideIds.has(d.incoming.id))
            .map(d => d.incoming);

        finalTransactions = [...finalTransactions, ...overriddenDups];
        finalTransactions.sort((a, b) => a.date - b.date);

        // Update stats
        const updatedStats = {
            ...previewData.stats,
            totalNew: previewData.stats.totalNew + overriddenDups.length,
            totalDuplicates: previewData.stats.totalDuplicates - overriddenDups.length
        };

        finishImport({ transactions: finalTransactions, stats: updatedStats }, pendingFiles);
        setShowPreview(false);
        setPreviewData(null);
        setPendingFiles([]);
    };

    const cancelImport = () => {
        setShowPreview(false);
        setPreviewData(null);
        setPendingFiles([]);
        setOverrideIds(new Set());
    };

    const toggleOverride = (id) => {
        setOverrideIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback((e) => {
        handleFiles(e.target.files);
    }, [handleFiles]);

    return (
        <div className="card">
            <div className="card-title">Upload Transactions</div>

            <div
                className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input').click()}
            >
                {loading ? (
                    <>
                        <div className="upload-zone-icon" style={{ animation: 'pulse 1s infinite' }}>
                            <FileSpreadsheet size={64} />
                        </div>
                        <div className="upload-zone-text">Processing...</div>
                    </>
                ) : (
                    <>
                        <Upload className="upload-zone-icon" size={64} />
                        <div className="upload-zone-text">
                            Drag & drop CSV files here
                        </div>
                        <div className="upload-zone-hint">
                            or click to browse • Supports chequing & credit card exports
                        </div>
                    </>
                )}

                <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleInputChange}
                />
            </div>

            {/* Deduplication Preview Modal */}
            {showPreview && previewData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={20} color="var(--accent-primary)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Import Preview</h3>
                            </div>
                            <button onClick={cancelImport} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                                    {previewData.stats.totalNew + overrideIds.size}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>New transactions</div>
                            </div>
                            <div style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-danger)' }}>
                                    {previewData.duplicateDetails.length - overrideIds.size}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplicates to skip</div>
                            </div>
                        </div>

                        {/* Duplicates list */}
                        {previewData.duplicateDetails.length > 0 && (
                            <div style={{ flex: 1, overflow: 'auto', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Duplicate Transactions (will be skipped)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {previewData.duplicateDetails.map((dup, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                padding: '10px',
                                                background: overrideIds.has(dup.incoming.id)
                                                    ? 'rgba(16, 185, 129, 0.1)'
                                                    : 'rgba(239, 68, 68, 0.1)',
                                                borderRadius: '8px',
                                                borderLeft: `3px solid ${overrideIds.has(dup.incoming.id) ? 'var(--accent-success)' : 'var(--accent-danger)'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                                        {dup.incoming.date.toLocaleDateString()} — {dup.incoming.merchant}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        {dup.incoming.description.slice(0, 40)}...
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: '600' }}>
                                                    ${(dup.incoming.debit || dup.incoming.credit).toFixed(2)}
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.7rem',
                                                    cursor: 'pointer',
                                                    color: overrideIds.has(dup.incoming.id) ? 'var(--accent-success)' : 'var(--text-secondary)'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={overrideIds.has(dup.incoming.id)}
                                                        onChange={() => toggleOverride(dup.incoming.id)}
                                                        style={{ accentColor: 'var(--accent-success)' }}
                                                    />
                                                    Import anyway (not a duplicate)
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={cancelImport}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmImport}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--accent-success)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Check size={16} />
                                Import {previewData.stats.totalNew + overrideIds.size} transactions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload feedback */}
            {lastUploadStats && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: errors.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${errors.length > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {errors.length > 0 ? (
                            <AlertCircle size={16} color="var(--accent-danger)" />
                        ) : (
                            <CheckCircle size={16} color="var(--accent-success)" />
                        )}
                        <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                            Upload Complete
                        </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>📁 {lastUploadStats.filesProcessed} file(s)</span>
                        <span style={{ color: 'var(--accent-success)' }}>✓ {lastUploadStats.totalNew} new</span>
                        {lastUploadStats.totalDuplicates > 0 && (
                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Copy size={12} /> {lastUploadStats.totalDuplicates} duplicates skipped
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Error messages */}
            {errors.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                    {errors.map((err, i) => (
                        <div key={i} style={{
                            padding: '8px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: 'var(--accent-danger)',
                            marginBottom: '4px'
                        }}>
                            {err}
                        </div>
                    ))}
                </div>
            )}

            {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Loaded Files
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {uploadedFiles.map((name, i) => (
                            <span key={i} className="category-badge">
                                <FileSpreadsheet size={12} style={{ marginRight: '4px' }} />
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
