// Merchant categorization logic with consolidated categories
// Categories: ENTERTAINMENT, DINING, GROCERIES, SHOPPING, UTILITIES, GAMBLING, FEES, INCOME, TRANSFER, TRANSPORTATION, OTHER

const CATEGORY_RULES_KEY = 'fintrack_category_rules';

// Get user-defined category rules from localStorage
export function getUserCategoryRules() {
    try {
        const saved = localStorage.getItem(CATEGORY_RULES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

// Save a new category rule
export function saveCategoryRule(pattern, merchant, category) {
    const rules = getUserCategoryRules();
    // Remove existing rule for same pattern if exists
    const filtered = rules.filter(r => r.pattern.toUpperCase() !== pattern.toUpperCase());
    filtered.push({ pattern: pattern.toUpperCase(), merchant, category });
    localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(filtered));
}

// Remove a category rule
export function removeCategoryRule(pattern) {
    const rules = getUserCategoryRules();
    const filtered = rules.filter(r => r.pattern.toUpperCase() !== pattern.toUpperCase());
    localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(filtered));
}

// Normalize merchant name for fuzzy matching
export function normalizeMerchant(description) {
    return (description || '')
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '') // Remove numbers and special chars
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20); // First 20 chars for matching
}

// Get short key for fuzzy subscription matching (first 8 chars after normalization)
export function getMerchantKey(description) {
    return normalizeMerchant(description).replace(/\s/g, '').slice(0, 8);
}

export function categorizeMerchant(description) {
    const desc = (description || '').toUpperCase();

    // === CHECK USER-DEFINED RULES FIRST ===
    const userRules = getUserCategoryRules();
    for (const rule of userRules) {
        if (desc.includes(rule.pattern)) {
            return { merchant: rule.merchant, category: rule.category };
        }
    }

    // Clean description for display
    let cleaned = desc
        .replace(/\s+_(V|M|F|T)$/g, '')
        .replace(/\s+MSP$/g, '')
        .replace(/Purchase \d+/gi, '')
        .replace(/\d{3,}$/g, '')
        .replace(/\*/g, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();

    // === TRANSFERS (e-transfers, Interac) ===
    if (desc.includes('INTERAC') || desc.includes('E-TRANSFER') || desc.includes('ETRANSFER') ||
        desc.includes('E TFR') || desc.includes('SEND MONEY') || desc.includes('E-TFR')) {
        return { merchant: 'E-TRANSFER', category: 'TRANSFER' };
    }

    // === ENTERTAINMENT (streaming, digital services) ===
    if (desc.includes('OPENAI') || desc.includes('CHATGPT')) return { merchant: 'OPENAI CHATGPT', category: 'ENTERTAINMENT' };
    if (desc.includes('YOUTUBE') || desc.includes('GOOGLE YOUTUBEPREMIUM')) return { merchant: 'YOUTUBE PREMIUM', category: 'ENTERTAINMENT' };
    if (desc.includes('NETFLIX')) return { merchant: 'NETFLIX', category: 'ENTERTAINMENT' };
    if (desc.includes('SPOTIFY')) return { merchant: 'SPOTIFY', category: 'ENTERTAINMENT' };
    if (desc.includes('DISNEY')) return { merchant: 'DISNEY+', category: 'ENTERTAINMENT' };
    if (desc.includes('APPLE.COM') || desc.includes('APPLE MUSIC')) return { merchant: 'APPLE', category: 'ENTERTAINMENT' };
    if (desc.includes('AMAZON PRIME')) return { merchant: 'AMAZON PRIME', category: 'ENTERTAINMENT' };
    if (desc.includes('CODECADEMY')) return { merchant: 'CODECADEMY', category: 'ENTERTAINMENT' };
    if (desc.includes('GITHUB')) return { merchant: 'GITHUB', category: 'ENTERTAINMENT' };
    if (desc.includes('MICROSOFT') && (desc.includes('365') || desc.includes('SUBSCRIPTION'))) return { merchant: 'MICROSOFT 365', category: 'ENTERTAINMENT' };

    // === UTILITIES ===
    if (desc.includes('STARLINK')) return { merchant: 'STARLINK', category: 'UTILITIES' };
    if (desc.includes('HYDRO') || desc.includes('ELECTRIC')) return { merchant: 'HYDRO', category: 'UTILITIES' };
    if (desc.includes('ENBRIDGE') || desc.includes('GAS BILL')) return { merchant: 'GAS', category: 'UTILITIES' };
    if (desc.includes('ROGERS') || desc.includes('BELL') || desc.includes('TELUS')) return { merchant: 'PHONE/INTERNET', category: 'UTILITIES' };

    // === DINING ===
    if (desc.includes('UBER EATS') || desc.includes('UBEREATS')) return { merchant: 'UBER EATS', category: 'DINING' };
    if (desc.includes('DOORDASH')) return { merchant: 'DOORDASH', category: 'DINING' };
    if (desc.includes('SKIP THE DISHES') || desc.includes('SKIPTHEDISHES')) return { merchant: 'SKIP THE DISHES', category: 'DINING' };
    if (desc.includes('TIM HORTONS') || desc.includes('TIM HORTON')) return { merchant: 'TIM HORTONS', category: 'DINING' };
    if (desc.includes('MCDONALD')) return { merchant: 'MCDONALDS', category: 'DINING' };
    if (desc.includes('STARBUCKS')) return { merchant: 'STARBUCKS', category: 'DINING' };
    if (desc.includes('DAIRY QUEEN')) return { merchant: 'DAIRY QUEEN', category: 'DINING' };
    if (desc.includes('SUBWAY')) return { merchant: 'SUBWAY', category: 'DINING' };
    if (desc.includes('LITTLE CAESARS')) return { merchant: 'LITTLE CAESARS', category: 'DINING' };
    if (desc.includes('WENDYS') || desc.includes("WENDY'S")) return { merchant: 'WENDYS', category: 'DINING' };
    if (desc.includes('BURGER KING')) return { merchant: 'BURGER KING', category: 'DINING' };
    if (desc.includes('POPEYES')) return { merchant: 'POPEYES', category: 'DINING' };
    if (desc.includes('CHIPOTLE')) return { merchant: 'CHIPOTLE', category: 'DINING' };
    if (desc.includes('PIZZA')) return { merchant: 'PIZZA', category: 'DINING' };
    if (desc.includes('RESTAURANT') || desc.includes('CAFE') || desc.includes('BISTRO')) return { merchant: cleaned, category: 'DINING' };

    // === GROCERIES ===
    if (desc.includes('METRO')) return { merchant: 'METRO', category: 'GROCERIES' };
    if (desc.includes('SOBEYS')) return { merchant: 'SOBEYS', category: 'GROCERIES' };
    if (desc.includes('ZEHRS')) return { merchant: 'ZEHRS', category: 'GROCERIES' };
    if (desc.includes('COSTCO')) return { merchant: 'COSTCO', category: 'GROCERIES' };
    if (desc.includes('WALMART')) return { merchant: 'WALMART', category: 'GROCERIES' };
    if (desc.includes('LOBLAWS') || desc.includes('LOBLAW')) return { merchant: 'LOBLAWS', category: 'GROCERIES' };
    if (desc.includes('NO FRILLS') || desc.includes('NOFRILLS')) return { merchant: 'NO FRILLS', category: 'GROCERIES' };
    if (desc.includes('FOOD BASICS')) return { merchant: 'FOOD BASICS', category: 'GROCERIES' };
    if (desc.includes('FRESHCO')) return { merchant: 'FRESHCO', category: 'GROCERIES' };

    // === SHOPPING ===
    if (desc.includes('AMAZON') || desc.includes('AMZN')) return { merchant: 'AMAZON', category: 'SHOPPING' };
    if (desc.includes('BEST BUY')) return { merchant: 'BEST BUY', category: 'SHOPPING' };
    if (desc.includes('CANADIAN TIRE')) return { merchant: 'CANADIAN TIRE', category: 'SHOPPING' };
    if (desc.includes('HOME DEPOT')) return { merchant: 'HOME DEPOT', category: 'SHOPPING' };
    if (desc.includes('IKEA')) return { merchant: 'IKEA', category: 'SHOPPING' };

    // === GAMBLING ===
    if (desc.includes('THESCORE') || desc.includes('THE SCORE')) return { merchant: 'THESCORE', category: 'GAMBLING' };
    if (desc.includes('BET365')) return { merchant: 'BET365', category: 'GAMBLING' };
    if (desc.includes('DRAFTKINGS')) return { merchant: 'DRAFTKINGS', category: 'GAMBLING' };
    if (desc.includes('FANDUEL')) return { merchant: 'FANDUEL', category: 'GAMBLING' };
    if (desc.includes('CASINO') || desc.includes('SLOTS') || desc.includes('POKER')) return { merchant: cleaned, category: 'GAMBLING' };

    // === FEES ===
    if (desc.includes('MONTHLY ACCOUNT FEE') || desc.includes('SERVICE FEE')) return { merchant: 'BANK FEE', category: 'FEES' };
    if (desc.includes('CASH ADV') || desc.includes('CASH ADVANCE')) return { merchant: 'CASH ADVANCE FEE', category: 'FEES' };
    if (desc.includes('INTEREST CHARGE') || desc.includes('INTEREST CHG')) return { merchant: 'INTEREST CHARGE', category: 'FEES' };
    if (desc.includes('NSF') || desc.includes('OVERDRAFT')) return { merchant: 'OVERDRAFT FEE', category: 'FEES' };
    if (desc.includes('ANNUAL FEE')) return { merchant: 'ANNUAL FEE', category: 'FEES' };

    // === TRANSFER (internal movements) ===
    if (desc.includes('E-TRANSFER') || desc.includes('E-TFR') || desc.includes('INTERAC')) return { merchant: 'E-TRANSFER', category: 'TRANSFER' };
    if (desc.includes('TD ATM') || desc.includes('ATM WITHDRAWAL')) return { merchant: 'CASH WITHDRAWAL', category: 'TRANSFER' };
    if (desc.includes('TD VISA') || desc.includes('PAYMENT - THANK YOU') || desc.includes('PAYMENT RECEIVED')) return { merchant: 'CC PAYMENT', category: 'TRANSFER' };
    if (desc.includes('PAYPAL')) return { merchant: 'PAYPAL', category: 'TRANSFER' };

    // === INCOME (detected from credits, but some descriptions indicate income) ===
    if (desc.includes('PAYROLL') || desc.includes('SALARY') || desc.includes('DIRECT DEPOSIT')) return { merchant: 'PAYROLL', category: 'INCOME' };
    if (desc.includes('TAX REFUND') || desc.includes('CRA')) return { merchant: 'TAX REFUND', category: 'INCOME' };

    // === TRANSPORTATION ===
    // Uber rides (exclude any food-related like UBER EATS, UBEREATS)
    if (desc.includes('UBER') && !desc.includes('EAT')) return { merchant: 'UBER TRIP', category: 'TRANSPORTATION' };
    if (desc.includes('LYFT')) return { merchant: 'LYFT', category: 'TRANSPORTATION' };
    if (desc.includes('GAS STATION') || desc.includes('SHELL') || desc.includes('ESSO') || desc.includes('PETRO') || desc.includes('PIONEER')) return { merchant: 'GAS', category: 'TRANSPORTATION' };

    // Default: OTHER
    return { merchant: cleaned || description, category: 'OTHER' };
}

export const categoryColors = {
    'ENTERTAINMENT': '#a855f7',  // Purple (formerly SUBSCRIPTIONS)
    'DINING': '#ec4899',         // Pink
    'GROCERIES': '#10b981',      // Green
    'SHOPPING': '#6366f1',       // Indigo
    'UTILITIES': '#06b6d4',      // Cyan
    'GAMBLING': '#ef4444',       // Red
    'FEES': '#f59e0b',           // Amber
    'INCOME': '#22c55e',         // Bright Green
    'TRANSFER': '#64748b',       // Slate
    'TRANSPORTATION': '#f97316', // Orange
    'OTHER': '#71717a'           // Gray
};

export function getCategoryColor(category) {
    return categoryColors[category] || categoryColors['OTHER'];
}
