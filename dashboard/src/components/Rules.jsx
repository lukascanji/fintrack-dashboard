import { useState } from 'react';
import {
    ChevronDown, ChevronUp, Trash2, Pencil, Tag, Layers,
    Scissors, Users, Mail, AlertCircle
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import styles from './Rules.module.css';

/**
 * Rules diagnostic component - displays all user-generated rules
 * from recurring item customizations.
 */
export default function Rules() {
    const {
        globalRenames, setGlobalRenames,
        categoryOverrides, setCategoryOverrides,
        mergedSubscriptions, setMergedSubscriptions,
        merchantSplits, setMerchantSplits,
        sharedSubscriptions, setSharedSubscriptions,
        emails, setEmails
    } = useTransactions();

    // Expanded sections state
    const [expandedSections, setExpandedSections] = useState({
        renames: true,
        categories: true,
        merges: true,
        splits: true,
        shares: true,
        emails: true
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
        setMergedSubscriptions(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    const deleteSplit = (key) => {
        setMerchantSplits(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
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
    const splitsCount = Object.keys(merchantSplits).length;
    const sharesCount = Object.keys(sharedSubscriptions).length;
    const emailsCount = Object.keys(emails).length;
    const totalRules = renamesCount + categoriesCount + mergesCount + splitsCount + sharesCount + emailsCount;

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
                                                ({merge.sourceKeys?.length || 0} items merged)
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
                                {Object.entries(merchantSplits).map(([key, split]) => (
                                    <div key={key} className={styles.ruleItem}>
                                        <div className={styles.ruleContent}>
                                            <span className={styles.ruleOriginal}>{key}</span>
                                            <span className={styles.splitDetails}>
                                                Split into {Array.isArray(split) ? split.length : 1} items
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteSplit(key)}
                                            title="Delete split"
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
        </div>
    );
}
