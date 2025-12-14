import { describe, it, expect, beforeEach } from 'vitest';
import {
    categorizeMerchant,
    getMerchantKey,
    saveCategoryRule,
    getUserCategoryRules,
    getCategoryColor
} from '../../utils/categorize';

describe('getMerchantKey', () => {
    it('returns first 8 chars uppercase without special chars', () => {
        // NETFLIX.COM -> NETFLIXCOM (remove .), take first 8 = NETFLIXC
        expect(getMerchantKey('NETFLIX.COM')).toBe('NETFLIXC');
    });

    it('strips special characters', () => {
        expect(getMerchantKey('PAYPAL *MERCHANT123')).toBe('PAYPALME');
    });

    it('handles numbers in merchant names', () => {
        expect(getMerchantKey('STARBUCKS #12345')).toBe('STARBUCK');
    });

    it('handles multiple words', () => {
        const key = getMerchantKey('UBER EATS');
        expect(key).toBe('UBEREATS');
    });
});

describe('categorizeMerchant', () => {
    beforeEach(() => {
        // Clear user rules before each test
        localStorage.clear();
    });

    it('categorizes Netflix as ENTERTAINMENT', () => {
        const result = categorizeMerchant('NETFLIX.COM');
        expect(result.category).toBe('ENTERTAINMENT');
        expect(result.merchant).toContain('NETFLIX');
    });

    it('categorizes Starbucks as DINING', () => {
        const result = categorizeMerchant('STARBUCKS #1234');
        expect(result.category).toBe('DINING');
    });

    it('categorizes UBER EATS as DINING, not TRANSPORTATION', () => {
        const result = categorizeMerchant('UBER EATS ORDER');
        expect(result.category).toBe('DINING');
    });

    it('categorizes UBER TRIP as TRANSPORTATION', () => {
        const result = categorizeMerchant('UBER *TRIP');
        expect(result.category).toBe('TRANSPORTATION');
    });

    it('categorizes unknown merchant as OTHER', () => {
        const result = categorizeMerchant('RANDOM_UNKNOWN_MERCHANT_XYZ');
        expect(result.category).toBe('OTHER');
    });

    it('categorizes e-transfers as TRANSFER', () => {
        const result = categorizeMerchant('E-TRANSFER FROM MOM');
        expect(result.category).toBe('TRANSFER');
    });

    it('categorizes ChatGPT as ENTERTAINMENT', () => {
        const result = categorizeMerchant('CHATGPT SUBSCRIPTION');
        expect(result.category).toBe('ENTERTAINMENT');
    });

    it('categorizes bank fees as FEES', () => {
        const result = categorizeMerchant('MONTHLY ACCOUNT FEE');
        expect(result.category).toBe('FEES');
    });

    it('categorizes PayPal as TRANSFER', () => {
        const result = categorizeMerchant('PAYPAL *MERCHANT');
        expect(result.category).toBe('TRANSFER');
    });
});

describe('User category rules', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('user rules override hardcoded patterns', () => {
        // Netflix is normally ENTERTAINMENT
        const before = categorizeMerchant('NETFLIX.COM');
        expect(before.category).toBe('ENTERTAINMENT');

        // Add user rule to override
        saveCategoryRule('NETFLIX', 'Custom Netflix', 'SHOPPING');

        // Now should be SHOPPING
        const after = categorizeMerchant('NETFLIX.COM');
        expect(after.category).toBe('SHOPPING');
    });

    it('saves and retrieves rules from localStorage', () => {
        saveCategoryRule('TESTMERCHANT', 'Test Merchant', 'DINING');
        const rules = getUserCategoryRules();
        expect(rules.find(r => r.pattern === 'TESTMERCHANT')).toBeTruthy();
    });
});

describe('getCategoryColor', () => {
    it('returns a color for known categories', () => {
        expect(getCategoryColor('DINING')).toBeTruthy();
        expect(getCategoryColor('ENTERTAINMENT')).toBeTruthy();
        expect(getCategoryColor('TRANSPORTATION')).toBeTruthy();
    });

    it('returns a default color for unknown categories', () => {
        expect(getCategoryColor('UNKNOWN_CATEGORY')).toBeTruthy();
    });
});
