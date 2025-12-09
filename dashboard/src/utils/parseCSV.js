import Papa from 'papaparse';
import { categorizeMerchant } from './categorize';

// Generate a unique hash for duplicate detection
function generateTransactionHash(dateStr, description, debit, credit) {
    const content = `${dateStr}|${description}|${debit.toFixed(2)}|${credit.toFixed(2)}`;
    // Simple hash using btoa (base64) - sufficient for deduplication
    return btoa(unescape(encodeURIComponent(content)));
}

// Detect account type from filename or content
function detectAccountType(filename, transactions) {
    const nameLower = (filename || '').toLowerCase();

    // Check filename first
    if (nameLower.includes('chequing') || nameLower.includes('debit') || nameLower.includes('checking')) {
        return 'Chequing';
    }
    if (nameLower.includes('credit')) {
        return 'Credit Card';
    }

    // Content-based fallback: analyze transaction descriptions
    const descriptions = transactions.map(t => (t.description || '').toUpperCase()).join(' ');

    // Credit card indicators
    if (descriptions.includes('INTEREST CHARGE') ||
        descriptions.includes('CASH ADVANCE') ||
        descriptions.includes('MINIMUM PAYMENT')) {
        return 'Credit Card';
    }

    // Chequing indicators
    if (descriptions.includes('TD ATM') ||
        descriptions.includes('MONTHLY ACCOUNT FEE') ||
        descriptions.includes('PAYROLL') ||
        descriptions.includes('DIRECT DEPOSIT')) {
        return 'Chequing';
    }

    // Default based on credit/debit ratio (chequing has more credits from income)
    const credits = transactions.filter(t => t.credit > 0).length;
    const debits = transactions.filter(t => t.debit > 0).length;
    if (credits > debits * 0.3) {
        return 'Chequing'; // Significant credits suggest income deposits
    }

    return 'Credit Card'; // Default assumption
}

// Preview CSV file - returns raw rows and column detection info
export function previewCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            preview: 10, // Only parse first 10 rows for preview
            complete: (results) => {
                try {
                    const rows = results.data.filter(row => row.length >= 3);
                    if (rows.length === 0) {
                        reject(new Error(`No data found in ${file.name}`));
                        return;
                    }

                    // Try to detect if first row is header
                    const firstRow = rows[0];
                    const hasHeader = firstRow.some(cell =>
                        /date|description|amount|debit|credit|memo|balance/i.test(cell)
                    );

                    // Detect column meanings
                    const columns = firstRow.map((cell, i) => {
                        const cellLower = (cell || '').toLowerCase();
                        if (/date/.test(cellLower)) return { index: i, type: 'date', name: cell };
                        if (/desc|memo|detail|narration/.test(cellLower)) return { index: i, type: 'description', name: cell };
                        if (/debit|withdrawal|out/.test(cellLower)) return { index: i, type: 'debit', name: cell };
                        if (/credit|deposit|in/.test(cellLower)) return { index: i, type: 'credit', name: cell };
                        if (/balance/.test(cellLower)) return { index: i, type: 'balance', name: cell };
                        if (/amount/.test(cellLower)) return { index: i, type: 'amount', name: cell };
                        return { index: i, type: 'unknown', name: cell || `Column ${i + 1}` };
                    });

                    // Test date parsing on data rows
                    const dataRows = hasHeader ? rows.slice(1) : rows;
                    const dateTests = dataRows.slice(0, 3).map(row => {
                        const potentialDate = row[0];
                        const parsed = parseDate(potentialDate);
                        return {
                            raw: potentialDate,
                            valid: parsed && !isNaN(parsed.getTime()),
                            parsed: parsed ? parsed.toLocaleDateString() : null
                        };
                    });

                    const validDates = dateTests.filter(d => d.valid).length;

                    resolve({
                        filename: file.name,
                        totalRows: results.data.length,
                        previewRows: hasHeader ? rows.slice(1, 6) : rows.slice(0, 5),
                        hasHeader,
                        columns,
                        dateTests,
                        confidence: validDates >= 2 ? 'high' : validDates >= 1 ? 'medium' : 'low',
                        warnings: validDates === 0 ? ['Date column may not be parseable'] : []
                    });
                } catch (error) {
                    reject(error);
                }
            },
            error: (error) => reject(error)
        });
    });
}

export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => {
                try {
                    // Validate CSV structure
                    const validRows = results.data.filter(row => row.length >= 5 && row[0]);
                    if (validRows.length === 0) {
                        reject(new Error(`No valid transaction rows found in ${file.name}. Expected format: Date, Description, Debit, Credit, Balance`));
                        return;
                    }

                    const rawTransactions = validRows
                        .map((row) => {
                            const dateStr = row[0];
                            const description = row[1] || '';
                            const debit = parseFloat(row[2]) || 0;
                            const credit = parseFloat(row[3]) || 0;
                            const balance = parseFloat(row[4]) || 0;

                            // Robust date parsing - try multiple formats
                            let date = parseDate(dateStr);

                            // Skip invalid dates
                            if (!date || isNaN(date.getTime())) return null;

                            return { dateStr, date, description, debit, credit, balance };
                        })
                        .filter(t => t !== null);

                    if (rawTransactions.length === 0) {
                        reject(new Error(`No valid dates found in ${file.name}. Check date format (YYYY-MM-DD or MM/DD/YYYY).`));
                        return;
                    }

                    // Detect account type from content
                    const accountType = detectAccountType(file.name, rawTransactions);

                    // Generate final transactions with hash and categorization
                    const transactions = rawTransactions.map(raw => {
                        const { merchant, category } = categorizeMerchant(raw.description);
                        const hash = generateTransactionHash(raw.dateStr, raw.description, raw.debit, raw.credit);

                        return {
                            id: hash, // Use hash as ID for deduplication
                            hash,
                            date: raw.date,
                            description: raw.description,
                            debit: raw.debit,
                            credit: raw.credit,
                            balance: raw.balance,
                            merchant,
                            category,
                            source: file.name,
                            accountType
                        };
                    });

                    resolve({
                        transactions,
                        stats: {
                            fileName: file.name,
                            totalRows: validRows.length,
                            validTransactions: transactions.length,
                            accountType
                        }
                    });
                } catch (error) {
                    reject(new Error(`Error parsing ${file.name}: ${error.message}`));
                }
            },
            error: (error) => reject(new Error(`Failed to read ${file.name}: ${error.message}`))
        });
    });
}

// Robust date parsing - handles multiple formats
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return new Date(dateStr);
    }

    // Try MM/DD/YYYY or M/D/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [month, day, year] = parts;
            // Handle 2-digit year
            const fullYear = year.length === 2 ? (parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)) : parseInt(year);
            return new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }
    }

    // Fallback to Date.parse
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

export async function parseMultipleCSVs(files, existingIds = new Set(), existingTransactions = []) {
    const allTransactions = [];
    const duplicateDetails = []; // Track duplicates with their matching existing transaction
    const parseStats = {
        filesProcessed: 0,
        totalNew: 0,
        totalDuplicates: 0,
        errors: []
    };

    // Build lookup map for existing transactions
    const existingMap = {};
    existingTransactions.forEach(t => {
        existingMap[t.id] = t;
    });

    // Keep track of IDs we've seen in THIS import batch (separate from existingIds)
    const batchIds = new Set();

    for (const file of files) {
        try {
            const result = await parseCSV(file);

            // Filter out duplicates - only against EXISTING data, not within current batch
            let newCount = 0;
            let dupCount = 0;

            result.transactions.forEach(t => {
                // Only count as duplicate if it exists in PREVIOUSLY loaded data
                if (existingIds.has(t.id)) {
                    dupCount++;
                    // Store duplicate details for preview
                    duplicateDetails.push({
                        incoming: t,
                        existing: existingMap[t.id] || null
                    });
                } else if (!batchIds.has(t.id)) {
                    // New transaction - add to batch and results
                    allTransactions.push(t);
                    batchIds.add(t.id);
                    newCount++;
                }
                // If in batchIds but not existingIds, it's an in-file duplicate - still import first occurrence
            });

            parseStats.filesProcessed++;
            parseStats.totalNew += newCount;
            parseStats.totalDuplicates += dupCount;

        } catch (error) {
            parseStats.errors.push(error.message);
        }
    }

    // Sort by date
    allTransactions.sort((a, b) => a.date - b.date);

    return { transactions: allTransactions, stats: parseStats, duplicateDetails };
}

// detectSubscriptions removed
