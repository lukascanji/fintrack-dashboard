import pandas as pd
import re
import glob
import os

def analyze_transactions(file_pattern):
    try:
        # Load Data from all files
        files = glob.glob(file_pattern)
        if not files:
            print(f"No files found matching {file_pattern}")
            return

        all_dfs = []
        for f in files:
            try:
                df = pd.read_csv(f, header=None, names=['Date', 'Description', 'Debit', 'Credit', 'Balance'])
                df['Source'] = os.path.basename(f)
                
                # Parse date inside loop
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
                
                all_dfs.append(df)
            except Exception as e:
                print(f"Skipping {f}: {e}")
        
        if not all_dfs:
            return

        df = pd.concat(all_dfs, ignore_index=True)
        df = df.dropna(subset=['Date'])
        df = df.sort_values(by='Date')
        
        # Clean numeric columns
        df['Debit'] = pd.to_numeric(df['Debit'], errors='coerce').fillna(0)
        df['Credit'] = pd.to_numeric(df['Credit'], errors='coerce').fillna(0)
        
        # 1. Cash Flow Analysis (Monthly)
        df['Month'] = df['Date'].dt.to_period('M')
        monthly = df.groupby('Month')[['Credit', 'Debit']].sum()
        monthly['Net'] = monthly['Credit'] - monthly['Debit']
        
        print(f"{'MONTH':<10} | {'INCOME':<12} | {'EXPENSES':<12} | {'NET FLOW':<12}")
        print("-" * 55)
        for period, row in monthly.iterrows():
            print(f"{str(period):<10} | ${row['Credit']:<11.2f} | ${row['Debit']:<11.2f} | ${row['Net']:<11.2f}")
            
        print("-" * 55)
        print(f"{'TOTAL':<10} | ${monthly['Credit'].sum():<11.2f} | ${monthly['Debit'].sum():<11.2f} | ${monthly['Net'].sum():<11.2f}")
        print(f"Avg Monthly Expense: ${monthly['Debit'].mean():.2f}")
        print("\n")

        # 2. Merchant Analysis
        def clean_merchant(desc):
            desc = str(desc).upper()
            # Remove common suffixes/prefixes
            desc = re.sub(r'\s+_(V|M|F|T)$', '', desc) # _V, _M, _F etc
            desc = re.sub(r'\s+MSP$', '', desc) # MSP
            desc = re.sub(r'Purchase \d+', '', desc)
            desc = re.sub(r'\d{3,}$', '', desc) # Trailing numbers
            desc = re.sub(r'\*', ' ', desc)
            desc = re.sub(r'\s\s+', ' ', desc).strip()
            
            # Group common ones
            if 'AMAZON' in desc or 'AMZN' in desc: return 'AMAZON'
            if 'APPLE.COM' in desc: return 'APPLE'
            if 'UBER' in desc: return 'UBER'
            if 'TIM HORTONS' in desc: return 'TIM HORTONS'
            if 'MCDONALD' in desc: return 'MCDONALDS'
            if 'STARBUCKS' in desc: return 'STARBUCKS'
            if 'DAIRY QUEEN' in desc: return 'DAIRY QUEEN'
            if 'SUBWAY' in desc: return 'SUBWAY'
            if 'LITTLE CAESARS' in desc: return 'LITTLE CAESARS'
            if 'METRO' in desc: return 'METRO'
            if 'SOBEYS' in desc: return 'SOBEYS'
            if 'ZEHRS' in desc: return 'ZEHRS'
            if 'COSTCO' in desc: return 'COSTCO'
            if 'PAYPAL' in desc: return 'PAYPAL'
            if 'E-TRANSFER' in desc or 'E-TFR' in desc: return 'E-TRANSFER'
            if 'TD ATM' in desc: return 'CASH WITHDRAWAL'
            if 'TD VISA' in desc or 'PAYMENT - THANK YOU' in desc: return 'CREDIT CARD PAYMENT'
            if 'MONTHLY ACCOUNT FEE' in desc: return 'BANK FEES'
            # New categories
            if 'THESCORE' in desc: return 'THESCORE (GAMBLING)'
            if 'OPENAI' in desc or 'CHATGPT' in desc: return 'OPENAI CHATGPT'
            if 'YOUTUBE' in desc or 'GOOGLE YOUTUBEPREMIUM' in desc: return 'YOUTUBE PREMIUM'
            if 'CASH ADV' in desc or 'CASH ADVANCE' in desc: return 'CASH ADVANCE FEE'
            if 'INTEREST CHARGE' in desc: return 'INTEREST CHARGE'
            if 'STARLINK' in desc: return 'STARLINK'
            if 'CODECADEMY' in desc: return 'CODECADEMY'
            
            return desc

        df['Merchant'] = df['Description'].apply(clean_merchant)
        
        # Filter out transfers and payments for spending analysis
        spending_df = df[~df['Merchant'].isin(['E-TRANSFER', 'CREDIT CARD PAYMENT', 'CASH WITHDRAWAL'])]
        spending_df = spending_df[spending_df['Debit'] > 0]
        
        merchant_stats = spending_df.groupby('Merchant')['Debit'].agg(['sum', 'count']).reset_index()
        merchant_stats = merchant_stats.sort_values(by='sum', ascending=False)
        
        print("TOP 20 MERCHANTS BY SPEND (Excl. Transfers/CC Payments)")
        print(f"{'MERCHANT':<30} | {'TOTAL SPEND':<12} | {'COUNT':<5} | {'AVG TXN':<10}")
        print("-" * 65)
        for _, row in merchant_stats.head(20).iterrows():
            avg = row['sum'] / row['count']
            print(f"{row['Merchant'][:28]:<30} | ${row['sum']:<11.2f} | {row['count']:<5} | ${avg:<9.2f}")
            
        print("\n")
        
        # 3. Category Inference (Simple heuristics)
        def categorize(row):
            m = row['Merchant']
            if m in ['METRO', 'SOBEYS', 'ZEHRS', 'COSTCO', 'FARM BOY', 'FOOD BASICS', 'NOFRILLS', 'MARKET']: return 'GROCERIES'
            if m in ['UBER', 'MCDONALDS', 'TIM HORTONS', 'STARBUCKS', 'DAIRY QUEEN', 'SUBWAY', 'LITTLE CAESARS', 'PIZZA', 'BURGER KING', 'WENDY\'S']: return 'DINING/TAKEOUT'
            if m in ['AMAZON', 'APPLE', 'PAYPAL']: return 'SHOPPING/SERVICES'
            if m in ['STARLINK'] or 'ROGERS' in m or 'BELL' in m or 'HYDRO' in m: return 'UTILITIES'
            if 'BANK FEES' in m or 'CASH ADVANCE FEE' in m or 'INTEREST CHARGE' in m: return 'FEES/INTEREST'
            if 'THESCORE' in m: return 'GAMBLING'
            if m in ['OPENAI CHATGPT', 'YOUTUBE PREMIUM', 'CODECADEMY']: return 'AI/SUBSCRIPTIONS'
            return 'OTHER'
            
        spending_df['Category'] = spending_df.apply(categorize, axis=1)
        cat_stats = spending_df.groupby('Category')['Debit'].sum().reset_index().sort_values(by='Debit', ascending=False)
        
        print("SPENDING BY CATEGORY (Est.)")
        print(f"{'CATEGORY':<20} | {'TOTAL':<12} | {'% OF SPEND'}")
        print("-" * 50)
        total_spend = spending_df['Debit'].sum()
        for _, row in cat_stats.iterrows():
            pct = (row['Debit'] / total_spend) * 100
            print(f"{row['Category']:<20} | ${row['Debit']:<11.2f} | {pct:.1f}%")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_transactions('*.csv')
