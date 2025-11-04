# OTP Registration Setup Guide

This guide explains how to set up the OTP-based registration system for your application.

## Prerequisites

1. Supabase project with database access
2. Email service configured (Resend, SendGrid, Nodemailer, etc.)

## Database Setup

1. Run the SQL schema in your Supabase SQL Editor:

```sql
-- See supabase_schema.sql for the complete schema
```

The schema creates a `registration_otps` table that stores:
- Email address
- OTP code (6 digits)
- Full name and password (temporarily stored)
- Expiration timestamp (10 minutes)
- Verification status

## Environment Variables

Add these to your `.env.local` file:

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required for OTP verification
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Email service configuration
# For Resend (example):
# RESEND_API_KEY=your_resend_api_key
# EMAIL_FROM=noreply@yourdomain.com

# Google OAuth (if using - already configured)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Email Service Configuration

The email sending is currently a placeholder in `lib/email.ts`. You need to:

1. Choose an email service (Resend, SendGrid, Nodemailer, etc.)
2. Install the required package:
   ```bash
   npm install resend  # Example for Resend
   ```
3. Update `lib/email.ts` with your email service implementation

### Example: Using Resend

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, otp: string, fullName: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      to: email,
      subject: 'Your Verification Code',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Verification Code</h2>
            <p>Hello ${fullName},</p>
            <p>Your verification code for Askademia registration is:</p>
            <h1 style="color: #3b82f6; font-size: 32px; letter-spacing: 5px; margin: 20px 0;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
```

## How It Works

1. **User Registration Flow:**
   - User enters email, full name, and password
   - Clicks "Send OTP"
   - System generates 6-digit OTP and stores it in Supabase
   - OTP is sent to user's email
   - User enters OTP
   - System verifies OTP and creates account
   - User is redirected to login page

2. **OTP Storage:**
   - OTPs are stored in `registration_otps` table
   - Each OTP expires after 10 minutes
   - OTPs are automatically cleaned up after verification
   - Only unverified and non-expired OTPs can be used

3. **Security:**
   - OTPs expire after 10 minutes
   - Each email can only have one active OTP at a time
   - OTPs are marked as verified after use
   - Password is stored temporarily (only during OTP verification period)

## Google OAuth

Google OAuth is already configured and working. Users can still sign up using Google OAuth, which bypasses the OTP flow.

## Testing

For development/testing, the OTP is currently logged to the console. Check your server logs to see the OTP code.

## Troubleshooting

1. **"SUPABASE_SERVICE_ROLE_KEY is not set"**
   - Add the service role key to your environment variables
   - Find it in Supabase Dashboard > Settings > API

2. **"Failed to store OTP"**
   - Make sure the `registration_otps` table exists
   - Check RLS policies allow inserts
   - Verify your Supabase connection

3. **"Failed to send OTP email"**
   - Configure your email service in `lib/email.ts`
   - Check email service API keys
   - Verify email service is properly configured

4. **"Invalid or expired OTP"**
   - OTPs expire after 10 minutes
   - OTPs can only be used once
   - Check that the OTP hasn't been verified already

