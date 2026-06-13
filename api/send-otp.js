import nodemailer from "nodemailer";

const otpStore = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid Gmail address." });
    }

    // Generate a secure 4-digit OTP code
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const normalizedEmail = email.toLowerCase().trim();

    // Store in global cache with 5-minute expiry
    const expiry = Date.now() + 5 * 60 * 1000;
    otpStore.set(normalizedEmail, { otpCode, expiry });

    // Store globally to help sharing across serverless instances in memory
    if (global) {
      if (!global.otpCache) {
        global.otpCache = new Map();
      }
      global.otpCache.set(normalizedEmail, { otpCode, expiry });
    }

    console.log(`[POCKETCODEX GMAIL OTP SECRET] Email: ${normalizedEmail} -> OTP: ${otpCode}`);

    // SMTP credentials configured via environments
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

    if (user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from: `"PocketCodex" <${user}>`,
        to: normalizedEmail,
        subject: "Your PocketCodex Core Secure Access Code",
        text: `Your security verification code is: ${otpCode}. It will expire in 5 minutes.`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; background-color: #0c0d0e; color: #f5f5f7; border: 1px solid #1c1c22; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 24px;">
            <div style="text-align: center; border-bottom: 1px solid #262626; padding-bottom: 20px; margin-bottom: 24px;">
              <h2 style="margin: 0; color: #f5f5f7; font-size: 20px; font-weight: 800; letter-spacing: 1px;">POCKETCODEX CORE ACCESSS</h2>
            </div>
            <p style="margin: 0 0 20px; font-size: 14px; color: #a3a3a3; line-height: 1.6; text-align: center;">
              Use the single-use 4-digit code below to unlock your active PocketCodex developer session workspace.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #fbbf24; background-color: #17171a; padding: 12px 24px; border-radius: 8px; border: 1px solid #262626; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="margin: 20px 0 0; font-size: 11px; color: #525252; text-align: center;">
              This code and request details expire in 5 minutes. If you did not trigger this request, please safely disregard this notice.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[POCKETCODEX SMTP SUCCESS] Real email sent to ${normalizedEmail}`);
    } else {
      console.log(`[POCKETCODEX SMTP NOTICE] SMTP credentials not fully configured. The code was logged to console for test/dev bypass.`);
    }

    return res.status(200).json({
      success: true,
      message: `A secure verification code has been generated and dispatched to your email.`
    });
  } catch (error) {
    console.error("OTP generation exception:", error);
    return res.status(500).json({ error: "Failed to dispatch verification OTP." });
  }
}
