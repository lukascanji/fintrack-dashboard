/**
 * CSV Subscription Parser
 * Parses calendar-style subscription CSVs into structured data
 * Format: Service,Affiliation,Day,Jan,Feb,Mar,...
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse day string to numeric day of month
 * Handles: "1st", "2nd", "3rd", "4th", "End", etc.
 */
export function parseBillingDay(dayStr) {
    if (!dayStr || typeof dayStr !== 'string') return null;

    const normalized = dayStr.trim().toLowerCase();

    if (normalized === 'end') return 31; // End of month

    // Extract number from "1st", "2nd", "3rd", "4th", etc.
    const match = normalized.match(/^(\d+)/);
    if (match) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= 31) return day;
    }

    return null;
}

/**
 * Parse price string to number
 * Handles: "$10.99", "10.99", "-", empty
 */
export function parsePrice(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return null;

    const trimmed = priceStr.trim();
    if (trimmed === '-' || trimmed === '') return null; // Inactive/no charge

    // Remove $ and parse
    const cleaned = trimmed.replace(/[$,]/g, '');
    const amount = parseFloat(cleaned);

    return isNaN(amount) ? null : amount;
}

/**
 * Parse a calendar-style subscription CSV
 * @param {string} csvText - Raw CSV content
 * @param {number} [year] - Year to use for dates (defaults to current year)
 * @returns {Object} { subscriptions: [], errors: [] }
 */
export function parseSubscriptionCSV(csvText, year = null) {
    const currentYear = year || new Date().getFullYear();
    const lines = csvText.trim().split('\n').map(line =>
        line.split(',').map(cell => cell.trim())
    );

    if (lines.length < 2) {
        return { subscriptions: [], errors: ['CSV must have at least a header row and one data row'] };
    }

    const header = lines[0];
    const errors = [];
    const subscriptions = [];

    // Detect month columns (find which header columns are month names)
    const monthColumns = {};
    header.forEach((col, idx) => {
        const monthIndex = MONTHS.findIndex(m =>
            col.toLowerCase().startsWith(m.toLowerCase())
        );
        if (monthIndex !== -1) {
            monthColumns[monthIndex] = idx;
        }
    });

    // Find key columns
    const serviceCol = header.findIndex(h =>
        h.toLowerCase() === 'service' || h.toLowerCase() === 'name'
    );
    const affiliationCol = header.findIndex(h =>
        h.toLowerCase() === 'affiliation' || h.toLowerCase() === 'vendor' || h.toLowerCase() === 'merchant'
    );
    const dayCol = header.findIndex(h =>
        h.toLowerCase() === 'day' || h.toLowerCase() === 'billing day'
    );
    const yearCol = header.findIndex(h =>
        h.toLowerCase() === 'year'
    );

    if (serviceCol === -1) {
        errors.push('Missing "Service" column in CSV');
        return { subscriptions, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const serviceName = row[serviceCol];

        // Skip empty rows or TOTAL row
        if (!serviceName || serviceName.toLowerCase() === 'total') continue;

        const affiliation = affiliationCol !== -1 ? row[affiliationCol] : null;
        const billingDay = dayCol !== -1 ? parseBillingDay(row[dayCol]) : null;
        const rowYear = yearCol !== -1 && row[yearCol] ? parseInt(row[yearCol], 10) : currentYear;

        // Parse price history from month columns
        const priceHistory = [];
        Object.entries(monthColumns).forEach(([monthIndex, colIndex]) => {
            const amount = parsePrice(row[colIndex]);
            if (amount !== null) {
                priceHistory.push({
                    month: parseInt(monthIndex, 10),
                    year: rowYear,
                    amount
                });
            }
        });

        if (priceHistory.length === 0) {
            errors.push(`Row ${i + 1} (${serviceName}): No valid prices found`);
            continue;
        }

        subscriptions.push({
            serviceName,
            affiliation: affiliation ? affiliation.toUpperCase() : null,
            billingDay,
            priceHistory,
            // Derived: unique amounts for matching
            uniqueAmounts: [...new Set(priceHistory.map(p => p.amount))],
            // Derived: date range
            firstMonth: Math.min(...priceHistory.map(p => p.month)),
            lastMonth: Math.max(...priceHistory.map(p => p.month)),
            year: rowYear
        });
    }

    return { subscriptions, errors };
}

/**
 * Group parsed subscriptions by affiliation
 */
export function groupByAffiliation(subscriptions) {
    const groups = {};
    subscriptions.forEach(sub => {
        const key = sub.affiliation || 'UNKNOWN';
        if (!groups[key]) groups[key] = [];
        groups[key].push(sub);
    });
    return groups;
}
