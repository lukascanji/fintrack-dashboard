export function calculateStats(transactions) {
    if (!transactions.length) {
        return {
            totalSpend: 0,
            totalIncome: 0,
            netFlow: 0,
            avgMonthlySpend: 0,
            transactionCount: 0,
            monthlyData: [],
            categoryBreakdown: {},
            merchantBreakdown: {}
        };
    }

    // Filter out transfers for spending analysis
    const spendingTxns = transactions.filter(t =>
        t.debit > 0 && !['TRANSFER'].includes(t.category)
    );

    const totalSpend = spendingTxns.reduce((sum, t) => sum + t.debit, 0);
    const totalIncome = transactions.reduce((sum, t) => sum + t.credit, 0);
    const netFlow = totalIncome - transactions.reduce((sum, t) => sum + t.debit, 0);

    // Monthly breakdown
    const monthlyMap = {};
    transactions.forEach(t => {
        const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = { income: 0, expenses: 0 };
        }
        monthlyMap[monthKey].income += t.credit;
        monthlyMap[monthKey].expenses += t.debit;
    });

    const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
            month,
            income: data.income,
            expenses: data.expenses,
            net: data.income - data.expenses
        }));

    const avgMonthlySpend = monthlyData.length > 0
        ? monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length
        : 0;

    // Category breakdown
    const categoryBreakdown = {};
    spendingTxns.forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.debit;
    });

    // Merchant breakdown - use effectiveMerchant if available (from enriched transactions)
    const merchantBreakdown = {};
    spendingTxns.forEach(t => {
        const merchantName = t.effectiveMerchant || t.merchant;
        if (!merchantBreakdown[merchantName]) {
            merchantBreakdown[merchantName] = { total: 0, count: 0, category: t.category };
        }
        merchantBreakdown[merchantName].total += t.debit;
        merchantBreakdown[merchantName].count += 1;
    });

    return {
        totalSpend,
        totalIncome,
        netFlow,
        avgMonthlySpend,
        transactionCount: transactions.length,
        monthlyData,
        categoryBreakdown,
        merchantBreakdown
    };
}
