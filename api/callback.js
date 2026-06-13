// Vercel Serverless Function: OAuth Callback Handler
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub client credentials missing on server.");
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed with status: ${response.status}`);
    }

    const data = await response.json();
    const token = data.access_token;

    if (!token) {
      return res.status(400).send("No access token was returned inside the exchange response payload: " + JSON.stringify(data));
    }

    res.setHeader("Content-Type", "text/html");
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              background-color: #0c0c0e;
              color: #f4f4f5;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
            }
            .card {
              background-color: #121214;
              border: 1px solid #27272a;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              max-width: 320px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color: #10b981; margin-top: 0;">Connected Successfully</h3>
            <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">Your GitHub account has been authenticated. Closing this window...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ token: '${token}' }, '*');
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              document.querySelector('p').innerText = "Authentication setup successfully, but client opener was not found!";
            }
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Callback Exchange Error:", error);
    return res.status(500).send("OAuth Authorization Code exchange error: " + error.message);
  }
}
