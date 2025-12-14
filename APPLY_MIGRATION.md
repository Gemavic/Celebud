# How to Fix the Missing Editorial Features Table

## The Problem
The `editorial_features` table doesn't exist in your database yet. The migration file exists but hasn't been applied.

## Solution: Apply the Migration via Supabase Dashboard

1. **Go to your Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/bwtrtzvlqvykobmlfjcl
   - Click on "SQL Editor" in the left sidebar

2. **Create a new query**:
   - Click "+ New Query"

3. **Copy and paste the SQL** from the file:
   `supabase/migrations/20251214035239_jolly_palace.sql`

4. **Run the query**:
   - Click the "Run" button (or press Cmd/Ctrl + Enter)

5. **Verify success**:
   - You should see a success message
   - The `editorial_features`, `editorial_actions`, and `editorial_discussions` tables will be created
   - All necessary indexes, functions, and security policies will be set up

## What This Migration Creates

- **editorial_features table**: Manages time-based featured content
- **editorial_actions table**: Audit trail for editorial actions
- **editorial_discussions table**: User discussions on featured content
- **RLS Policies**: Secure access control
- **Helper Functions**: For managing editorial features
- **Indexes**: For optimal query performance

## After Running the Migration

Refresh your application and the error should be resolved. The editorial dashboard will work properly.
