# Database Safety & Monitoring Guide

This guide helps prevent database access issues and ensures your content remains accessible to users.

## What Happened & Why

**The Issue**: Your site showed "No content found" even though 17,000+ articles existed in the database.

**Root Cause**: Row Level Security (RLS) was enabled on the partitioned `media_content` tables, but no policies were configured to allow public access. This created a "locked door with no key" scenario.

## Prevention Systems Now In Place

### 1. Database Health Monitoring

A comprehensive health check system has been deployed:

**Functions Available:**
- `check_rls_policies()` - Validates all tables have proper RLS configuration
- `check_content_accessibility()` - Verifies content is accessible
- `get_health_report()` - Returns complete health status

**Usage:**
```sql
-- Check RLS policies
SELECT * FROM check_rls_policies();

-- Check content accessibility
SELECT * FROM check_content_accessibility();

-- Get full health report
SELECT get_health_report();
```

### 2. Health Check Endpoint

An Edge Function is deployed at:
```
https://your-project.supabase.co/functions/v1/health-check
```

**Test it anytime:**
```bash
curl https://your-project.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Response:**
```json
{
  "status": "HEALTHY" | "UNHEALTHY" | "ERROR",
  "timestamp": "2024-01-09T...",
  "details": {
    "rls_status": [...],
    "content_accessibility": [...],
    "summary": {...}
  }
}
```

### 3. Frontend Error Monitoring

Automatic error detection and logging is now built into all data queries:

- **RLS Policy Errors**: Detected and logged with context
- **Connection Issues**: Identified and reported
- **Query Failures**: Tracked with full details

Errors are logged to:
- Browser console (development)
- Sentry (production)

## Migration Checklist

Use this checklist **EVERY TIME** you modify the database schema:

### Before Migration

- [ ] Review what tables will be affected
- [ ] Check if tables have RLS enabled
- [ ] Plan what policies are needed
- [ ] Test migration in local/dev environment first

### During Migration

- [ ] If enabling RLS, ALWAYS add policies in the same migration
- [ ] Use `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Immediately follow with `CREATE POLICY ...`
- [ ] Never leave RLS enabled without policies

### After Migration

- [ ] Run health check: `SELECT get_health_report();`
- [ ] Verify no CRITICAL issues in RLS status
- [ ] Test content accessibility from frontend
- [ ] Check browser console for errors

### Example Safe Migration Pattern

```sql
-- CORRECT WAY: Enable RLS and add policies together
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON my_table
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- WRONG WAY: Don't do this!
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- Missing policy = locked content!
```

## Common Mistakes to Avoid

### 1. Enabling RLS Without Policies
```sql
-- DON'T DO THIS
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
-- (no policies) = content becomes inaccessible
```

### 2. Forgetting Partitioned Tables
If you have table partitioning, you MUST apply policies to:
- Parent table
- ALL partition tables

```sql
-- Apply to parent AND all partitions
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2025_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2026_01 ENABLE ROW LEVEL SECURITY;

-- Then add policies to each one
```

### 3. Testing Only While Authenticated
Always test as:
- Anonymous user (logged out)
- Authenticated user
- Different user roles

### 4. Not Checking After Deployment
Run health checks after EVERY deployment:
```bash
# Check immediately after deployment
curl https://your-project.supabase.co/functions/v1/health-check
```

## Monitoring Best Practices

### Daily Checks (Automated)

Set up a cron job or monitoring service to:
1. Hit health check endpoint every 15 minutes
2. Alert if status is not "HEALTHY"
3. Log all responses for trend analysis

### Weekly Manual Review

Every week:
1. Review Sentry errors for patterns
2. Check browser console logs
3. Verify content is loading correctly
4. Run manual health report

### Monthly Audit

Once a month:
1. Review all RLS policies
2. Check for unused or overly permissive policies
3. Verify partitioned tables have matching policies
4. Test with different user scenarios

## Emergency Response Plan

If content disappears again:

### Step 1: Immediate Diagnosis
```sql
-- Check what's accessible
SELECT COUNT(*) FROM media_content;

-- If you get permission denied, check RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'media_content%';
```

### Step 2: Quick Fix
```sql
-- Temporarily disable RLS (EMERGENCY ONLY)
ALTER TABLE media_content DISABLE ROW LEVEL SECURITY;

-- Better: Add proper policy
CREATE POLICY "Emergency public access"
  ON media_content
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

### Step 3: Verify Fix
```bash
# Test immediately
curl https://your-site.com
# Should see content now
```

### Step 4: Root Cause Analysis
1. Check migration history
2. Identify what changed
3. Document the issue
4. Update this guide with learnings

## Useful Commands Reference

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### List All Policies
```sql
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Find Tables Without Policies
```sql
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL;
```

### Check Table Row Counts
```sql
SELECT
  'media_content' as table_name,
  COUNT(*) as row_count
FROM media_content
UNION ALL
SELECT
  'media_content_2025_12',
  COUNT(*)
FROM media_content_2025_12
UNION ALL
SELECT
  'media_content_2026_01',
  COUNT(*)
FROM media_content_2026_01;
```

## Contact & Escalation

If you encounter issues:

1. **Check health endpoint first**
2. **Review error logs in Sentry**
3. **Run diagnostic SQL commands**
4. **Document what you find**
5. **Apply fixes with migration**

Remember: Prevention is better than cure. Always test migrations in development first!

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Health Check Endpoint: `/functions/v1/health-check`
- Error Monitoring: Sentry Dashboard

---

**Last Updated**: January 2026
**Version**: 1.0
