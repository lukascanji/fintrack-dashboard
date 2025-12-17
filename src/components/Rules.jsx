import { useState, useMemo, useRef } from 'react';
import {
    ChevronDown, ChevronUp, Trash2, Pencil, Tag, Layers,
    Scissors, Users, Mail, AlertCircle, Download, Clock, History, RefreshCw, FileText, Upload
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { getEventLog, formatEventForDisplay, exportLog, getLogSummary } from '../utils/transformationLog';
import { exportStateAsJSON, generateDetailedSnapshot, resetToFresh, downloadFile } from '../utils/configSnapshot';
import { detectSubscriptions } from '../features/recurring/utils/recurringUtils';
import styles from './Rules.module.css';

/**
 * Rules diagnostic component - displays all user-generated rules
 * from recurring item customizations.
 */
export default function Rules() {
    const {
        transactions,
        globalRenames, setGlobalRenames,
        categoryOverrides, setCategoryOverrides,
        mergedSubscriptions, setMergedSubscriptions,
        splitSubscriptions, setSplitSubscriptions,
        sharedSubscriptions, setSharedSubscriptions,
        emails, setEmails,
        chargeAssignments, setChargeAssignments
    } = useTransactions();

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const fileInputRef = useRef(null);

    // Expanded sections state
    const [expandedSections, setExpandedSections] = useState({
        history: true,
        renames: true,
        categories: true,
        merges: true,
        splits: true,
        shares: true,
        emails: true,
        assignments: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Delete handlers
    const deleteRename = (key) => {
        setGlobalRenames(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const deleteCategory = (key) => {
        setCategoryOverrides(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const deleteMerge = (key) => {
        // Remove the merge record
        setMergedSubscriptions(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });

        // Clear all charge assignments that point to this merged target
        // This returns transactions to their original detected subscriptions
        setChargeAssignments(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            Object.keys(updated).forEach(txnId => {
                if (updated[txnId] === key) {
                    delete updated[txnId];
                    hasChanges = true;
                }
            });
            return hasChanges ? updated : prev;
        });
    };

    const deleteSplit = (key) => {
        // Remove the split record
        setSplitSubscriptions(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });

        // Also clear charge assignments that came from this split
        setChargeAssignments(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            // Clear assignments where source was the split subscription
            // The assignments point TO the split targets, so we need to get those
            const splitRecord = splitSubscriptions[key];
            if (splitRecord && splitRecord.splitTo) {
                splitRecord.splitTo.forEach(targetKey => {
                    Object.keys(updated).forEach(txnId => {
                        if (updated[txnId] === targetKey) {
                            delete updated[txnId];
                            hasChanges = true;
                        }
                    });
                });
            }
            return hasChanges ? updated : prev;
        });
    };

    const deleteShare = (key) => {
        setSharedSubscriptions(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const deleteEmail = (key) => {
        setEmails(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    // Compute counts
    const renamesCount = Object.keys(globalRenames).length;
    const categoriesCount = Object.keys(categoryOverrides).length;
    const mergesCount = Object.keys(mergedSubscriptions).length;
    const splitsCount = Object.keys(splitSubscriptions || {}).length;
    const sharesCount = Object.keys(sharedSubscriptions).length;
    const emailsCount = Object.keys(emails).length;
    const assignmentsCount = Object.keys(chargeAssignments).length;
    const totalRules = renamesCount + categoriesCount + mergesCount + splitsCount + sharesCount + emailsCount;

    // Group assignments by target for better display
    const assignmentsByTarget = {};
    Object.entries(chargeAssignments).forEach(([txnId, targetKey]) => {
        if (!assignmentsByTarget[targetKey]) {
            assignmentsByTarget[targetKey] = [];
        }
        assignmentsByTarget[targetKey].push(txnId);
    });

    // Get transformation log summary and recent events
    const logSummary = useMemo(() => getLogSummary(), []);
    const recentEvents = useMemo(() => {
        const log = getEventLog();
        return log.events.slice(-10).reverse().map(formatEventForDisplay);
    }, []);

    // Export handler
    const handleExport = () => {
        const jsonData = exportLog();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintrack_transformation_log_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearAssignmentsForTarget = (targetKey) => {
        setChargeAssignments(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(txnId => {
                if (updated[txnId] === targetKey) {
                    delete updated[txnId];
                }
            });
            return updated;
        });
    };

    // Detect recurring items for snapshot
    const recurringItems = useMemo(() => detectSubscriptions(transactions), [transactions]);

    // Handler for exporting detailed snapshot
    const handleExportSnapshot = () => {
        const timestamp = new Date().toISOString().split('T')[0];

        // Export JSON backup
        const jsonBackup = exportStateAsJSON();
        downloadFile(jsonBackup, `fintrack_backup_${timestamp}.json`, 'application/json');

        // Export detailed markdown
        const markdown = generateDetailedSnapshot(transactions, recurringItems);
        downloadFile(markdown, `fintrack_snapshot_${timestamp}.md`, 'text/markdown');

        console.log('✅ Exported backup JSON and detailed markdown snapshot');
    };

    // Handler for reset
    const handleReset = () => {
        resetToFresh();
        setShowResetConfirm(false);
        window.location.reload();
    };

    // Handler for restore from backup
    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const backup = JSON.parse(jsonString);

                if (!backup.state) {
                    alert('Invalid backup file format');
                    return;
                }

                Object.entries(backup.state).forEach(([key, value]) => {
                    localStorage.setItem(key, JSON.stringify(value));
                });

                alert(`✅ Restored ${Object.keys(backup.state).length} settings from backup`);
                window.location.reload();
            } catch (err) {
                alert('Error reading backup file: ' + err.message);
            }
        };
        reader.readAsText(file);

        // Reset the input so same file can be selected again
        event.target.value = '';
    };

    return (
        <div className={styles.container}>
            {/* Summary Card */}
            <div className={styles.summaryCard}>
                <div className={styles.summaryTitle}>
                    <AlertCircle size={20} />
                    User-Generated Rules
                </div>
                <div className={styles.summaryStats}>
                    <span className={styles.totalCount}>{totalRules}</span>
                    <span className={styles.totalLabel}>Total Rules</span>
                </div>
                <div className={styles.summaryBreakdown}>
                    <span>{renamesCount} renames</span>
                    <span>•</span>
                    <span>{categoriesCount} categories</span>
                    <span>•</span>
                    <span>{mergesCount} merges</span>
                    <span>•</span>
                    <span>{splitsCount} splits</span>
                    <span>•</span>
                    <span>{sharesCount} shares</span>
                    <span>•</span>
                    <span>{emailsCount} emails</span>
                </div>
                <button
                    className={styles.exportButton}
                    onClick={handleExport}
                    title="Export transformation log as JSON"
                >
                    <Download size={14} />
                    Export Log ({logSummary.totalEvents} events)
                </button>
                <div className={styles.buttonRow}>
                    <button
                        className={styles.snapshotButton}
                        onClick={handleExportSnapshot}
                        title="Export full configuration snapshot with transaction details"
                    >
                        <FileText size={14} />
                        Save Snapshot
                    </button>
                    <button
                        className={styles.resetButton}
                        onClick={() => setShowResetConfirm(true)}
                        title="Reset all rules and start fresh"
                    >
                        <RefreshCw size={14} />
                        Reset to Fresh
                    </button>
                    <button
                        className={styles.restoreButton}
                        onClick={handleRestoreClick}
                        title="Restore from JSON backup file"
                    >
                        <Upload size={14} />
                        Restore Backup
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".json"
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className={styles.modalOverlay} onClick={() => setShowResetConfirm(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3>⚠️ Reset All Configuration?</h3>
                        <p>This will clear all rules: renames, merges, categories, approvals, and transformation history.</p>
                        <p><strong>Make sure you've exported a snapshot first!</strong></p>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.confirmResetButton}
                                onClick={handleReset}
                            >
                                Yes, Reset Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transformation History Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('history')}
                >
                    <div className={styles.sectionTitle}>
                        <History size={16} />
                        Transformation History
                        <span className={styles.badge}>{logSummary.totalEvents}</span>
                    </div>
                    {expandedSections.history ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.history && (
                    <div className={styles.sectionContent}>
                        {recentEvents.length === 0 ? (
                            <div className={styles.emptyMessage}>No transformation events logged yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {recentEvents.map(event => (
                                    <div key={event.id} className={styles.historyItem}>
                                        <span className={styles.historyIcon}>{event.icon}</span>
                                        <div className={styles.historyContent}>
                                            <span className={styles.historyDesc}>{event.description}</span>
                                            <span className={styles.historyTime}>{event.formattedTime}</span>
                                        </div>
                                        <span className={`${styles.historySource} ${styles[event.triggeredBy]}`}>
                                            {event.triggeredBy}
                                        </span>
                                    </div>
                                ))}
                                {logSummary.totalEvents > 10 && (
                                    <div className={styles.moreEvents}>
                                        + {logSummary.totalEvents - 10} more events (use Timeline view in Recurring tab)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Renames Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('renames')}
                >
                    <div className={styles.sectionTitle}>
                        <Pencil size={16} />
                        Renames
                        <span className={styles.badge}>{renamesCount}</span>
                    </div>
                    {expandedSections.renames ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.renames && (
                    <div className={styles.sectionContent}>
                        {renamesCount === 0 ? (
                            <div className={styles.emptyMessage}>No rename rules created yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(globalRenames).map(([key, value]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{value.originalMerchant || key}</span>
                                            <span className={styles.ruleArrow}>→</span>
                                            <span className={styles.ruleNew}>{value.displayName}</span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteRename(key)}
                                            title="Delete rule"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Category Overrides Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('categories')}
                >
                    <div className={styles.sectionTitle}>
                        <Tag size={16} />
                        Category Overrides
                        <span className={styles.badge}>{categoriesCount}</span>
                    </div>
                    {expandedSections.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.categories && (
                    <div className={styles.sectionContent}>
                        {categoriesCount === 0 ? (
                            <div className={styles.emptyMessage}>No category overrides created yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(categoryOverrides).map(([key, category]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{key}</span>
                                            <span className={styles.ruleArrow}>→</span>
                                            <span className={styles.categoryBadge}>{category}</span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteCategory(key)}
                                            title="Delete rule"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Merged Subscriptions Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('merges')}
                >
                    <div className={styles.sectionTitle}>
                        <Layers size={16} />
                        Merged Subscriptions
                        <span className={styles.badge}>{mergesCount}</span>
                    </div>
                    {expandedSections.merges ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.merges && (
                    <div className={styles.sectionContent}>
                        {mergesCount === 0 ? (
                            <div className={styles.emptyMessage}>No merged subscriptions yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(mergedSubscriptions).map(([key, merge]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleNew}>{merge.displayName || key}</span>
                                            <span className={styles.mergeDetails}>
                                                {/* For new merged items (merged_*), mergedFrom contains all sources
                                                    For existing items as targets, mergedFrom doesn't include the target, so +1 */}
                                                ({key.startsWith('merged_')
                                                    ? merge.mergedFrom?.length || 0
                                                    : (merge.mergedFrom?.length || 0) + 1
                                                } items in this bundle)
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteMerge(key)}
                                            title="Delete merge"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Splits Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('splits')}
                >
                    <div className={styles.sectionTitle}>
                        <Scissors size={16} />
                        Split Items
                        <span className={styles.badge}>{splitsCount}</span>
                    </div>
                    {expandedSections.splits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.splits && (
                    <div className={styles.sectionContent}>
                        {splitsCount === 0 ? (
                            <div className={styles.emptyMessage}>No split items yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(splitSubscriptions || {}).map(([key, split]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{split.displayName || key}</span>
                                            <span className={styles.splitDetails}>
                                                ({split.transactionCount || 0} charges split to {split.splitTo?.length || 0} targets)
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteSplit(key)}
                                            title="Delete split (returns transactions to original)"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Shared Subscriptions Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('shares')}
                >
                    <div className={styles.sectionTitle}>
                        <Users size={16} />
                        Shared Subscriptions
                        <span className={styles.badge}>{sharesCount}</span>
                    </div>
                    {expandedSections.shares ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.shares && (
                    <div className={styles.sectionContent}>
                        {sharesCount === 0 ? (
                            <div className={styles.emptyMessage}>No shared subscriptions yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(sharedSubscriptions).map(([key, people]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{key}</span>
                                            <span className={styles.ruleArrow}>→</span>
                                            <span className={styles.shareList}>
                                                {Array.isArray(people) ? people.join(', ') : people}
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteShare(key)}
                                            title="Delete share"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Email Associations Section */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('emails')}
                >
                    <div className={styles.sectionTitle}>
                        <Mail size={16} />
                        Email Associations
                        <span className={styles.badge}>{emailsCount}</span>
                    </div>
                    {expandedSections.emails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.emails && (
                    <div className={styles.sectionContent}>
                        {emailsCount === 0 ? (
                            <div className={styles.emptyMessage}>No email associations yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(emails).map(([key, email]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{key}</span>
                                            <span className={styles.ruleArrow}>→</span>
                                            <span className={styles.emailValue}>{email}</span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteEmail(key)}
                                            title="Delete email"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Charge Assignments Section (Debugging) */}
            <div className={styles.section}>
                <div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('assignments')}
                >
                    <div className={styles.sectionTitle}>
                        <Layers size={16} />
                        Charge Assignments
                        <span className={styles.badge}>{assignmentsCount}</span>
                    </div>
                    {expandedSections.assignments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {expandedSections.assignments && (
                    <div className={styles.sectionContent}>
                        {Object.keys(assignmentsByTarget).length === 0 ? (
                            <div className={styles.emptyMessage}>No charge assignments yet.</div>
                        ) : (
                            <div className={styles.rulesList}>
                                {Object.entries(assignmentsByTarget).map(([targetKey, txnIds]) => (
                                    <div key={targetKey} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleNew}>{targetKey}</span>
                                            <span className={styles.mergeDetails}>
                                                ({txnIds.length} transaction{txnIds.length !== 1 ? 's' : ''} assigned)
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => clearAssignmentsForTarget(targetKey)}
                                            title="Clear these assignments"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
