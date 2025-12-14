import { useState, useMemo } from 'react';
import { Upload, Check, AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { parseSubscriptionCSV, groupByAffiliation } from '../utils/csvSubscriptionParser';
import { matchSubscriptionsToTransactions, generateImportData } from '../utils/subscriptionMatcher';
import ModalOverlay, { ModalHeader, ModalFooter } from '../features/split-charges/components/ModalComponents';

/**
 * Modal for importing subscription clarification CSVs
 * Allows bulk-assigning transactions from umbrella merchants to specific services
 */
export default function ImportSubscriptionsModal({
    isOpen,
    onClose,
    transactions,
    onImport
}) {
    const [step, setStep] = useState('upload'); // upload, preview, confirm
    const [csvText, setCsvText] = useState('');
    const [parseResult, setParseResult] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [expandedServices, setExpandedServices] = useState(new Set());
    const [selectedServices, setSelectedServices] = useState(new Set());

    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                setCsvText(text);
                processCSV(text);
            }
        };
        reader.readAsText(file);
    };

    // Handle paste
    const handlePaste = () => {
        if (csvText.trim()) {
            processCSV(csvText);
        }
    };

    // Process CSV and run matching
    const processCSV = (text) => {
        const parsed = parseSubscriptionCSV(text);
        setParseResult(parsed);

        if (parsed.subscriptions.length > 0) {
            const matches = matchSubscriptionsToTransactions(parsed.subscriptions, transactions);
            setMatchResult(matches);

            // Auto-select services with matches
            const servicesWithMatches = Object.entries(matches.stats.subscriptionStats)
                .filter(([, stats]) => stats.matched > 0)
                .map(([key]) => key);
            setSelectedServices(new Set(servicesWithMatches));

            setStep('preview');
        }
    };

    // Toggle service selection
    const toggleService = (serviceKey) => {
        setSelectedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceKey)) {
                next.delete(serviceKey);
            } else {
                next.add(serviceKey);
            }
            return next;
        });
    };

    // Toggle service expansion
    const toggleExpand = (serviceKey) => {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceKey)) {
                next.delete(serviceKey);
            } else {
                next.add(serviceKey);
            }
            return next;
        });
    };

    // Get matched transactions for a service
    const getMatchedTransactions = (serviceKey) => {
        if (!matchResult) return [];
        const txnIds = matchResult.matches[serviceKey] || [];
        return transactions.filter(t => {
            const id = `${t.date.toISOString().split('T')[0]}_${t.description}_${t.debit || t.credit || t.amount}`;
            return txnIds.includes(id);
        });
    };

    // Handle import confirmation
    const handleConfirm = () => {
        if (!matchResult || !parseResult) return;

        // Filter to only selected services
        const selectedMatches = {};
        const selectedStats = { subscriptionStats: {} };

        selectedServices.forEach(key => {
            if (matchResult.matches[key]) {
                selectedMatches[key] = matchResult.matches[key];
                selectedStats.subscriptionStats[key] = matchResult.stats.subscriptionStats[key];
            }
        });

        const importData = generateImportData(
            { matches: selectedMatches, stats: selectedStats },
            matchResult.parsedSubscriptions // Use the combined subscriptions
        );

        // Include parsed subscriptions for rule generation
        importData.parsedSubscriptions = matchResult.parsedSubscriptions;

        onImport(importData);
        handleClose();
    };

    // Reset and close
    const handleClose = () => {
        setStep('upload');
        setCsvText('');
        setParseResult(null);
        setMatchResult(null);
        setExpandedServices(new Set());
        setSelectedServices(new Set());
        onClose();
    };

    // Group by affiliation for display
    const groupedServices = useMemo(() => {
        if (!matchResult) return {};

        const groups = {};
        Object.entries(matchResult.stats.subscriptionStats).forEach(([key, stats]) => {
            const sub = parseResult?.subscriptions.find(s => s.serviceName === stats.serviceName);
            const affiliation = sub?.affiliation || 'Other';
            if (!groups[affiliation]) groups[affiliation] = [];
            groups[affiliation].push({ key, ...stats, sub });
        });
        return groups;
    }, [matchResult, parseResult]);

    // Count totals
    const totalSelected = selectedServices.size;
    const totalMatched = [...selectedServices].reduce((sum, key) => {
        return sum + (matchResult?.stats.subscriptionStats[key]?.matched || 0);
    }, 0);

    if (!isOpen) return null;

    return (
        <ModalOverlay onClose={handleClose}>
            <ModalHeader
                title="Import Subscription Clarifications"
                onClose={handleClose}
            />

            {step === 'upload' && (
                <div style={{ padding: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Upload a CSV with your subscription clarifications. This will automatically
                        match and assign transactions from umbrella merchants (Apple, Amazon, etc.)
                        to their specific services.
                    </p>

                    {/* File Upload */}
                    <label style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '40px',
                        border: '2px dashed var(--border-color)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        transition: 'border-color 0.2s'
                    }}>
                        <Upload size={32} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                            Click to upload CSV
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            or drag and drop
                        </span>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </label>

                    {/* Or paste */}
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '16px 0' }}>
                        — or paste CSV content below —
                    </div>

                    <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="Service,Affiliation,Day,Jan,Feb,Mar,...&#10;Apple Music,APPLE,1st,$10.99,$10.99,..."
                        style={{
                            width: '100%',
                            height: '120px',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            resize: 'vertical'
                        }}
                    />

                    {csvText.trim() && (
                        <button
                            onClick={handlePaste}
                            style={{
                                marginTop: '12px',
                                padding: '10px 20px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Parse & Match
                        </button>
                    )}
                </div>
            )}

            {step === 'preview' && matchResult && (
                <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {/* Parse errors */}
                    {parseResult?.errors.length > 0 && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)' }}>
                                <AlertCircle size={16} />
                                <strong>Parsing Issues</strong>
                            </div>
                            <ul style={{ margin: '8px 0 0 24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {parseResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Stats summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {parseResult?.subscriptions.length || 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Services Parsed</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-success)' }}>
                                {matchResult.stats.matchedTransactions}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Transactions Matched</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-warning)' }}>
                                {matchResult.stats.unmatchedTransactions}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Unmatched</div>
                        </div>
                    </div>

                    {/* Services grouped by affiliation */}
                    {Object.entries(groupedServices).map(([affiliation, services]) => (
                        <div key={affiliation} style={{ marginBottom: '16px' }}>
                            <h4 style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '8px'
                            }}>
                                {affiliation}
                            </h4>

                            {services.map(({ key, serviceName, matched, expectedMonths }) => (
                                <div key={key} style={{
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px',
                                            gap: '12px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => toggleExpand(key)}
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedServices.has(key)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleService(key);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />

                                        {/* Expand icon */}
                                        {expandedServices.has(key) ?
                                            <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} /> :
                                            <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                                        }

                                        {/* Service name */}
                                        <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: '500' }}>
                                            {serviceName}
                                        </span>

                                        {/* Match count */}
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: matched > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: matched > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                                        }}>
                                            {matched}/{expectedMonths} matched
                                        </span>
                                    </div>

                                    {/* Expanded: show matched transactions */}
                                    {expandedServices.has(key) && (
                                        <div style={{
                                            padding: '0 12px 12px 48px',
                                            borderTop: '1px solid var(--border-color)'
                                        }}>
                                            {getMatchedTransactions(key).length > 0 ? (
                                                <div style={{ marginTop: '8px' }}>
                                                    {getMatchedTransactions(key).slice(0, 5).map((t, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--text-secondary)',
                                                            padding: '4px 0'
                                                        }}>
                                                            <span>{t.date.toLocaleDateString()}</span>
                                                            <span>${(t.debit || t.amount || 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    {getMatchedTransactions(key).length > 5 && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                            +{getMatchedTransactions(key).length - 5} more
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    color: 'var(--text-tertiary)',
                                                    fontSize: '0.85rem',
                                                    marginTop: '8px',
                                                    fontStyle: 'italic'
                                                }}>
                                                    No matching transactions found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <ModalFooter
                leftContent={step === 'preview' ? `${totalSelected} services selected (${totalMatched} transactions)` : ''}
                onCancel={handleClose}
                onConfirm={step === 'preview' ? handleConfirm : undefined}
                confirmDisabled={step !== 'preview' || totalSelected === 0}
                confirmText="Import Selected"
            />
        </ModalOverlay>
    );
}
