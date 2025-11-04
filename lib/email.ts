import nodemailer from 'nodemailer';

/**
 * Email utility for sending OTP emails using SMTP
 * Configure SMTP settings in your .env.local file
 */
export async function sendOTPEmail(email: string, otp: string, username: string): Promise<boolean> {
  try {
    // SMTP Configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    const smtpSecure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports

    // If SMTP is not configured, log to console (development mode)
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.log(`[OTP Email] To: ${email}, OTP: ${otp}`);
      console.warn('SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local to enable email sending.');
      console.debug('SMTP Config Check:', {
        SMTP_HOST: smtpHost ? 'Set' : 'Missing',
        SMTP_USER: smtpUser ? 'Set' : 'Missing',
        SMTP_PASSWORD: smtpPassword ? 'Set' : 'Missing',
        SMTP_PORT: smtpPort,
        SMTP_FROM: smtpFrom,
      });
      return true; // Return true in development to allow testing
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // For Gmail, you might need:
      // tls: {
      //   rejectUnauthorized: false
      // }
    });

    // Email content
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
            <p style="color: #666; font-size: 16px;">Hello ${username},</p>
            <p style="color: #666; font-size: 16px;">Your verification code for Askademia registration is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <h1 style="color: #3b82f6; font-size: 36px; letter-spacing: 8px; margin: 20px 0; font-weight: bold; padding: 20px; background-color: #f0f7ff; border-radius: 8px; display: inline-block;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Your Askademia Verification Code',
      html: emailBody,
      text: `Hello ${username},\n\nYour verification code for Askademia registration is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    });

    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // Log OTP for development if email fails
    console.log(`[OTP Email] To: ${email}, OTP: ${otp} (Email sending failed, OTP logged for development)`);
    return false;
  }
}

