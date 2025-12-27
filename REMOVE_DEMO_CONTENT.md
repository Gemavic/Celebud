# Remove Demo Content

To remove all demo/sample content from your database:

1. **Go to your Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard
   - Navigate to your project
   - Click on "SQL Editor" in the left sidebar

2. **Create a new query**:
   - Click "+ New Query"

3. **Copy and paste the SQL** from:
   `supabase/migrations/20251227000001_remove_demo_content.sql`

4. **Run the query**:
   - Click the "Run" button (or press Cmd/Ctrl + Enter)

5. **Verify success**:
   - All demo articles will be removed
   - Your database will be clean and ready for real content

## What Gets Removed

- All 6 sample articles that were part of the initial seed data
- Demo content including:
  - "Behind the Scenes: Making of the Year's Biggest Blockbuster"
  - "Tech Billionaire Reveals Secrets to Success in Candid Interview"
  - "Chart-Topping Artist Drops Surprise Album: Our First Listen"
  - "Celebrity Power Couple Announces New Business Venture"
  - "Streaming Wars: How New Players Are Reshaping Entertainment"
  - "Red Carpet Rewind: Fashion Highlights from Last Night's Awards"

## What Is Preserved

- Categories (Video, Audio, Interview, Celebrity, Business, Entertainment)
- Authors (Matthew Ayandare, Gbenga Ayandare, Victoria Odunola)
- Tags (for future use)
- All database structure and security policies
