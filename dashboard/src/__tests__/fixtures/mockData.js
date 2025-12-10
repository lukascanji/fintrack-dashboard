/**
 * Mock transaction data for testing.
 * Mirrors the structure expected from CSV parsing.
 */

// Helper to create dates
const date = (str) => new Date(str);

export const mockTransactions = [
    // Netflix - monthly subscription (5 occurrences)
    { id: 'txn_1', date: date('2024-01-05'), description: 'NETFLIX.COM', debit: 15.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Netflix' },
    { id: 'txn_2', date: date('2024-02-05'), description: 'NETFLIX.COM', debit: 15.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Netflix' },
    { id: 'txn_3', date: date('2024-03-05'), description: 'NETFLIX.COM', debit: 15.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Netflix' },
    { id: 'txn_4', date: date('2024-04-05'), description: 'NETFLIX.COM', debit: 15.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Netflix' },
    { id: 'txn_5', date: date('2024-05-05'), description: 'NETFLIX.COM', debit: 15.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Netflix' },

    // Spotify - monthly subscription (4 occurrences)
    { id: 'txn_6', date: date('2024-01-10'), description: 'SPOTIFY P*', debit: 9.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Spotify' },
    { id: 'txn_7', date: date('2024-02-10'), description: 'SPOTIFY P*', debit: 9.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Spotify' },
    { id: 'txn_8', date: date('2024-03-10'), description: 'SPOTIFY P*', debit: 9.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Spotify' },
    { id: 'txn_9', date: date('2024-04-10'), description: 'SPOTIFY P*', debit: 9.99, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'Spotify' },

    // Starbucks - frequent but NOT a subscription (irregular amounts, DINING category)
    { id: 'txn_10', date: date('2024-01-15'), description: 'STARBUCKS #1234', debit: 5.50, credit: 0, category: 'DINING', merchant: 'Starbucks' },
    { id: 'txn_11', date: date('2024-01-16'), description: 'STARBUCKS #1235', debit: 4.75, credit: 0, category: 'DINING', merchant: 'Starbucks' },
    { id: 'txn_12', date: date('2024-01-18'), description: 'STARBUCKS #1234', debit: 6.00, credit: 0, category: 'DINING', merchant: 'Starbucks' },

    // PayPal - 3 different subscriptions (should be split-able)
    { id: 'txn_13', date: date('2024-01-08'), description: 'PAYPAL *MERCHANT1', debit: 25.98, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_14', date: date('2024-02-08'), description: 'PAYPAL *MERCHANT1', debit: 25.98, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_15', date: date('2024-03-08'), description: 'PAYPAL *MERCHANT1', debit: 25.98, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_16', date: date('2024-04-08'), description: 'PAYPAL *MERCHANT1', debit: 25.98, credit: 0, category: 'OTHER', merchant: 'PayPal' },

    { id: 'txn_17', date: date('2024-01-12'), description: 'PAYPAL *MERCHANT2', debit: 12.49, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_18', date: date('2024-02-12'), description: 'PAYPAL *MERCHANT2', debit: 12.49, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_19', date: date('2024-03-12'), description: 'PAYPAL *MERCHANT2', debit: 12.49, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_20', date: date('2024-04-12'), description: 'PAYPAL *MERCHANT2', debit: 12.49, credit: 0, category: 'OTHER', merchant: 'PayPal' },

    { id: 'txn_21', date: date('2024-01-15'), description: 'PAYPAL *MERCHANT3', debit: 21.46, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_22', date: date('2024-02-15'), description: 'PAYPAL *MERCHANT3', debit: 21.46, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_23', date: date('2024-03-15'), description: 'PAYPAL *MERCHANT3', debit: 21.46, credit: 0, category: 'OTHER', merchant: 'PayPal' },
    { id: 'txn_24', date: date('2024-04-15'), description: 'PAYPAL *MERCHANT3', debit: 21.46, credit: 0, category: 'OTHER', merchant: 'PayPal' },

    // Uber - trips vs eats (should be categorized differently)
    { id: 'txn_25', date: date('2024-01-20'), description: 'UBER *TRIP', debit: 15.00, credit: 0, category: 'TRANSPORTATION', merchant: 'Uber Trip' },
    { id: 'txn_26', date: date('2024-01-25'), description: 'UBER *TRIP', debit: 22.50, credit: 0, category: 'TRANSPORTATION', merchant: 'Uber Trip' },
    { id: 'txn_27', date: date('2024-02-05'), description: 'UBER EATS', debit: 18.75, credit: 0, category: 'DINING', merchant: 'Uber Eats' },
    { id: 'txn_28', date: date('2024-02-10'), description: 'UBER EATS', debit: 25.00, credit: 0, category: 'DINING', merchant: 'Uber Eats' },

    // E-transfers (income)
    { id: 'txn_29', date: date('2024-01-01'), description: 'E-TRANSFER FROM MOM', debit: 0, credit: 500.00, category: 'TRANSFER', merchant: 'E-Transfer' },
    { id: 'txn_30', date: date('2024-02-01'), description: 'E-TRANSFER FROM MOM', debit: 0, credit: 500.00, category: 'TRANSFER', merchant: 'E-Transfer' },
    { id: 'txn_31', date: date('2024-01-15'), description: 'E-TRANSFER FROM DAD', debit: 0, credit: 150.00, category: 'TRANSFER', merchant: 'E-Transfer' },

    // ChatGPT - should be detected as subscription
    { id: 'txn_32', date: date('2024-01-01'), description: 'CHATGPT SUBSCRIPTION', debit: 20.00, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'OpenAI ChatGPT' },
    { id: 'txn_33', date: date('2024-02-01'), description: 'CHATGPT SUBSCRIPTION', debit: 20.00, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'OpenAI ChatGPT' },
    { id: 'txn_34', date: date('2024-03-01'), description: 'CHATGPT SUBSCRIPTION', debit: 20.00, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'OpenAI ChatGPT' },
    { id: 'txn_35', date: date('2024-04-01'), description: 'CHATGPT SUBSCRIPTION', debit: 20.00, credit: 0, category: 'SUBSCRIPTIONS', merchant: 'OpenAI ChatGPT' },
];

// Mock subscription data (what detectSubscriptions should produce)
export const mockSubscriptions = [
    {
        merchantKey: 'netflix',
        merchant: 'Netflix',
        latestAmount: 15.99,
        frequency: 'Monthly',
        count: 5,
        allTransactions: mockTransactions.filter(t => t.merchant === 'Netflix'),
        nextDate: new Date('2024-06-05'),
    },
    {
        merchantKey: 'spotify',
        merchant: 'Spotify',
        latestAmount: 9.99,
        frequency: 'Monthly',
        count: 4,
        allTransactions: mockTransactions.filter(t => t.merchant === 'Spotify'),
        nextDate: new Date('2024-05-10'),
    },
    {
        merchantKey: 'paypal-25.98',
        merchant: 'PayPal ($25.98)',
        latestAmount: 25.98,
        frequency: 'Monthly',
        count: 4,
        allTransactions: mockTransactions.filter(t => t.description.includes('MERCHANT1')),
        nextDate: new Date('2024-05-08'),
    },
    {
        merchantKey: 'paypal-12.49',
        merchant: 'PayPal ($12.49)',
        latestAmount: 12.49,
        frequency: 'Monthly',
        count: 4,
        allTransactions: mockTransactions.filter(t => t.description.includes('MERCHANT2')),
        nextDate: new Date('2024-05-12'),
    },
    {
        merchantKey: 'paypal-21.46',
        merchant: 'PayPal ($21.46)',
        latestAmount: 21.46,
        frequency: 'Monthly',
        count: 4,
        allTransactions: mockTransactions.filter(t => t.description.includes('MERCHANT3')),
        nextDate: new Date('2024-05-15'),
    },
];

// Empty state for testing initial state
export const emptyState = {
    transactions: [],
    approvedItems: [],
    deniedItems: [],
    manualRecurring: [],
    mergedSubscriptions: {},
    splitSubscriptions: {},
    chargeAssignments: {},
    globalRenames: {},
};

// Pre-populated state for merge/split tests
export const testState = {
    transactions: mockTransactions,
    approvedItems: ['netflix', 'spotify', 'paypal-25.98', 'paypal-12.49', 'paypal-21.46'],
    deniedItems: [],
    manualRecurring: [],
    mergedSubscriptions: {},
    splitSubscriptions: {},
    chargeAssignments: {},
    globalRenames: {},
};
