// Vercel serverless function for verifying Gmail OTP and creating the active session database profiling

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(445).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Missing active Email or OTP fields." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    let record = null;

    if (global && global.otpCache) {
      record = global.otpCache.get(normalizedEmail);
    }

    let isMatch = false;

    if (record) {
      const isExpired = Date.now() > record.expiry;
      if (record.otpCode === cleanOtp && !isExpired) {
        isMatch = true;
      }
    }

    if (isMatch) {
      // Clear OTP on successful logins
      if (global && global.otpCache) {
        global.otpCache.delete(normalizedEmail);
      }

      const rawName = normalizedEmail.split("@")[0];
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const userProfile = {
        email: normalizedEmail,
        name: capitalizedName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(capitalizedName)}`,
        isLoggedIn: true,
      };

      console.log(`[POCKETCODEX LOGIN SUCCESS] Active user session registered for ${normalizedEmail}`);

      return res.status(200).json({
        success: true,
        user: userProfile
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid or expired 4-digit verification code. Please correct and retry!"
    });
  } catch (error) {
    console.error("OTP verification exception:", error);
    return res.status(500).json({ error: "Failed to perform OTP verification checks." });
  }
}
