import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('registration_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError) {
      // Check if table doesn't exist
      if (fetchError.code === 'PGRST205' || fetchError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            error: 'Database setup required. Please run the SQL schema in Supabase Dashboard → SQL Editor. See supabase_schema.sql file.' 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('registration_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify OTP' },
        { status: 500 }
      );
    }

    // Create the user account (check if admin methods are available)
    if (typeof supabase.auth.admin?.createUser !== 'function') {
      return NextResponse.json(
        { error: 'Server configuration error. SUPABASE_SERVICE_ROLE_KEY is required for signup.' },
        { status: 500 }
      );
    }

    const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
      email: otpRecord.email,
      password: otpRecord.password_hash,
      email_confirm: true, // Auto-confirm email since we verified via OTP
      user_metadata: {
        username: otpRecord.username,
      },
    });

    if (signupError) {
      console.error('Error creating user:', signupError);
      
      // Check for specific error codes and messages
      const errorMessage = signupError.message || '';
      const errorCode = (signupError as any)?.code || '';
      
      // If user already exists (various ways Supabase might report this)
      if (
        errorCode === 'email_exists' ||
        errorMessage.includes('already registered') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('email address has already been registered')
      ) {
        // Clean up the OTP since it was used
        await supabase
          .from('registration_otps')
          .delete()
          .eq('id', otpRecord.id);
          
        return NextResponse.json(
          { error: 'An account with this email already exists. Please try logging in instead.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // The profile will be automatically created by the trigger with role='student'
    // If the trigger didn't fire, manually create the profile
    if (signupData.user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: signupData.user.id,
          username: otpRecord.username,
          role: 'student', // Default role - can only be changed in Supabase directly
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.warn('Profile creation warning (may already exist):', profileError);
        // Don't fail the signup if profile creation fails - the trigger should handle it
      }
    }

    // Clean up the OTP record
    await supabase
      .from('registration_otps')
      .delete()
      .eq('id', otpRecord.id);

    // Also delete any other expired OTPs for this email
    await supabase
      .from('registration_otps')
      .delete()
      .eq('email', email)
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: signupData.user?.id,
        email: signupData.user?.email,
      },
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

