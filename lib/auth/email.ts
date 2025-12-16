import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'noreply@dream-pixel.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export function generateVerificationEmailHtml(token: string): string {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
      <p>Thank you for signing up for Dream Pixel! Please verify your email address to complete your registration.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
    </div>
  `
}

export function generatePasswordResetEmailHtml(token: string): string {
  const resetUrl = `${process.env.NEXTAUTH_URL}/api/auth/reset-password?token=${token}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
      <p>We received a request to reset your password for your Dream Pixel account.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
    </div>
  `
}

export function generateWelcomeEmailHtml(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Welcome to Dream Pixel!</h1>
      <p>Hi ${name},</p>
      <p>Welcome to Dream Pixel! We're excited to have you join our community of creative minds.</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Generate amazing AI images from your text prompts</li>
        <li>Access premium features and higher generation limits</li>
        <li>Share and discover creative seeds</li>
      </ul>
      <p>Start creating today!</p>
    </div>
  `
}

export function generateSubscriptionUpdateEmailHtml(tier: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Subscription Updated</h1>
      <p>Your Dream Pixel subscription has been updated to <strong>${tier}</strong>.</p>
      <p>You now have access to:</p>
      <ul>
        ${tier === 'PRO' ? `
          <li>Up to 100 generations per month</li>
          <li>Priority processing</li>
          <li>High-resolution outputs</li>
          <li>Advanced customization options</li>
        ` : tier === 'ENTERPRISE' ? `
          <li>Unlimited generations</li>
          <li>Priority processing</li>
          <li>High-resolution outputs</li>
          <li>Advanced customization options</li>
          <li>API access</li>
          <li>Team collaboration features</li>
        ` : `
          <li>Up to 10 generations per month</li>
          <li>Standard processing speed</li>
        `}
      </ul>
      <p>Thank you for choosing Dream Pixel!</p>
    </div>
  `
}

export function generatePaymentReceiptEmailHtml(params: {
  amountPaid: number
  currency: string
  invoiceNumber?: string | null
  hostedInvoiceUrl?: string | null
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Payment Received</h1>
      <p>Thanks for your payment to Dream Pixel.</p>
      <p><strong>Amount:</strong> ${(params.amountPaid / 100).toFixed(2)} ${params.currency.toUpperCase()}</p>
      ${params.invoiceNumber ? `<p><strong>Invoice:</strong> ${params.invoiceNumber}</p>` : ''}
      ${params.hostedInvoiceUrl ? `<p>You can view your invoice here: <a href="${params.hostedInvoiceUrl}">View Invoice</a></p>` : ''}
      <p style="color: #666; font-size: 14px;">If you have any questions, reply to this email.</p>
    </div>
  `
}

export function generatePaymentFailedEmailHtml(params: {
  invoiceNumber?: string | null
  hostedInvoiceUrl?: string | null
  nextPaymentAttempt?: Date | null
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Payment Failed</h1>
      <p>We were unable to process your latest payment for Dream Pixel.</p>
      ${params.invoiceNumber ? `<p><strong>Invoice:</strong> ${params.invoiceNumber}</p>` : ''}
      ${params.nextPaymentAttempt ? `<p>Stripe will retry the payment on <strong>${params.nextPaymentAttempt.toLocaleString()}</strong>.</p>` : ''}
      ${params.hostedInvoiceUrl ? `<p>Please update your payment method here: <a href="${params.hostedInvoiceUrl}">View Invoice</a></p>` : ''}
      <p>If you need help, reply to this email and we’ll assist you.</p>
    </div>
  `
}

export function generateUsageWarningEmailHtml(params: { used: number; limit: number }): string {
  const percentage = Math.round((params.used / params.limit) * 100)

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center;">Usage Warning</h1>
      <p>You’ve used <strong>${params.used}</strong> out of <strong>${params.limit}</strong> generations (${percentage}%).</p>
      <p>If you need a higher limit, contact sales to adjust your Enterprise plan.</p>
    </div>
  `
}
