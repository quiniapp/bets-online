# Database Migrations

## Overview

This directory contains SQL migration files for the Casino Management Platform database.

## Running Migrations

### Using Supabase CLI

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run a specific migration
psql $DATABASE_URL -f 001_initial_schema.sql
```

### Using psql directly

```bash
psql $DATABASE_URL -f 001_initial_schema.sql
```

### Using Node.js script

```bash
npm run db:migrate
```

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all tables

## Tables Created

1. **users** - All platform users with hierarchical structure
2. **balances** - Chip balances for each user
3. **chip_movements** - Audit log for all chip transactions
4. **cashier_compensation_modes** - Cashier compensation configurations
5. **cashier_settlements** - Periodic settlements for cashiers
6. **chip_panels** - Panel-based compensation tracking
7. **recoveries** - Recovery operations tracking
8. **user_game_provider_blocklist** - Blocked game providers per user
9. **sessions** - Active user sessions
10. **audit_logs** - System-wide audit trail

## Default Owner Account

The migration creates a default owner account:
- **Username**: owner
- **Email**: owner@casino.com
- **Password**: (Set via environment variable or bootstrap script)

**Important**: Change the default credentials immediately after first deployment!

## Notes

- All timestamps are stored with timezone (TIMESTAMP WITH TIME ZONE)
- UUID is used for all primary keys
- Foreign keys have appropriate ON DELETE actions
- Indexes are created for performance optimization
- Triggers automatically update timestamps
- All monetary values use NUMERIC(15, 2) for precision
