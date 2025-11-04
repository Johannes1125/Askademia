# Role System Documentation

## Overview

All new users are automatically assigned the **"student"** role by default. Only admins can change user roles, and this must be done directly in Supabase.

## Database Schema

### Profiles Table

The `profiles` table stores user roles and additional information:

- `id` - UUID (references `auth.users`)
- `full_name` - User's full name
- `role` - Either `'student'` or `'admin'` (default: `'student'`)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Automatic Profile Creation

A database trigger automatically creates a profile with `role='student'` when a new user signs up:

- **Trigger**: `on_auth_user_created`
- **Function**: `handle_new_user()`
- **Default Role**: `'student'`

This works for:
- OTP-based signups
- Google OAuth signups
- Any other authentication method

## Role Management

### Changing Roles

**Roles can ONLY be changed in Supabase Dashboard:**

1. Go to Supabase Dashboard → Table Editor
2. Find the `profiles` table
3. Locate the user you want to promote
4. Change `role` from `'student'` to `'admin'`

### Security

- Users **cannot** change their own role (enforced by RLS policies)
- Only `service_role` can insert profiles
- Role validation ensures only `'student'` or `'admin'` are allowed

## API Behavior

### Signup Flow

1. User signs up via OTP or OAuth
2. User account is created in `auth.users`
3. Trigger automatically creates profile with `role='student'`
4. If trigger fails, API falls back to manual profile creation

### Error Handling

- If `SUPABASE_SERVICE_ROLE_KEY` is not set, the user existence check is skipped
- The actual signup will still fail if the user already exists
- Profile creation errors are logged but don't fail signup (trigger should handle it)

## Usage in Code

To check a user's role:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', userId)
  .single();

if (profile?.role === 'admin') {
  // Admin access
}
```

## Important Notes

⚠️ **Run the SQL schema** (`supabase_schema.sql`) in Supabase SQL Editor to create:
- `registration_otps` table
- `profiles` table
- Triggers and functions
- RLS policies

Without running the schema, signups will fail with table not found errors.

