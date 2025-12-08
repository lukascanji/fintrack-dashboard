import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { categorizeMerchant } from '../utils/categorize';

const TransactionContext = createContext(null);

const STORAGE_KEY = 'fintrack_transactions';
const MANUAL_RECURRING_KEY = 'fintrack_manual_recurring';
const CHARGE_ASSIGNMENTS_KEY = 'fintrack_charge_assignments';
const APPROVED_KEY = 'fintrack_recurring_approved';
const DENIED_KEY = 'fintrack_recurring_denied';
const SPLITS_KEY = 'fintrack_merchant_splits';

// Helper to serialize/deserialize dates
function serializeTransactions(transactions) {
    return transactions.map(t => ({
        ...t,
        date: t.date.toISOString()
    }));
}

function deserializeTransactions(data) {
    return data.map(t => {
        // Re-categorize based on current rules
        const { merchant, category } = categorizeMerchant(t.description);
        return {
            ...t,
            date: new Date(t.date),
            merchant,
            category
        };
    });
}

export function TransactionProvider({ children }) {
    // --- Transactions State ---
    const [transactions, setTransactions] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? deserializeTransactions(JSON.parse(saved)) : [];
        } catch (e) {
            console.error('Error loading transactions:', e);
            return [];
        }
    });

    // --- Recurring State ---
    const [approvedItems, setApprovedItems] = useState(() => {
        try {
            const saved = localStorage.getItem(APPROVED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [deniedItems, setDeniedItems] = useState(() => {
        try {
            const saved = localStorage.getItem(DENIED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [manualRecurring, setManualRecurring] = useState(() => {
        try {
            const saved = localStorage.getItem(MANUAL_RECURRING_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [chargeAssignments, setChargeAssignments] = useState(() => {
        try {
            const saved = localStorage.getItem(CHARGE_ASSIGNMENTS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [merchantSplits, setMerchantSplits] = useState(() => {
        try {
            const saved = localStorage.getItem(SPLITS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [mergedSubscriptions, setMergedSubscriptions] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_merged_subscriptions');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [emails, setEmails] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_subscription_emails');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [globalRenames, setGlobalRenames] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_global_renames');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [sharedSubscriptions, setSharedSubscriptions] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_shared_subscriptions');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [personNames, setPersonNames] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_person_names');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [customNames, setCustomNames] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_recurring_names');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [categoryOverrides, setCategoryOverrides] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_recurring_categories');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [peopleList, setPeopleList] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_people_list');
            return saved ? JSON.parse(saved) : ['You'];
        } catch { return ['You']; }
    });

    const [settlements, setSettlements] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_person_settlements');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    // --- Persistence Effects ---
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTransactions(transactions)));
    }, [transactions]);

    useEffect(() => {
        localStorage.setItem(APPROVED_KEY, JSON.stringify(approvedItems));
    }, [approvedItems]);

    useEffect(() => {
        localStorage.setItem(DENIED_KEY, JSON.stringify(deniedItems));
    }, [deniedItems]);

    useEffect(() => {
        localStorage.setItem(MANUAL_RECURRING_KEY, JSON.stringify(manualRecurring));
    }, [manualRecurring]);

    useEffect(() => {
        localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(chargeAssignments));
    }, [chargeAssignments]);

    useEffect(() => {
        localStorage.setItem(SPLITS_KEY, JSON.stringify(merchantSplits));
    }, [merchantSplits]);

    useEffect(() => {
        localStorage.setItem('fintrack_merged_subscriptions', JSON.stringify(mergedSubscriptions));
    }, [mergedSubscriptions]);

    useEffect(() => {
        localStorage.setItem('fintrack_subscription_emails', JSON.stringify(emails));
    }, [emails]);

    useEffect(() => {
        localStorage.setItem('fintrack_global_renames', JSON.stringify(globalRenames));
    }, [globalRenames]);

    useEffect(() => {
        localStorage.setItem('fintrack_shared_subscriptions', JSON.stringify(sharedSubscriptions));
    }, [sharedSubscriptions]);

    useEffect(() => {
        localStorage.setItem('fintrack_person_names', JSON.stringify(personNames));
    }, [personNames]);

    useEffect(() => {
        localStorage.setItem('fintrack_recurring_names', JSON.stringify(customNames));
    }, [customNames]);

    useEffect(() => {
        localStorage.setItem('fintrack_recurring_categories', JSON.stringify(categoryOverrides));
    }, [categoryOverrides]);

    useEffect(() => {
        localStorage.setItem('fintrack_people_list', JSON.stringify(peopleList));
    }, [peopleList]);

    useEffect(() => {
        localStorage.setItem('fintrack_person_settlements', JSON.stringify(settlements));
    }, [settlements]);

    // --- Actions ---
    const addTransactions = useCallback((newTransactions) => {
        setTransactions(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const unique = newTransactions.filter(t => !existingIds.has(t.id));
            return [...prev, ...unique];
        });
    }, []);

    const clearTransactions = useCallback(() => {
        setTransactions([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const recategorizeAll = useCallback(() => {
        setTransactions(prev => {
            return prev.map(t => {
                const { merchant, category } = categorizeMerchant(t.description);
                return { ...t, merchant, category };
            });
        });
    }, []);

    // --- Listen for external storage changes (sync across tabs) ---
    useEffect(() => {
        const handleStorageChange = (e) => {
            // Only reload if the key matches our keys
            if (e.key === STORAGE_KEY) {
                const saved = localStorage.getItem(STORAGE_KEY);
                setTransactions(saved ? deserializeTransactions(JSON.parse(saved)) : []);
            }
            // Add other keys here if we want full multi-tab sync
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const value = {
        transactions,
        setTransactions,
        addTransactions,
        clearTransactions,
        recategorizeAll,

        approvedItems,
        setApprovedItems,

        deniedItems,
        setDeniedItems,

        manualRecurring,
        setManualRecurring,

        chargeAssignments,
        setChargeAssignments,

        merchantSplits,
        setMerchantSplits,

        mergedSubscriptions,
        setMergedSubscriptions,

        emails,
        setEmails,

        globalRenames,
        setGlobalRenames,

        sharedSubscriptions,
        setSharedSubscriptions,

        personNames,
        setPersonNames,

        customNames,
        setCustomNames,

        categoryOverrides,
        setCategoryOverrides,

        peopleList,
        setPeopleList,

        settlements,
        setSettlements
    };

    return (
        <TransactionContext.Provider value={value}>
            {children}
        </TransactionContext.Provider>
    );
}

export function useTransactions() {
    return useContext(TransactionContext);
}
