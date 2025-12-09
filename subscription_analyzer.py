import pandas as pd
from datetime import timedelta
import glob
import os

def analyze_subscriptions(file_pattern):
    try:
        # Load all files matching pattern
        files = glob.glob(file_pattern)
        if not files:
            print(f"No files found matching {file_pattern}")
            return
        
        print(f"Found {len(files)} files: {files}")

        all_dfs = []
        for f in files:
            try:
                # Basic check to avoid reading non-data files if any, though extension helps.
                # Assuming similar structure
                df = pd.read_csv(f, header=None, names=['Date', 'Description', 'Debit', 'Credit', 'Balance'])
                df['Source'] = os.path.basename(f)
                
                # Parse date immediately per file to handle different formats
                # CC files are MM/DD/YYYY, Chequing is YYYY-MM-DD
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
                
                # Check validity
                valid_rows = df['Date'].notna().sum()
                print(f"Loaded {f}: {len(df)} rows ({valid_rows} valid dates)")
                
                if valid_rows < len(df) * 0.8: # Warning if extensive failure
                    print(f"WARNING: High date parsing failure in {f}. First 3 rows: {df[['Date', 'Description']].head(3).values}")
                
                all_dfs.append(df)
            except Exception as e:
                print(f"Skipping {f}: {e}")
        
        if not all_dfs:
            return

        df = pd.concat(all_dfs, ignore_index=True)
        print(f"Total rows after concat: {len(df)}")
        
        # Drop invalid dates (already coerced)
        param_rows = len(df)
        df = df.dropna(subset=['Date']) 
        print(f"Final valid rows: {len(df)} (Dropped {param_rows - len(df)})")
        
        # Sort by Date
        df = df.sort_values(by='Date')
        
        # Fill NaN in Debit with 0 just in case
        df['Debit'] = pd.to_numeric(df['Debit'], errors='coerce').fillna(0)
        
        # Filter for recurring identifiable descriptions
        # We look for simple subscriptions: same description, same repeating patterns.
        # Clean description
        df['Description'] = df['Description'].astype(str).str.strip()
        
        # Group by Description
        subscriptions = []
        
        # Group by Description AND Amount to separate different subscriptions from same vendor
        # (e.g. Apple One vs Apple Music, or different Amazon channels)
        
        # Round Debit to 2 decimals to be safe
        df['Debit'] = df['Debit'].round(2)
        
        subscriptions = []
        
        # We process unique (Description, Amount) pairs
        # But we also want to catch things that might slightly vary in price if we wanted to be fancy.
        # For now, exact amount matching is safer for "subscriptions" which usually have fixed pricing.
        # Exceptions: Uber (usage based), Utilities. But user asked for "subscriptions" which implies fixed.
        
        grouped = df.groupby(['Description', 'Debit'])
        print(f"Processing {len(grouped)} groups...")
        
        for (desc, amount), group in grouped:
            # We are only interested in Debits (money leaving account)
            # Filter where Debit > 0.
            if amount <= 0:
                continue
            
            if len(group) < 2:
                continue
                
            # Sort by date
            group = group.sort_values(by='Date')
            
            # Calculate time differences
            time_diffs = group['Date'].diff().dropna()
            
            if len(time_diffs) == 0:
                continue
                
            mean_diff = time_diffs.mean()
            std_diff = time_diffs.std()
            
            if pd.isna(std_diff):
                std_diff_days = 0
            else:
                std_diff_days = std_diff.days
            
            is_subscription = False
            period = "Unknown"
            days_avg = mean_diff.days
            
            # Looser check for "Monthly" if amount is exact match
            # Allow some jitter in dates (e.g. weekends)
            if std_diff_days < 10: 
                if 25 <= days_avg <= 35:
                    is_subscription = True
                    period = "Monthly"
                elif 350 <= days_avg <= 380:
                    is_subscription = True
                    period = "Yearly"
                elif 6 <= days_avg <= 8:
                    is_subscription = True
                    period = "Weekly"
                elif 13 <= days_avg <= 15:
                    is_subscription = True
                    period = "Bi-Weekly"

            if is_subscription:
                last_date = group['Date'].iloc[-1]
                
                # Calculate next renewal
                if period == "Monthly":
                    next_date = last_date + timedelta(days=30)
                elif period == "Yearly":
                    next_date = last_date + timedelta(days=365)
                elif period == "Weekly":
                    next_date = last_date + timedelta(days=7)
                elif period == "Bi-Weekly":
                    next_date = last_date + timedelta(days=14)
                else:
                    next_date = last_date + timedelta(days=int(days_avg))

                total_spent = group['Debit'].sum()
                
                # Format for display
                history_str = ", ".join([d.strftime('%Y-%m-%d') for d in group['Date'].tolist()])
                
                subscriptions.append({
                    'Name': desc,
                    'Frequency': period,
                    'First Renewal': group['Date'].iloc[0],
                    'Last Renewal': last_date,
                    'Next Renewal': next_date,
                    'Amount (Latest)': amount,
                    'Total Spent': total_spent,
                    'Count': len(group),
                    'History': history_str
                })

        # Convert to DataFrame for nice printing
        sub_df = pd.DataFrame(subscriptions)
        if not sub_df.empty:
            sub_df = sub_df.sort_values(by='Next Renewal')
            
            print(f"{'SUBSCRIPTION NAME':<30} | {'FREQ':<10} | {'NEXT RENEWAL':<12} | {'LATEST $':<10} | {'TOTAL $':<10} | {'COUNT':<5} | {'SINCE':<12}")
            print("-" * 110)
            for _, row in sub_df.iterrows():
                print(f"{row['Name'][:28]:<30} | {row['Frequency']:<10} | {row['Next Renewal'].strftime('%Y-%m-%d'):<12} | ${row['Amount (Latest)']:<9.2f} | ${row['Total Spent']:<9.2f} | {row['Count']:<5} | {row['First Renewal'].strftime('%Y-%m-%d'):<12}")
                
            print("\nDetailed History (First & Last 3 dates):")
            for _, row in sub_df.iterrows():
                 dates = row['History'].split(', ')
                 history_view = f"{dates[0]} ... {', '.join(dates[-3:])}"
                 print(f"{row['Name']} (${row['Amount (Latest)']}): {history_view}")
        else:
            print("No subscriptions found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Analyze all CSVs in current directory (chequing + credit cards)
    analyze_subscriptions('*.csv')
