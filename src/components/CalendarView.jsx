import { useState, useMemo } from 'react';
import { getMerchantKey } from '../utils/categorize';
import { detectSubscriptions } from '../features/recurring/utils/recurringUtils';
import { useTransactions } from '../context/TransactionContext';
import CalendarHeader from '../features/calendar/components/CalendarHeader';
import CalendarGrid from '../features/calendar/components/CalendarGrid';
import CalendarLegend from '../features/calendar/components/CalendarLegend';
import DayDetailPanel from '../features/calendar/components/DayDetailPanel';

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

export default function CalendarView() {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);

    // --- Global State from Context ---
    const {
        transactions,
        personNames,
        globalRenames,
        approvedItems,
        manualRecurring,
        mergedSubscriptions,
        chargeAssignments,
        splitSubscriptions
    } = useTransactions();

    // Alias for compatibility
    const approved = approvedItems;
    // ---------------------------------

    // Build effective names map (including splits and merges)
    const effectiveNames = useMemo(() => {
        const names = {};

        // 1. Add manual recurring names (like splits)
        manualRecurring.forEach(sub => {
            if (sub.merchantKey && sub.displayName) {
                names[sub.merchantKey] = sub.displayName;
            }
        });

        // 2. Add merged subscription names
        Object.entries(mergedSubscriptions || {}).forEach(([key, merge]) => {
            if (merge.displayName) {
                names[key] = merge.displayName;
            }
        });

        // 3. Override with global renames if they exist
        Object.entries(globalRenames).forEach(([key, value]) => {
            if (value && value.displayName) {
                names[key] = value.displayName;
            }
        });

        return names;
    }, [manualRecurring, mergedSubscriptions, globalRenames]);

    // Get display info for merchant (apply global renames and split/merge names)
    const getDisplayMerchantInfo = (t) => {
        // Import getTransactionId for charge assignment lookup
        const txnId = t.id || `${t.date?.toISOString?.() || t.date}-${t.description}-${t.amount || t.debit || t.credit}`;

        // 1. Check if this transaction is assigned to a different subscription (split/merge)
        const assignedTo = chargeAssignments[txnId];
        if (assignedTo && effectiveNames[assignedTo]) {
            return {
                displayName: effectiveNames[assignedTo],
                originalName: t.description,
                isRenamed: true
            };
        }

        const merchantKey = getMerchantKey(t.description);
        const txnAmount = Math.abs(t.amount || t.debit || t.credit || 0).toFixed(2);
        const amountKey = `${merchantKey}-${txnAmount}`;

        // 2. Check effective names (includes manual recurring and merges)
        if (effectiveNames[merchantKey]) {
            return {
                displayName: effectiveNames[merchantKey],
                originalName: t.description,
                isRenamed: true
            };
        }

        // 3. Check global renames with amount key
        if (globalRenames[amountKey]?.displayName) {
            return {
                displayName: globalRenames[amountKey].displayName,
                originalName: t.description,
                isRenamed: true
            };
        }
        if (globalRenames[merchantKey]?.displayName) {
            return {
                displayName: globalRenames[merchantKey].displayName,
                originalName: t.description,
                isRenamed: true
            };
        }

        // 4. Fallback search by originalMerchant + amount
        for (const [key, rename] of Object.entries(globalRenames)) {
            if (rename.originalMerchant && rename.amount) {
                const renameOrigKey = getMerchantKey(rename.originalMerchant);
                const renameAmount = rename.amount.toFixed(2);
                if (renameOrigKey === merchantKey && renameAmount === txnAmount) {
                    return {
                        displayName: rename.displayName,
                        originalName: t.description,
                        isRenamed: true
                    };
                }
            }
        }

        return {
            displayName: t.merchant,
            originalName: t.description,
            isRenamed: false
        };
    };

    // Detect subscriptions for future projections
    const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);

    // Build map of date -> transactions
    const transactionsByDate = useMemo(() => {
        const map = {};
        transactions.forEach(t => {
            const key = t.date.toDateString();
            if (!map[key]) map[key] = [];
            map[key].push(t);
        });
        return map;
    }, [transactions]);

    // Build projected subscription renewals for FUTURE dates only
    const projectedRenewals = useMemo(() => {
        const renewals = {};
        const endDate = new Date(currentYear, currentMonth + 3, 0);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // --- Build combined list of all projectable subscriptions ---
        const allProjectableSubs = [];
        const processedKeys = new Set();

        // Track amount signatures from approved items to detect duplicates
        // Format: "AFFILIATION-AMOUNT" e.g., "APPLE-19.20"
        const approvedAmountSignatures = new Set();

        // 1. Add approved detected subscriptions
        subscriptions
            .filter(sub => approved.includes(sub.merchantKey))
            .forEach(sub => {
                // Skip if this subscription was merged INTO something else
                const wasSourceOfMerge = Object.values(mergedSubscriptions || {})
                    .some(m => m.mergedFrom?.includes(sub.merchantKey));
                if (wasSourceOfMerge) return;

                // Skip if this subscription was SPLIT into children
                const wasSplit = splitSubscriptions && splitSubscriptions[sub.merchantKey];
                if (wasSplit) return;

                processedKeys.add(sub.merchantKey);

                // Build amount signature for deduplication
                const baseKey = sub.merchantKey.split('-')[0] || '';
                let affiliation = 'UNKNOWN';
                if (baseKey.startsWith('APPLE')) affiliation = 'APPLE';
                else if (baseKey.startsWith('AMZN') || baseKey.startsWith('AMAZON')) affiliation = 'AMAZON';
                else if (baseKey.startsWith('PAYPAL')) affiliation = 'PAYPAL';
                else if (baseKey.startsWith('GOOGLE')) affiliation = 'GOOGLE';

                const amountSig = `${affiliation}-${sub.latestAmount?.toFixed(2)}`;
                approvedAmountSignatures.add(amountSig);

                allProjectableSubs.push({
                    merchantKey: sub.merchantKey,
                    merchant: effectiveNames[sub.merchantKey] || sub.merchant,
                    latestAmount: sub.latestAmount,
                    frequency: sub.frequency,
                    nextDate: sub.nextDate
                });
            });

        // 2. Add manual recurring items (splits) - calculate timing from assigned transactions
        manualRecurring.forEach(manual => {
            if (processedKeys.has(manual.merchantKey)) return;

            // DEDUP: Skip if this manual item duplicates an approved subscription
            // by having the same affiliation and amount
            if (manual.affiliation && manual.latestAmount) {
                const manualSig = `${manual.affiliation}-${manual.latestAmount.toFixed(2)}`;
                if (approvedAmountSignatures.has(manualSig)) {
                    console.log(`Calendar: Skipping duplicate manual item ${manual.merchantKey} (matches approved sig: ${manualSig})`);
                    return;
                }
            }

            processedKeys.add(manual.merchantKey);

            // Find transactions assigned to this manual subscription
            const assignedTxnIds = Object.entries(chargeAssignments)
                .filter(([_, targetKey]) => targetKey === manual.merchantKey)
                .map(([txnId]) => txnId);

            // Find actual transaction objects for these IDs
            const assignedTxns = transactions.filter(t => {
                const tId = t.id || `txn_${t.date?.toISOString?.()?.split('T')[0] || t.date}_${Math.abs(t.debit || t.credit || 0).toFixed(2)}_${(t.description || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;
                return assignedTxnIds.some(aid => aid === tId || aid.includes(tId.split('_').slice(-1)[0]));
            });

            // Calculate nextDate from latest assigned transaction + 1 month
            let nextDate;
            let latestAmount = manual.latestAmount || manual.amount || 0;
            let frequency = manual.frequency || 'Monthly';

            if (assignedTxns.length > 0) {
                // Sort by date descending
                const sortedTxns = assignedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastTxn = sortedTxns[0];
                const lastDate = new Date(lastTxn.date);

                // Next date is 1 month after last transaction
                nextDate = new Date(lastDate);
                nextDate.setMonth(nextDate.getMonth() + 1);

                // Use actual amount from transaction
                latestAmount = Math.abs(lastTxn.debit || lastTxn.credit || lastTxn.amount || 0);

                // Detect frequency from transaction pattern (if 2+ transactions)
                if (sortedTxns.length >= 2) {
                    const daysBetween = Math.abs((new Date(sortedTxns[0].date) - new Date(sortedTxns[1].date)) / (1000 * 60 * 60 * 24));
                    if (daysBetween <= 10) frequency = 'Weekly';
                    else if (daysBetween <= 20) frequency = 'Bi-Weekly';
                    else if (daysBetween <= 45) frequency = 'Monthly';
                    else if (daysBetween <= 120) frequency = 'Quarterly';
                    else frequency = 'Yearly';
                }
            } else {
                // Fallback: next month from today
                nextDate = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, todayStart.getDate());
            }

            allProjectableSubs.push({
                merchantKey: manual.merchantKey,
                merchant: manual.displayName || manual.merchant,
                latestAmount: latestAmount,
                frequency: frequency,
                nextDate: nextDate
            });
        });

        // 3. Add merged subscriptions - use the target's info
        Object.entries(mergedSubscriptions || {}).forEach(([mergedKey, merge]) => {
            if (processedKeys.has(mergedKey)) return;
            processedKeys.add(mergedKey);

            // Find the base subscription for timing info (first merged source that exists)
            const baseSub = subscriptions.find(s =>
                merge.mergedFrom?.includes(s.merchantKey) || s.merchantKey === mergedKey
            );

            if (baseSub) {
                // Calculate combined amount from all merged sources
                const totalAmount = merge.mergedFrom
                    ?.map(srcKey => subscriptions.find(s => s.merchantKey === srcKey)?.latestAmount || 0)
                    .reduce((sum, amt) => sum + amt, 0) || baseSub.latestAmount;

                allProjectableSubs.push({
                    merchantKey: mergedKey,
                    merchant: merge.displayName,
                    latestAmount: totalAmount,
                    frequency: baseSub.frequency,
                    nextDate: baseSub.nextDate
                });
            }
        });

        // --- Generate renewals from combined list ---
        allProjectableSubs.forEach(sub => {
            let nextDate = new Date(sub.nextDate);
            const displayName = sub.merchant;

            while (nextDate <= endDate) {
                if (nextDate >= todayStart) {
                    const key = nextDate.toDateString();
                    if (!renewals[key]) renewals[key] = [];
                    renewals[key].push({
                        merchant: displayName,
                        merchantKey: sub.merchantKey,
                        amount: sub.latestAmount,
                        frequency: sub.frequency,
                        isProjected: true,
                        isRenamed: effectiveNames[sub.merchantKey] !== undefined
                    });
                }

                if (sub.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (sub.frequency === 'Bi-Weekly') nextDate.setDate(nextDate.getDate() + 14);
                else if (sub.frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                else if (sub.frequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                else if (sub.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else break;
            }
        });

        return renewals;
    }, [subscriptions, approved, currentYear, currentMonth, today, effectiveNames, manualRecurring, mergedSubscriptions, splitSubscriptions, chargeAssignments, transactions]);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    // --- Navigation handlers ---
    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
        setSelectedDate(null);
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
        setSelectedDate(null);
    };

    const goToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDate(null);
    };

    // Get transactions for selected date
    const selectedDateTransactions = selectedDate
        ? transactionsByDate[selectedDate.toDateString()] || []
        : [];
    const selectedDateRenewals = selectedDate
        ? projectedRenewals[selectedDate.toDateString()] || []
        : [];

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const days = [];

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null, date: null, transactions: [], renewals: [] });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateKey = date.toDateString();
            const dayTransactions = transactionsByDate[dateKey] || [];
            const dayRenewals = projectedRenewals[dateKey] || [];
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isPast = date < today;

            days.push({
                day,
                date,
                transactions: dayTransactions,
                renewals: dayRenewals,
                isToday,
                isSelected,
                isPast
            });
        }

        return days;
    }, [currentYear, currentMonth, daysInMonth, firstDay, transactionsByDate, projectedRenewals, selectedDate, today]);

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            {/* Calendar */}
            <div className="card" style={{ flex: 2 }}>
                <CalendarHeader
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                    onToday={goToToday}
                />

                <CalendarGrid
                    calendarDays={calendarDays}
                    onSelectDate={setSelectedDate}
                    getDisplayMerchantInfo={getDisplayMerchantInfo}
                />

                <CalendarLegend />
            </div>

            {/* Day detail panel */}
            <DayDetailPanel
                selectedDate={selectedDate}
                transactions={selectedDateTransactions}
                renewals={selectedDateRenewals}
                personNames={personNames}
                getDisplayMerchantInfo={getDisplayMerchantInfo}
                onClose={() => setSelectedDate(null)}
            />
        </div>
    );
}
