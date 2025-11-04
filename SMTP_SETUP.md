# SMTP Email Configuration Guide

## Overview

The application now uses SMTP (via Nodemailer) to send OTP emails. You can use any SMTP provider (Gmail, Outlook, SendGrid, custom SMTP, etc.).

## Environment Variables

Add these to your `.env.local` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL, 25 for non-encrypted)
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASSWORD=your-app-password   # Your email password or app password
SMTP_FROM=noreply@yourdomain.com  # From address (optional, defaults to SMTP_USER)
SMTP_SECURE=false                 # true for port 465 (SSL), false for port 587 (TLS)
```

## Common SMTP Providers

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
SMTP_FROM=your-email@gmail.com
SMTP_SECURE=false
```

**Important for Gmail:**
1. Enable 2-Step Verification on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (16 characters) as `SMTP_PASSWORD`

### Outlook / Microsoft 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
SMTP_SECURE=false
```

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
SMTP_SECURE=false
```

### Custom SMTP Server

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
SMTP_SECURE=false
```

## Port Configuration

- **Port 587**: TLS (recommended) - Set `SMTP_SECURE=false`
- **Port 465**: SSL - Set `SMTP_SECURE=true`
- **Port 25**: Non-encrypted (not recommended, often blocked)

## Testing

1. Configure your SMTP settings in `.env.local`
2. Restart your Next.js development server
3. Try signing up - you should receive an email with the OTP

## Troubleshooting

### "Invalid login" error
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Other providers**: Check your username and password are correct

### "Connection timeout" error
- Check your SMTP_HOST and SMTP_PORT are correct
- Make sure your firewall/network allows SMTP connections
- Try port 465 with `SMTP_SECURE=true`

### "Authentication failed" error
- Verify your SMTP_USER and SMTP_PASSWORD
- For Gmail, ensure you're using an App Password
- Check if your email provider requires special authentication

### Emails not sending
- Check server logs for error messages
- Verify all SMTP environment variables are set
- Test SMTP connection with a tool like `telnet` or an email client

## Security Notes

⚠️ **Never commit `.env.local` to git** - it contains sensitive credentials.

For production, set these environment variables in your hosting platform (Vercel, Netlify, etc.) instead of using `.env.local`.

## Development Mode

If SMTP is not configured, the system will:
- Log the OTP to the console (for testing)
- Return success (so you can test the flow)
- Show a warning message

This allows you to develop and test without setting up SMTP immediately.

