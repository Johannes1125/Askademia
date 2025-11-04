import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOTPEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate username
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (trimmedUsername.length > 30) {
      return NextResponse.json(
        { error: 'Username must be less than 30 characters' },
        { status: 400 }
      );
    }
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscores, and hyphens' },
        { status: 400 }
      );
    }
    // Must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username must start with a letter or number' },
        { status: 400 }
      );
    }

    // Validate password - strong password requirements
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be less than 128 characters' },
        { status: 400 }
      );
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUpperCase) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }
    if (!hasLowerCase) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }
    if (!hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }
    if (!hasSymbol) {
      return NextResponse.json(
        { error: 'Password must contain at least one symbol (!@#$%^&* etc.)' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user already exists (only if admin methods are available)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && typeof supabase.auth.admin?.getUserByEmail === 'function') {
      try {
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
        if (existingUser?.user) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 400 }
          );
        }
      } catch (error) {
        // If check fails, continue - the actual signup will fail if user exists
        console.warn('Could not check existing user:', error);
      }
    }
    // If service role key is not set or admin methods unavailable, skip the check
    // The actual signup will fail if user exists anyway

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store password temporarily (we'll use it when creating the account)
    // Note: In production, you might want to encrypt this or use a different approach
    const passwordHash = password;

    // Delete any existing OTPs for this email
    try {
      await supabase
        .from('registration_otps')
        .delete()
        .eq('email', email);
    } catch (error) {
      // Ignore if table doesn't exist - will be caught in insert
    }

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('registration_otps')
      .insert({
        email,
        otp_code: otp,
        username: trimmedUsername, // Use trimmed username
        password_hash: passwordHash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Check if table doesn't exist
      if (dbError.code === 'PGRST205' || dbError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            error: 'Database setup required. Please run the SQL schema in Supabase Dashboard → SQL Editor. See supabase_schema.sql file.' 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to store OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, trimmedUsername);

    if (!emailSent) {
      // Clean up the OTP if email failed
      await supabase
        .from('registration_otps')
        .delete()
        .eq('email', email)
        .eq('otp_code', otp);

      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

