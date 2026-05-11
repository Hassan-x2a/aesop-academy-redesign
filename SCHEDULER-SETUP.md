# Aesop Scheduler Setup Guide

## Quick Diagnosis

Visit: `https://aesopacademy.org/scheduling/debug.php`

This will tell you exactly what's missing.

## Required Configuration

The scheduler requires **5 critical environment variables** set on your cPanel server:

### Database Credentials
- `AESOP_DB_HOST` — MySQL host (usually `localhost`)
- `AESOP_DB_NAME` — Database name
- `AESOP_DB_USER` — Database username
- `AESOP_DB_PASS` — Database password

### OAuth Configuration
- `AESOP_AZURE_CLIENT_SECRET` — Azure app client secret (from setup.php authorization)
- `AESOP_SECOND_CALENDAR_ICS` — ICS feed URL for secondary calendar (optional but configured)

## Setting Environment Variables on cPanel

### Option 1: cPanel Environment Variables (Recommended)
1. Log into cPanel
2. Go to **Environment Variables** (under Advanced)
3. Add each variable:
   - Name: `AESOP_DB_HOST`
   - Value: your database host
   - (Repeat for each variable above)
4. Save
5. Restart PHP-FPM or Apache

### Option 2: .env File (If cPanel doesn't support Environment Variables)
Create `public_html/aesop-academy/.env`:
```
AESOP_DB_HOST=localhost
AESOP_DB_NAME=your_db_name
AESOP_DB_USER=your_db_user
AESOP_DB_PASS=your_db_pass
AESOP_AZURE_CLIENT_SECRET=your_azure_secret
AESOP_SECOND_CALENDAR_ICS=https://...your.ics.url...
```

Then update `scheduling/config.php` to load from .env:
```php
$dotenv = parse_ini_file(__DIR__ . '/../.env');
```

### Option 3: .htaccess (Last Resort)
Add to `.htaccess` in `public_html/aesop-academy/`:
```apache
SetEnv AESOP_DB_HOST localhost
SetEnv AESOP_DB_NAME your_db_name
SetEnv AESOP_DB_USER your_db_user
SetEnv AESOP_DB_PASS your_db_pass
SetEnv AESOP_AZURE_CLIENT_SECRET your_secret
SetEnv AESOP_SECOND_CALENDAR_ICS https://...
```

## Initialization Steps

### 1. Create Database Tables
Run the schema once:
```sql
-- Log into your MySQL client and run:
SOURCE scheduling/schema.sql
```

Or copy the contents of `scheduling/schema.sql` and execute in phpMyAdmin.

### 2. Authorize the Scheduler
1. Visit: `https://aesopacademy.org/scheduling/setup.php`
2. You'll be redirected to Microsoft login
3. Authorize the app
4. You'll see "Connected!" confirmation
5. **The OAuth tokens are now stored in the database**
6. **Delete or password-protect setup.php** (security: it should only be run once)

### 3. Test the Scheduler
Visit: `https://aesopacademy.org/scheduling/`

If you see available time slots → ✓ Success!

If you get "Could not load availability" → Check `debug.php` for what's missing.

## Troubleshooting

### "Could not load availability: Unexpected end of JSON input"
- Means `/scheduling/slots.php` is returning HTTP 500 (server error)
- Check `debug.php` to see what's missing
- Most common cause: database credentials not set as environment variables

### "Calendar not connected. Run setup.php first."
- OAuth tokens not in database
- Go to `setup.php` again and re-authorize

### "Missing required secret: AESOP_DB_NAME"
- Environment variable not set
- Check cPanel Environment Variables
- Or verify .env/.htaccess configuration

## Files to Know

| File | Purpose |
|------|---------|
| `scheduling/debug.php` | Diagnostic tool — shows what's configured |
| `scheduling/setup.php` | OAuth authorization (run once) |
| `scheduling/slots.php` | Returns available time slots (REST API) |
| `scheduling/book.php` | Books a meeting (REST API) |
| `scheduling/schema.sql` | Database table definitions |
| `scheduling/config.php` | Loads secrets from environment |

## Security Notes

- **Never commit `secrets.local.php` with real values** (it's in .gitignore for this reason)
- **Delete `setup.php` after authorization** or password-protect it
- **Never store secrets in code** — always use environment variables
- **Keep `debug.php` private** — delete after troubleshooting

## Questions?

Check the error logs in cPanel for PHP errors. That's often the most direct hint about what's failing.
