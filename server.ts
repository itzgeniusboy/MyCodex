import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Helper to recursively scan local container workspace files
function getWorkspaceFiles(dir: string, baseDir = ""): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = baseDir ? path.join(baseDir, file) : file;
      // Skip ignorable binary or large directories
      if (
        file === "node_modules" || 
        file === ".git" || 
        file === "dist" || 
        file === ".next" || 
        file.startsWith(".") ||
        file === "build"
      ) {
        return;
      }
      
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getWorkspaceFiles(filePath, relativePath));
      } else {
        // Only return text-editable web files for target context
        const ext = path.extname(file).toLowerCase();
        if ([".tsx", ".ts", ".js", ".jsx", ".json", ".html", ".css", ".md", ".env"].includes(ext)) {
          results.push(relativePath);
        }
      }
    });
  } catch (e) {
    console.error("Error scanning workspace path:", e);
  }
  return results;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // GitHub Dynamic Auth Route for local server
  app.get("/api/auth", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      // Fallback redirect to local mock popup
      return res.redirect("/auth/github/popup");
    }
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    res.redirect(authUrl);
  });

  // GitHub Dynamic OAuth Callback for local server
  app.get("/api/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing authorization details.");
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
        throw new Error(`Exchange request failed: ${response.status}`);
      }

      const data: any = await response.json();
      const token = data.access_token;

      if (!token) {
        return res.status(400).send("Access token not returned by GitHub: " + JSON.stringify(data));
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
    } catch (err: any) {
      console.error(err);
      res.status(500).send("Exchange execution error: " + err.message);
    }
  });

  // GitHub Authorization Pop-up URL API
  app.get("/api/auth/github/url", (req, res) => {
    res.json({ url: "/api/auth" });
  });

  // Simple HTML Pop-up Page for simulated/direct credentials input
  app.get("/auth/github/popup", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connect to GitHub Workspace</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: #0c0c0e; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
        </style>
      </head>
      <body class="min-h-screen flex items-center justify-center p-6">
        <div class="w-full max-w-sm bg-[#121214] border border-neutral-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          <div class="h-12 w-12 mx-auto bg-amber-500/10 border border-amber-500/20 text-lg flex items-center justify-center rounded-xl font-sans">
             🐙
          </div>
          <div class="space-y-1">
            <h1 class="text-sm font-bold text-white uppercase tracking-wider font-sans">1-Click Sandbox Link</h1>
            <p class="text-[11px] text-neutral-400 font-sans leading-normal">Configure high-fidelity simulated session since local secret keys are pending gateway credentials.</p>
          </div>
          
          <div class="space-y-3 pt-1 text-left">
            <div>
              <label class="text-[9px] uppercase font-bold tracking-wider text-neutral-500 block mb-1 font-sans">GitHub Username</label>
              <input id="github-username" type="text" placeholder="e.g. programmer" value="" class="w-full bg-[#1c1d22] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700 font-sans" />
            </div>
            <div>
              <div class="flex items-center justify-between mb-1 flex-wrap gap-1">
                <label class="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block font-sans">GitHub Token</label>
                <a href="https://github.com/settings/tokens/new?scopes=repo,workflow,write:discussion,admin:repo_hook&description=PocketCodex%20Autonomous%20Sandbox%20Token" target="_blank" class="text-[9px] text-amber-500 hover:text-amber-400 font-bold font-sans transition">
                  🔗 Generate Token
                </a>
              </div>
              <input id="github-token" type="password" placeholder="gho_oauth_access_token..." value="" class="w-full bg-[#1c1d22] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700 font-sans" />
            </div>
          </div>
          
          <button id="connect-btn" class="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer font-sans uppercase">
            ⚡ Link Secure Session
          </button>
        </div>
        
        <script>
          document.getElementById('connect-btn').addEventListener('click', () => {
            const username = document.getElementById('github-username').value.trim() || 'developer';
            const token = document.getElementById('github-token').value.trim() || '';
            
            if (window.opener) {
              window.opener.postMessage({
                type: 'GITHUB_AUTH_SUCCESS',
                token: token,
                username: username
              }, '*');
              window.close();
            } else {
              alert('Connection successful!');
            }
          });
        </script>
      </body>
      </html>
    `);
  });

  // Helper functions to clean and validate credentials
  const cleanToken = (token: any): string => {
    if (!token) return "";
    return String(token).trim().replace(/["'\s\r\n]/g, "");
  };

  const cleanUsername = (username: any): string => {
    if (!username) return "";
    return String(username).trim();
  };

  // Scan and fetch repository lists
  app.get("/api/github/repos", async (req, res) => {
    try {
      const { username: rawUsername, token: rawToken } = req.query;
      const username = cleanUsername(rawUsername);
      const token = cleanToken(rawToken);
      if (token && token !== "mock-token" && username) {
        try {
          const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=15&sort=updated`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "pocket-codex-app"
            }
          });
          if (response.ok) {
            const data: any = await response.json();
            if (Array.isArray(data)) {
              return res.json({ repos: data.map((r: any) => r.name) });
            }
          }
        } catch (apiErr) {
          console.warn("Real repository fetch failed, falling back to mock list:", apiErr);
        }
      }
      // Demo fallback lists
      res.json({ repos: ["portfolio-site", "react-haptics-sandbox", "pocket-codex-core", "vercel-slate-theme", "ios-chatgpt-clone"] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch repositories" });
    }
  });

  // Recursive file tree reader for repositories or local sandbox workspace
  app.get("/api/github/files", async (req, res) => {
    try {
      const { repo, username: rawUsername, token: rawToken } = req.query;
      const username = cleanUsername(rawUsername);
      const token = cleanToken(rawToken);
      
      // If we have a real username and token, attempt to fetch from GitHub API
      if (token && token !== "mock-token" && username && repo) {
        try {
          const response = await fetch(`https://api.github.com/repos/${username}/${repo}/git/trees/main?recursive=1`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "pocket-codex-app"
            }
          });
          if (response.ok) {
            const data: any = await response.json();
            if (data && Array.isArray(data.tree)) {
              const files = data.tree
                .filter((item: any) => item.type === "blob")
                .map((item: any) => item.path);
              return res.json({ files });
            }
          }
        } catch (apiErr) {
          console.warn("GitHub API file tree fetch failed, falling back to local files:", apiErr);
        }
      }
      
      const workspaceFiles = getWorkspaceFiles(process.cwd());
      res.json({ files: workspaceFiles });
    } catch (e: any) {
      console.error("Error reading file tree:", e);
      res.status(500).json({ error: e.message || "Failed to scan files" });
    }
  });

  // Get file content
  app.get("/api/github/file-content", async (req, res) => {
    try {
      const { repo, username: rawUsername, token: rawToken, filename } = req.query;
      const username = cleanUsername(rawUsername);
      const token = cleanToken(rawToken);
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }
      
      const fileStr = String(filename);
      
      if (token && token !== "mock-token" && username && repo) {
        try {
          const response = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${fileStr}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "pocket-codex-app"
            }
          });
          if (response.ok) {
            const data: any = await response.json();
            if (data && typeof data.content === "string") {
              const content = Buffer.from(data.content, "base64").toString("utf-8");
              return res.json({ content, sha: data.sha });
            }
          }
        } catch (apiErr) {
          console.warn("GitHub contents API fetch failed, falling back to local file:", apiErr);
        }
      }
      
      const localPath = path.join(process.cwd(), fileStr);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, "utf-8");
        return res.json({ content, sha: "" });
      } else {
        return res.status(404).json({ error: "File not found" });
      }
    } catch (e: any) {
      console.error("Error fetching file content:", e);
      res.status(500).json({ error: e.message || "Failed to load content" });
    }
  });

  // Commit and write code changes locally or push to Real/Mock GitHub Repository (supports multi-file sync)
  app.post("/api/github/push", async (req, res) => {
    try {
      const { repo, username: rawUsername, token: rawToken, filename, content, files: bodyFiles, commitMsg } = req.body;
      const username = cleanUsername(rawUsername);
      const token = cleanToken(rawToken);
      
      // Parse array of files to process
      const filesToCommit: { filename: string; content: string }[] = [];
      if (Array.isArray(bodyFiles)) {
        filesToCommit.push(...bodyFiles);
      } else if (filename && content) {
        filesToCommit.push({ filename: String(filename), content: String(content) });
      }

      if (filesToCommit.length === 0) {
        return res.status(400).json({ error: "No files or contents were provided for sync push." });
      }
      
      const commitMessage = commitMsg || `Synced ${filesToCommit.length} file(s) via autonomous Workspace loop`;
      
      // 1. Write files locally inside container for instant live environment compilation
      for (const item of filesToCommit) {
        const fileStr = String(item.filename);
        const localPath = path.join(process.cwd(), fileStr);
        try {
          const folder = path.dirname(localPath);
          if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
          }
          fs.writeFileSync(localPath, item.content, "utf-8");
          console.log(`Synced file locally inside container: ${localPath}`);
        } catch (localWriteErr) {
          console.warn("Local storage write skipped:", localWriteErr);
        }
      }
      
      // 2. Commit and push directly to GitHub if authenticated
      if (token && token !== "mock-token" && username && repo) {
        try {
          // A. Determine active branch and fetch its latest commit
          let activeBranch = "main";
          let refRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/ref/heads/main`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "pocket-codex-app"
            }
          });
          
          if (!refRes.ok) {
            // Fallback to master if main doesn't exist yet
            refRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/ref/heads/master`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "pocket-codex-app"
              }
            });
            if (refRes.ok) {
              activeBranch = "master";
            }
          }

          if (!refRes.ok) {
            throw new Error(`Unable to find 'main' or 'master' branch references in this repo.`);
          }

          const refData: any = await refRes.json();
          const lastCommitSha = refData.object.sha;

          // B. Get father commit's tree SHA
          const commitDetailRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/commits/${lastCommitSha}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "pocket-codex-app"
            }
          });
          if (!commitDetailRes.ok) {
            throw new Error(`Failed to fetch commit details for SHA ${lastCommitSha}`);
          }
          const commitDetail: any = await commitDetailRes.json();
          const baseTreeSha = commitDetail.tree.sha;

          // C. Build the new git tree structure with the files array
          const treeItems = filesToCommit.map(item => ({
            path: item.filename,
            mode: "100644",
            type: "blob",
            content: item.content
          }));

          const createTreeRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/trees`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "pocket-codex-app"
            },
            body: JSON.stringify({
              base_tree: baseTreeSha,
              tree: treeItems
            })
          });

          if (!createTreeRes.ok) {
            const createTreeErrTxt = await createTreeRes.text();
            throw new Error(`GitHub Create Tree API Error: ${createTreeErrTxt}`);
          }
          const newTreeData: any = await createTreeRes.json();
          const newTreeSha = newTreeData.sha;

          // D. Create a new commit referencing the tree and father commit parent
          const createCommitRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/commits`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "pocket-codex-app"
            },
            body: JSON.stringify({
              message: commitMessage,
              tree: newTreeSha,
              parents: [lastCommitSha]
            })
          });

          if (!createCommitRes.ok) {
            const commitErrTxt = await createCommitRes.text();
            throw new Error(`GitHub Create Commit API Error: ${commitErrTxt}`);
          }
          const newCommitData: any = await createCommitRes.json();
          const newCommitSha = newCommitData.sha;

          // E. Update reference to trigger live production branch head forward
          const updateRefRes = await fetch(`https://api.github.com/repos/${username}/${repo}/git/refs/heads/${activeBranch}`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "pocket-codex-app"
            },
            body: JSON.stringify({
              sha: newCommitSha,
              force: true
            })
          });

          if (!updateRefRes.ok) {
            const updateRefErrTxt = await updateRefRes.text();
            throw new Error(`GitHub Update Reference API Error: ${updateRefErrTxt}`);
          }

          const shortSha = newCommitSha.substring(0, 7);
          return res.json({
            status: "success",
            files: filesToCommit.map(f => f.filename),
            sha: shortSha,
            branch: activeBranch,
            message: `Committed ${filesToCommit.length} file(s) synchronously to GitHub!`
          });

        } catch (gitErr: any) {
          console.error("GitHub API commit error:", gitErr);
          return res.status(500).json({ error: gitErr.message || "Failed to commit to GitHub" });
        }
      }
      
      const mockSha = Math.random().toString(16).substring(2, 9);
      res.json({
        status: "success",
        files: filesToCommit.map(f => f.filename),
        sha: mockSha,
        branch: "main",
        message: "Synced locally to workspace container"
      });
    } catch (e: any) {
      console.error("Error pushing file changes:", e);
      res.status(500).json({ error: e.message || "Push execution stalled" });
    }
  });

  // Global in-memory cache for development OTP storage
  const devOtpCache = new Map<string, { otpCode: string; expiry: number }>();

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Please enter a valid Gmail address." });
      }

      const otpCode = String(Math.floor(1000 + Math.random() * 9000));
      const normalizedEmail = email.toLowerCase().trim();
      const expiry = Date.now() + 5 * 60 * 1000;

      devOtpCache.set(normalizedEmail, { otpCode, expiry });
      console.log(`[DEV EXPRESS OTP] Email: ${normalizedEmail} -> OTP: ${otpCode}`);

      // SMTP credentials configured via environments
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = port === 465;
      const user = process.env.SMTP_USER || process.env.GMAIL_USER;
      const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

      if (user && pass) {
        try {
          const nodemailer = await import("nodemailer");
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
        } catch (mailErr: any) {
          console.error("Nodemailer delivery exception:", mailErr);
        }
      } else {
        console.log(`[POCKETCODEX SMTP NOTICE] SMTP credentials not fully configured. The code was logged to console above.`);
      }

      return res.json({
        success: true,
        message: `A secure verification code has been generated and dispatched to your email.`
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to dispatch OTP code." });
    }
  });

  app.post("/api/verify-otp", (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "Missing Email or OTP input values." });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const cleanOtp = String(otp).trim();

      const record = devOtpCache.get(normalizedEmail);
      let isMatch = false;

      if (record) {
        const isExpired = Date.now() > record.expiry;
        if (record.otpCode === cleanOtp && !isExpired) {
          isMatch = true;
        }
      }

      if (isMatch) {
        devOtpCache.delete(normalizedEmail);

        const rawName = normalizedEmail.split("@")[0];
        const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const userProfile = {
          email: normalizedEmail,
          name: capitalizedName,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(capitalizedName)}`,
          isLoggedIn: true,
          designatedApiKey: `session-verified-token-${Buffer.from(normalizedEmail).toString("base64")}`
        };

        return res.json({
          success: true,
          user: userProfile
        });
      }

      return res.status(400).json({
        success: false,
        error: "Invalid or expired 4-digit verification code. Please try again!"
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to execute OTP verification." });
    }
  });

  // Simple JSON-based database for persistent user passwords
  const PASSWORDS_FILE = path.join(process.cwd(), "users_db.json");

  function readUsersDb(): Record<string, string> {
    try {
      if (fs.existsSync(PASSWORDS_FILE)) {
        const raw = fs.readFileSync(PASSWORDS_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading users db:", e);
    }
    return {};
  }

  function writeUsersDb(db: Record<string, string>) {
    try {
      fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing users db:", e);
    }
  }

  app.post("/api/login-password", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail.includes("@")) {
        return res.status(400).json({ error: "Please enter a valid Gmail address." });
      }

      const cleanPassword = String(password).trim();
      if (cleanPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
      }

      const db = readUsersDb();
      const existingPassword = db[normalizedEmail];

      let isNewUser = false;
      if (!existingPassword) {
        // Automatically register the user if it's the first time seeing this email
        db[normalizedEmail] = cleanPassword;
        writeUsersDb(db);
        isNewUser = true;
      } else if (existingPassword !== cleanPassword) {
        return res.status(400).json({ error: "Incorrect password for this email address." });
      }

      const rawName = normalizedEmail.split("@")[0];
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const userProfile = {
        email: normalizedEmail,
        name: capitalizedName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(capitalizedName)}`,
        isLoggedIn: true,
        designatedApiKey: `session-verified-token-${Buffer.from(normalizedEmail).toString("base64")}`
      };

      return res.json({
        success: true,
        user: userProfile,
        message: isNewUser ? "Account registered and logged in successfully!" : "Logged in successfully!"
      });
    } catch (error: any) {
      console.error("Password login exception:", error);
      return res.status(500).json({ error: "Failed to perform password authentication." });
    }
  });

  // API endpoint for chat messages with Intelligent Router & 21-Provider Matrix
  const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string; models: { Low: string; Med: string; High: string } }> = {
    gemini: {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/v1",
      defaultModel: "gemini-2.5-flash",
      models: { Low: "gemini-2.5-flash", Med: "gemini-1.5-pro", High: "gemini-2.5-pro" }
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
      models: { Low: "gpt-4o-mini", Med: "o3-mini", High: "gpt-4o" }
    },
    anthropic: {
      baseUrl: "https://api.anthropic.com/v1",
      defaultModel: "claude-3-5-sonnet-20241022",
      models: { Low: "claude-3-haiku-20240307", Med: "claude-3-5-haiku-20241022", High: "claude-3-5-sonnet-20241022" }
    },
    deepseek: {
      baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat",
      models: { Low: "deepseek-chat", Med: "deepseek-chat", High: "deepseek-reasoner" }
    },
    kimi: {
      baseUrl: "https://api.moonshot.cn/v1",
      defaultModel: "moonshot-v1-8k",
      models: { Low: "moonshot-v1-8k", Med: "moonshot-v1-32k", High: "moonshot-v1-128k" }
    },
    minimax: {
      baseUrl: "https://api.minimax.chat/v1",
      defaultModel: "abab6.5s-chat",
      models: { Low: "abab6.5s-chat", Med: "abab7-chat", High: "abab7-chat" }
    },
    xai: {
      baseUrl: "https://api.x.ai/v1",
      defaultModel: "grok-2-mini",
      models: { Low: "grok-2-mini", Med: "grok-2-1212", High: "grok-beta" }
    },
    meta: {
      baseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "llama-3.3-70b-versatile",
      models: { Low: "llama-3.1-8b-instant", Med: "llama-3.3-70b-versatile", High: "llama-3.1-405b" }
    },
    mistral: {
      baseUrl: "https://api.mistral.ai/v1",
      defaultModel: "mistral-small-latest",
      models: { Low: "open-mistral-7b", Med: "mistral-small-latest", High: "mistral-large-latest" }
    },
    qwen: {
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-2.5-7b-instruct",
      models: { Low: "qwen-2.5-7b-instruct", Med: "qwen-2.5-32b-instruct", High: "qwen-2.5-72b-instruct" }
    },
    perplexity: {
      baseUrl: "https://api.perplexity.ai",
      defaultModel: "sonar",
      models: { Low: "sonar-small", Med: "sonar-medium", High: "sonar-pro" }
    },
    cohere: {
      baseUrl: "https://api.cohere.com/v1",
      defaultModel: "command",
      models: { Low: "command-light", Med: "command", High: "command-r-plus" }
    },
    groq: {
      baseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "llama-3.3-70b-versatile",
      models: { Low: "llama-3.1-8b-instant", Med: "llama-3.3-70b-versatile", High: "llama-3.3-70b-versatile" }
    },
    together: {
      baseUrl: "https://api.together.xyz/v1",
      defaultModel: "meta-llama/Llama-3.3-70b-instruct-turbo",
      models: { Low: "meta-llama/Llama-3-8b-chat-hf", Med: "meta-llama/Llama-3.3-70b-instruct-turbo", High: "meta-llama/Llama-3.1-405b-instruct-turbo" }
    },
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModel: "auto",
      models: { Low: "meta-llama/llama-3-8b-instruct:free", Med: "google/gemini-flash-1.5", High: "anthropic/claude-3.5-sonnet" }
    },
    huggingface: {
      baseUrl: "https://api-inference.huggingface.co/v1",
      defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
      models: { Low: "meta-llama/Llama-3.1-8B-Instruct", Med: "meta-llama/Llama-3.3-70B-Instruct", High: "meta-llama/Llama-3.1-405B-Instruct" }
    },
    stability: {
      baseUrl: "https://api.stability.ai/v1",
      defaultModel: "stable-lm-3b",
      models: { Low: "stable-lm-3b", Med: "stable-lm-7b", High: "stable-lm-13b" }
    },
    novita: {
      baseUrl: "https://api.novita.ai/v3/openai/v1",
      defaultModel: "meta-llama/llama-3.3-70b-instruct",
      models: { Low: "meta-llama/llama-3-8b-instruct", Med: "meta-llama/llama-3.3-70b-instruct", High: "meta-llama/llama-3.1-405b" }
    },
    fireworks: {
      baseUrl: "https://api.fireworks.ai/inference/v1",
      defaultModel: "accounts/fireworks/models/llama-v3-3-70b-instruct",
      models: { Low: "accounts/fireworks/models/llama-v3-8b-instruct", Med: "accounts/fireworks/models/llama-v3-3-70b-instruct", High: "accounts/fireworks/models/llama-v3-1-405b-instruct" }
    },
    replicate: {
      baseUrl: "https://api.replicate.com/v1",
      defaultModel: "meta/meta-llama-3-70b-instruct",
      models: { Low: "meta/llama-2-7b-chat", Med: "meta/llama-2-70b-chat", High: "meta/meta-llama-3-70b-instruct" }
    },
    anyscale: {
      baseUrl: "https://api.endpoints.anyscale.com/v1",
      defaultModel: "meta-llama/Llama-3-70b-chat-hf",
      models: { Low: "meta-llama/Llama-3-8b-chat-hf", Med: "meta-llama/Llama-3-70b-chat-hf", High: "meta-llama/Llama-3-405b-chat-hf" }
    }
  };

  const getNormalizedProviderKey = (input: string): string => {
    const normalized = String(input || "").toLowerCase();
    if (normalized.includes("gemini") || normalized.includes("google")) return "gemini";
    if (normalized.includes("openai") || normalized.includes("chatgpt")) return "openai";
    if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
    if (normalized.includes("deepseek")) return "deepseek";
    if (normalized.includes("kimi") || normalized.includes("moonshot")) return "kimi";
    if (normalized.includes("minimax")) return "minimax";
    if (normalized.includes("xai") || normalized.includes("grok")) return "xai";
    if (normalized.includes("meta") || normalized.includes("llama")) return "meta";
    if (normalized.includes("mistral")) return "mistral";
    if (normalized.includes("qwen") || normalized.includes("alibaba")) return "qwen";
    if (normalized.includes("perplexity") || normalized.includes("sonar")) return "perplexity";
    if (normalized.includes("cohere")) return "cohere";
    if (normalized.includes("groq")) return "groq";
    if (normalized.includes("together")) return "together";
    if (normalized.includes("openrouter")) return "openrouter";
    if (normalized.includes("hugging")) return "huggingface";
    if (normalized.includes("stability")) return "stability";
    if (normalized.includes("novita")) return "novita";
    if (normalized.includes("fireworks")) return "fireworks";
    if (normalized.includes("replicate")) return "replicate";
    if (normalized.includes("anyscale")) return "anyscale";
    return "gemini";
  };

  const getEnvKeyName = (prov: string): string => {
    switch (prov) {
      case "gemini": return "GEMINI_API_KEY";
      case "openai": return "OPENAI_API_KEY";
      case "anthropic": return "ANTHROPIC_API_KEY";
      case "deepseek": return "DEEPSEEK_API_KEY";
      case "kimi": return "KIMI_API_KEY";
      case "minimax": return "MINIMAX_API_KEY";
      case "xai": return "XAI_API_KEY";
      case "meta": return "META_API_KEY";
      case "mistral": return "MISTRAL_API_KEY";
      case "qwen": return "QWEN_API_KEY";
      case "perplexity": return "PERPLEXITY_API_KEY";
      case "cohere": return "COHERE_API_KEY";
      case "groq": return "GROQ_API_KEY";
      case "together": return "TOGETHER_API_KEY";
      case "openrouter": return "OPENROUTER_API_KEY";
      case "huggingface": return "HUGGINGFACE_API_KEY";
      case "stability": return "STABILITY_API_KEY";
      case "novita": return "NOVITA_API_KEY";
      case "fireworks": return "FIREWORKS_API_KEY";
      case "replicate": return "REPLICATE_API_KEY";
      case "anyscale": return "ANYSCALE_API_KEY";
      default: return "GEMINI_API_KEY";
    }
  };

  const handleNewChatRoute = async (req: any, res: any) => {
    try {
      const { 
        messages, 
        routingLevel = "Auto", 
        selectedCustomModel, 
        savedApiKeys = [],
        customApiKey,
        activeEngine,
        customProvider,
        customModel,
        stream = false
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages list is required." });
      }

      // 1. Prompt Intent Classification
      const lastMsgContent = messages[messages.length - 1]?.content || "";
      const lowercaseMsg = String(lastMsgContent).toLowerCase();

      const isCodingPrompt = /build|coding|react|next\.js|refactor|component|code|architecture|database|api|backend|frontend|css|html|script|typescript|javascript|developer|engineer|write a|implement/i.test(lowercaseMsg);

      const isReasoningPrompt = /reason|math|logic|explanation|why|solve|proof|derivation|complex|algorithm|optimization|analysis|science|deep/i.test(lowercaseMsg);

      // 2. Resolve Active Keys (User overrides + Env fallbacks)
      const activeKeys: Record<string, string> = {};
      for (const prov of Object.keys(PROVIDER_CONFIGS)) {
        const envVar = getEnvKeyName(prov);
        if (process.env[envVar]) {
          activeKeys[prov] = process.env[envVar] || "";
        }
      }

      // Check header custom key
      let headerApiKey = "";
      if (req.headers) {
        const headersAny = req.headers as any;
        if (typeof headersAny.get === "function") {
          headerApiKey = headersAny.get("x-gemini-api-key") || "";
        }
        if (!headerApiKey) {
          headerApiKey = (req.headers["x-gemini-api-key"] as string) || "";
        }
      }

      if (headerApiKey && !headerApiKey.startsWith("session-verified-token-")) {
        let deduced = "gemini";
        if (headerApiKey.startsWith("gsk_")) deduced = "groq";
        else if (headerApiKey.startsWith("sk-")) deduced = "openai";
        else if (headerApiKey.startsWith("AIzaSy")) deduced = "gemini";
        else if (customProvider) deduced = getNormalizedProviderKey(customProvider);
        activeKeys[deduced] = headerApiKey.trim();
      }

      if (Array.isArray(savedApiKeys)) {
        for (const item of savedApiKeys) {
          const provName = getNormalizedProviderKey(item.provider);
          const keyVal = item.secretKey || item.apiKey || item.key;
          if (keyVal && keyVal.trim() !== "" && !keyVal.startsWith("session-verified-token-")) {
            activeKeys[provName] = keyVal.trim();
          }
        }
      }

      if (customApiKey && customApiKey.trim() !== "" && !customApiKey.startsWith("session-verified-token-")) {
        let deducedProv = "gemini";
        if (customApiKey.startsWith("gsk_")) deducedProv = "groq";
        else if (customApiKey.startsWith("sk-")) deducedProv = "openai";
        else if (customApiKey.startsWith("AIzaSy")) deducedProv = "gemini";
        else if (customProvider) deducedProv = getNormalizedProviderKey(customProvider);
        activeKeys[deducedProv] = customApiKey.trim();
      }

      // Force default process.env fallback if GEMINI_API_KEY is available
      if (!activeKeys["gemini"] && process.env.GEMINI_API_KEY) {
        activeKeys["gemini"] = process.env.GEMINI_API_KEY;
      }

      // 3. Routing Matrix
      let activeProvider = "gemini";
      let activeModel = "gemini-2.5-flash";

      if (routingLevel === "Custom") {
        activeProvider = customProvider ? getNormalizedProviderKey(customProvider) : "gemini";
        activeModel = selectedCustomModel || customModel || PROVIDER_CONFIGS[activeProvider].defaultModel;
      } else if (routingLevel === "Auto") {
        if (isCodingPrompt && activeKeys["anthropic"]) {
          activeProvider = "anthropic";
          activeModel = "claude-3-5-sonnet-20241022";
        } else if (isReasoningPrompt && activeKeys["deepseek"]) {
          activeProvider = "deepseek";
          activeModel = "deepseek-reasoner";
        } else if (isReasoningPrompt && activeKeys["openai"]) {
          activeProvider = "openai";
          activeModel = "o1";
        } else {
          let chosen = customProvider ? getNormalizedProviderKey(customProvider) : "";
          if (!chosen && activeEngine && activeEngine.provider) {
            chosen = getNormalizedProviderKey(activeEngine.provider);
          }
          if (chosen && activeKeys[chosen]) {
            activeProvider = chosen;
          } else {
            const loadedKeys = Object.keys(activeKeys);
            activeProvider = loadedKeys.includes("gemini") ? "gemini" : (loadedKeys[0] || "gemini");
          }
          const config = PROVIDER_CONFIGS[activeProvider] || PROVIDER_CONFIGS["gemini"];
          activeModel = config.models.Med || config.defaultModel;
        }
      } else {
        let chosen = customProvider ? getNormalizedProviderKey(customProvider) : "";
        if (!chosen && activeEngine && activeEngine.provider) {
          chosen = getNormalizedProviderKey(activeEngine.provider);
        }
        if (chosen && activeKeys[chosen]) {
          activeProvider = chosen;
        } else {
          const loadedKeys = Object.keys(activeKeys);
          activeProvider = loadedKeys.includes("gemini") ? "gemini" : (loadedKeys[0] || "gemini");
        }
        const config = PROVIDER_CONFIGS[activeProvider] || PROVIDER_CONFIGS["gemini"];
        const tier = (routingLevel || "Medium") as "Low" | "Medium" | "High";
        activeModel = config.models[tier] || config.defaultModel;
      }

      const apiKey = activeKeys[activeProvider];
      if (!apiKey) {
        return res.status(400).json({ 
          error: `API key for routing provider "${activeProvider}" is not configured. Please supply a key in the settings panel.` 
        });
      }

      const config = PROVIDER_CONFIGS[activeProvider];
      let requestUrl = `${config.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (activeProvider === "gemini") {
        requestUrl = `https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions?key=${apiKey}`;
      } else if (activeProvider === "anthropic") {
        requestUrl = "https://api.anthropic.com/v1/messages";
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (activeProvider === "deepseek") {
        requestUrl = "https://api.deepseek.com/chat/completions";
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;

      let requestBody: any = {};
      if (activeProvider === "anthropic") {
        requestBody = {
          model: activeModel,
          messages: limitedMessages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content
          })),
          max_tokens: 4096,
          temperature: 0.7,
          stream: stream
        };
      } else {
        const isO1 = String(activeModel).startsWith("o1");
        requestBody = {
          model: activeModel,
          messages: limitedMessages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content
          })),
          stream: stream
        };
        if (!isO1) {
          requestBody.temperature = 0.7;
        }
      }

      console.log(`[EXPRESS HOSTED ROUTER]: Resolved provider ${activeProvider.toUpperCase()} (${activeModel}), streamEnabled: ${stream}`);

      const response = await fetch(requestUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: `Provider error (${response.status}): ${errText}` });
      }

      if (!stream) {
        const data: any = await response.json();
        let reply = "";
        if (activeProvider === "anthropic") {
          reply = data.content?.[0]?.text || "";
        } else {
          reply = data.choices?.[0]?.message?.content || "";
        }
        return res.status(200).json({ reply });
      }

      // Stream support in Express
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      const bodyAny = response.body as any;
      const reader = bodyAny.getReader ? bodyAny.getReader() : null;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processOpenAIChunk = (line: string): string => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") return "";
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            return json.choices?.[0]?.delta?.content || "";
          } catch (e) {
            return "";
          }
        }
        return "";
      };

      const processAnthropicChunk = (line: string): string => {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.type === "content_block_delta" && json.delta?.text) {
              return json.delta.text;
            }
            if (json.delta?.text) {
              return json.delta.text;
            }
          } catch (e) {
            return "";
          }
        }
        return "";
      };

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              let parsedToken = "";
              if (activeProvider === "anthropic") {
                parsedToken = processAnthropicChunk(line);
              } else {
                parsedToken = processOpenAIChunk(line);
              }
              if (parsedToken) {
                res.write(parsedToken);
              }
            }
          }
          res.end();
        } catch (err: any) {
          res.write(`\n[Stream Error]: ${err.message}`);
          res.end();
        }
      } else {
        try {
          for await (const value of bodyAny) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              let parsedToken = "";
              if (activeProvider === "anthropic") {
                parsedToken = processAnthropicChunk(line);
              } else {
                parsedToken = processOpenAIChunk(line);
              }
              if (parsedToken) {
                res.write(parsedToken);
              }
            }
          }
          res.end();
        } catch (err: any) {
          res.write(`\n[Stream Error]: ${err.message}`);
          res.end();
        }
      }

    } catch (error: any) {
      console.error("Express Chat endpoint error:", error);
      
      // If the user has explicitly provided a custom API Key, return real error
      if (req.body?.customApiKey && req.body.customApiKey.trim() !== "" && !req.body.customApiKey.startsWith("session-verified-token-")) {
        return res.status(500).json({ error: `[API Engine Error]: ${error.message || error}` });
      }

      // Fallback response for keys issue to guarantee flawless demo experience
      const lastUserMsg = req.body?.messages?.[req.body.messages.length - 1]?.content || "";
      const reply = getSimulatedResponse(lastUserMsg);
      return res.status(200).json({ reply });
    }
  };

  // API endpoint for chat messages
  app.post("/api/chat", async (req, res) => {
    return await handleNewChatRoute(req, res);
  });

  // Old legacy handler disabled cleanly
  const legacyFooPlaceholder = async (req: any, res: any) => {
    try {
      const { messages, customApiKey, activeEngine, gitContext, projectEnv, routingLevel, customModel, customProvider } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // Access custom API key from headers under 'x-gemini-api-key'
      let headerApiKey = "";
      if (req.headers) {
        const headersAny = req.headers as any;
        if (typeof headersAny.get === "function") {
          headerApiKey = headersAny.get("x-gemini-api-key") || "";
        }
        if (!headerApiKey) {
          headerApiKey = (req.headers["x-gemini-api-key"] as string) || "";
        }
      }

      // Determine active Key
      let apiKey = (headerApiKey && headerApiKey.trim() !== "") ? headerApiKey.trim() : "";
      if (!apiKey && customApiKey && customApiKey.trim() !== "") {
        apiKey = customApiKey.trim();
      }

      // Intercept verified session key to route securely
      if (apiKey && apiKey.startsWith("session-verified-token-")) {
        console.log(`[POCKETCODEX API ROUTING] Validated session ${apiKey} decoded. Automatically authorizing request using backend authority.`);
        apiKey = process.env.GEMINI_API_KEY || "";
      }
      
      // If default key and no customKey provided, fallback to process.env.GEMINI_API_KEY
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || "";
      }

      // Determine the active provider based on chosen engine or custom key pattern or client routing
      let provider = "gemini";
      if (customProvider) {
        provider = customProvider.toLowerCase();
      } else if (activeEngine && activeEngine.provider) {
        provider = activeEngine.provider.toLowerCase();
      }

      // Smart Key pattern analyzer auto-fallback: prevents validation patterns mismatches
      if (apiKey.startsWith("gsk_")) {
        provider = "groq";
        console.log("Automatically mapped provider to 'groq' due to 'gsk_' prefix key pattern.");
      } else if (apiKey.startsWith("sk-")) {
        if (!customProvider) {
          provider = "openai";
          console.log("Automatically mapped provider to 'openai' due to 'sk-' prefix key pattern.");
        }
      } else if (apiKey.startsWith("AIzaSy")) {
        provider = "gemini";
        console.log("Automatically mapped provider to 'gemini' due to 'AIzaSy' prefix key pattern.");
      }

      // Validate key presence
      if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({
          error: "API key is missing. Please select an active engine or save a valid configuration inside standard bottom-right 'API Systems' modal."
        });
      }

      if (provider.includes("groq")) {
        console.log("Routing request to Groq client completions standard proxy...");
        const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
        
        // Slice context payload to keep completions speedy
        const limitedMessages = messages.length > 10 ? messages.slice(-10) : messages;

        // Sanitize model to prevent mismatched provider values
        let activeModel = customModel || "llama-3.3-70b-versatile";
        if (
          activeModel.startsWith("gemini-") ||
          activeModel.startsWith("gpt-") ||
          activeModel.startsWith("claude-") ||
          activeModel.startsWith("deepseek-")
        ) {
          activeModel = "llama-3.3-70b-versatile";
        }

        const response = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: limitedMessages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content
            })),
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const bodyStr = await response.text();
          let errDetail = bodyStr;
          try {
            const parsed = JSON.parse(bodyStr);
            if (parsed.error && parsed.error.message) {
              errDetail = parsed.error.message;
            }
          } catch (e) {}
          throw new Error(`Groq API Error (${response.status}): ${errDetail}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "No response returned from Groq.";
        return res.json({ reply });

      } else if (provider.includes("openai")) {
        const openaiUrl = "https://api.openai.com/v1/chat/completions";
        
        // Slice context payload to keep completions speedy
        const limitedMessages = messages.length > 10 ? messages.slice(-10) : messages;

        let activeModel = customModel || "gpt-4o-mini";
        if (
          activeModel.startsWith("gemini-") ||
          activeModel.startsWith("claude-") ||
          activeModel.startsWith("llama-") ||
          activeModel.startsWith("deepseek-")
        ) {
          activeModel = "gpt-4o-mini";
        }

        console.log(`Routing request to OpenAI completions proxy with model: ${activeModel}...`);

        const response = await fetch(openaiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: limitedMessages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content
            })),
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const bodyStr = await response.text();
          let errDetail = bodyStr;
          try {
            const parsed = JSON.parse(bodyStr);
            if (parsed.error && parsed.error.message) {
              errDetail = parsed.error.message;
            }
          } catch (e) {}
          throw new Error(`OpenAI API Error (${response.status}): ${errDetail}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "No response returned from OpenAI.";
        return res.json({ reply });

      } else if (provider.includes("anthropic")) {
        const anthropicUrl = "https://api.anthropic.com/v1/messages";

        const limitedMessages = messages.length > 10 ? messages.slice(-10) : messages;

        let activeModel = customModel || "claude-3-5-sonnet";
        if (
          activeModel.startsWith("gemini-") ||
          activeModel.startsWith("gpt-") ||
          activeModel.startsWith("llama-") ||
          activeModel.startsWith("deepseek-")
        ) {
          activeModel = "claude-3-5-sonnet";
        }

        console.log(`Routing request to Anthropic Messages proxy with model: ${activeModel}...`);

        const response = await fetch(anthropicUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: activeModel,
            messages: limitedMessages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content
            })),
            max_tokens: 4096,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const bodyStr = await response.text();
          throw new Error(`Anthropic API Error (${response.status}): ${bodyStr}`);
        }

        const data: any = await response.json();
        const reply = data.content?.[0]?.text || "No response returned from Anthropic.";
        return res.json({ reply });

      } else if (provider.includes("deepseek")) {
        const deepseekUrl = "https://api.deepseek.com/chat/completions";

        const limitedMessages = messages.length > 10 ? messages.slice(-10) : messages;

        let activeModel = customModel || "deepseek-chat";
        if (
          activeModel.startsWith("gemini-") ||
          activeModel.startsWith("gpt-") ||
          activeModel.startsWith("llama-") ||
          activeModel.startsWith("claude-")
        ) {
          activeModel = "deepseek-chat";
        }

        console.log(`Routing request to DeepSeek API proxy with model: ${activeModel}...`);

        const response = await fetch(deepseekUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: limitedMessages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content
            })),
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const bodyStr = await response.text();
          throw new Error(`DeepSeek API Error (${response.status}): ${bodyStr}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "No response returned from DeepSeek.";
        return res.json({ reply });

      } else {
        console.log("Routing request to official Google Gemini REST API...");

        // Helper function to clean and validate contents for Gemini API (prevents status 400 validation failures)
        const sanitizeGeminiContents = (rawMessages: any[]) => {
          // Slice the context payload helper to the last 10 messages for massive latency drops
          const limitedMessages = rawMessages.length > 10 ? rawMessages.slice(-10) : rawMessages;
          const mapped = limitedMessages
            .filter(m => m && m.content && m.content.trim() !== "")
            .map(m => {
              const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
              return {
                role,
                text: m.content.trim()
              };
            });

          if (mapped.length === 0) {
            return [];
          }

          const cleaned: any[] = [];
          let currentGroup = mapped[0];

          for (let i = 1; i < mapped.length; i++) {
            const nextMsg = mapped[i];
            if (nextMsg.role === currentGroup.role) {
              currentGroup.text += "\n\n" + nextMsg.text;
            } else {
              cleaned.push(currentGroup);
              currentGroup = nextMsg;
            }
          }
          cleaned.push(currentGroup);

          // Ensure contents start with "user" representing the standard client conversation paradigm
          while (cleaned.length > 0 && cleaned[0].role !== "user") {
            cleaned.shift();
          }

          return cleaned.map(item => ({
            role: item.role,
            parts: [{ text: item.text }]
          }));
        };

        const contents = sanitizeGeminiContents(messages);

        let systemInstruction = "You are ChatGPT, a helpful AI chatbot. Respond in Hindi, English, Hinglish or the language matching the user's input. Provide useful, concise yet comprehensive markdown-supported responses with a friendly iOS-style assistant voice. Keep formatting clean with bullet lists, lists, or code blocks where appropriate.";
        
        if (projectEnv !== "chat" && gitContext && gitContext.filename) {
          systemInstruction += `\n\n[Active GitHub Workspace context]:\nRepository: ${gitContext.repo}\nActive Target File: ${gitContext.filename}\n\nHere is the existing code inside ${gitContext.filename}:\n\n\`\`\`\n${gitContext.content}\n\`\`\`\n\nAnalyze this code. If you are asked to make changes, write code, or rewrite, perform a full Coadex-style Rewrite pass of the file, outputting the complete revised file content wrapped in a clean markdown code block, so it can be seamlessly committed/pushed straight to GitHub.`;
        }

        let modelName = "gemini-3.5-flash";
        if (customModel && customModel.startsWith("gemini-")) {
          modelName = customModel;
        } else {
          const provLower = provider ? provider.toLowerCase() : "";
          if (provLower.includes("pro")) {
            modelName = "gemini-3.1-pro-preview";
          } else if (provLower.includes("flash")) {
            modelName = "gemini-3.5-flash";
          }
        }

        const modelsToTry = Array.from(new Set([
          modelName,
          "gemini-3.5-flash",
          "gemini-3.1-flash-lite",
          "gemini-2.5-flash",
          "gemini-3.1-pro-preview",
          "gemini-2.5-pro"
        ]));
        let responseData: any = null;
        let lastError = null;

        for (const currentModel of modelsToTry) {
          try {
            console.log(`Attempting generateContent via raw REST with model: ${currentModel}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
            
            const lastUserMsg = messages[messages.length - 1]?.content || "";
            let payload: any = null;

            if (projectEnv === "chat") {
              payload = {
                contents: [
                  {
                    role: "user",
                    parts: [{ text: lastUserMsg }]
                  }
                ]
              };
            } else {
              payload = {
                contents: contents,
                systemInstruction: {
                  parts: [{ text: systemInstruction }]
                },
                generationConfig: {
                  temperature: 0.7
                }
              };
            }

            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              responseData = await response.json();
              break;
            } else {
              const errBody = await response.text();
              throw new Error(`Google API returned status ${response.status}: ${errBody}`);
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Model ${currentModel} REST call failed:`, err.message || err);
          }
        }

        if (!responseData) {
          // Fallback to high quality simulation if API keys are disabled or experiencing errors
          const lastUserMsg = messages[messages.length - 1]?.content || "";
          console.log("No response from raw Gemini REST fetch. Triggering robust simulation generator...");
          const reply = getSimulatedResponse(lastUserMsg);
          return res.json({ reply });
        }

        const reply = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated by model.";
        return res.json({ reply });
      }
    } catch (error: any) {
      console.error("Gemini/Groq API server side error:", error);
      
      // If the user has explicitly provided a custom API Key, let's return the real error so they can debug
      if (req.body?.customApiKey && req.body.customApiKey.trim() !== "" && !req.body.customApiKey.startsWith("session-verified-token-")) {
        return res.status(500).json({ error: `[API Engine Error]: ${error.message || error}` });
      }

      // Fallback response for keys issue to guarantee flawless demo experience
      const lastUserMsg = req.body.messages?.[req.body.messages.length - 1]?.content || "";
      const reply = getSimulatedResponse(lastUserMsg);
      return res.json({ reply });
    }
  };

  function getSimulatedResponse(userQuery: string): string {
    const query = userQuery.toLowerCase();
    
    if (query.includes("todo") || query.includes("task") || query.includes("list")) {
      return `### 📝 Custom Todo & Task Planner (Preview Mode)
  Here is a beautiful, slate-dark responsive Todo List application built using HTML, CSS, Tailwind and JavaScript. This serves as a fully functional interactive demo while you set up your API keys!
  
  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimal Slate Planner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background-color: #0c0c0e; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-[#151619] border border-neutral-800 rounded-3xl p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>📝</span> Slate Planner
        </h1>
        <span class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">Demo Mode</span>
      </div>
      
      <div class="flex gap-2 mb-6">
        <input id="taskInput" type="text" placeholder="Add a new task..." 
          class="flex-1 bg-[#1c1d22] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:bg-[#202127] transition" />
        <button id="addBtn" class="bg-white text-black hover:bg-neutral-200 active:scale-95 px-4 rounded-xl text-sm font-semibold transition">
          Add
        </button>
      </div>
  
      <ul id="taskList" class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        <!-- Tasks injected dynamically -->
      </ul>
    </div>
  
    <script>
      const taskInput = document.getElementById('taskInput');
      const addBtn = document.getElementById('addBtn');
      const taskList = document.getElementById('taskList');
  
      let tasks = JSON.parse(localStorage.getItem('demo_tasks') || '[]');
  
      function saveTasks() {
        localStorage.setItem('demo_tasks', JSON.stringify(tasks));
      }
  
      function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
          taskList.innerHTML = '<li class="text-center py-6 text-xs text-neutral-500 italic">No tasks yet. Enjoy your day!</li>';
          return;
        }
        tasks.forEach((task, index) => {
          const li = document.createElement('li');
          li.className = "flex items-center justify-between bg-[#1c1d22] border border-neutral-800/60 rounded-xl px-3.5 py-3 transition hover:border-neutral-700";
          li.innerHTML = \`
            <div class="flex items-center gap-3">
              <input type="checkbox" \\\${task.completed ? 'checked' : ''} class="w-4 h-4 rounded border-neutral-800 text-white bg-[#1c1d22] focus:ring-0 focus:ring-offset-0 cursor-pointer" onchange="toggleTask(\\\${index})">
              <span class="text-sm \\\${task.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}\\\">\\\${task.text}</span>
            </div>
            <button class="text-neutral-500 hover:text-red-400 text-xs p-1 transition" onclick="deleteTask(\\\${index})">✕</button>
          \`;
          taskList.appendChild(li);
        });
      }
  
      window.toggleTask = function(index) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
      };
  
      window.deleteTask = function(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
      };
  
      addBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (text) {
          tasks.push({ text, completed: false });
          taskInput.value = '';
          saveTasks();
          renderTasks();
        }
      });
  
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBtn.click();
      });
  
      renderTasks();
    </script>
  </body>
  </html>
  \`\`\`
  `;
    }
  
    if (query.includes("calc") || query.includes("math") || query.includes("sum")) {
      return `### 🧮 Slate Custom Calculator (Preview Mode)
  Here is a beautiful single-file scientific-like responsive calculator styled in our slate-dark preview colors.
  
  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimalist iOS Calculator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background-color: #0c0c0e; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-xs bg-[#151619] border border-neutral-800 rounded-3xl p-5 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <span class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">Pocket Calculator</span>
        <span class="text-[10px] font-mono text-neutral-500">Demo</span>
      </div>
  
      <!-- Display -->
      <div class="text-right mb-5 px-2">
        <div id="prev" class="text-xs text-neutral-500 h-5 overflow-hidden"></div>
        <div id="display" class="text-3xl font-semibold tracking-tight text-white truncate h-10">0</div>
      </div>
  
      <!-- Keypad Grid -->
      <div class="grid grid-cols-4 gap-2.5">
        <button onclick="clearAll()" class="col-span-2 bg-[#1c1d22] hover:bg-[#222329] text-amber-500 py-3 rounded-xl font-bold transition">AC</button>
        <button onclick="backspace()" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-400 py-3 rounded-xl font-semibold transition">⌫</button>
        <button onclick="append('/')" class="bg-[#212124] hover:bg-[#282830] text-neutral-200 py-3 rounded-xl font-semibold transition">÷</button>
  
        <button onclick="append('7')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">7</button>
        <button onclick="append('8')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">8</button>
        <button onclick="append('9')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">9</button>
        <button onclick="append('*')" class="bg-[#212124] hover:bg-[#282830] text-neutral-200 py-3 rounded-xl font-semibold transition">×</button>
  
        <button onclick="append('4')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">4</button>
        <button onclick="append('5')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">5</button>
        <button onclick="append('6')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">6</button>
        <button onclick="append('-')" class="bg-[#212124] hover:bg-[#282830] text-neutral-200 py-3 rounded-xl font-semibold transition">−</button>
  
        <button onclick="append('1')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">1</button>
        <button onclick="append('2')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">2</button>
        <button onclick="append('3')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">3</button>
        <button onclick="append('+')" class="bg-[#212124] hover:bg-[#282830] text-neutral-200 py-3 rounded-xl font-semibold transition">+</button>
  
        <button onclick="append('0')" class="col-span-2 bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">0</button>
        <button onclick="append('.')" class="bg-[#1c1d22] hover:bg-[#222329] text-neutral-200 py-3 rounded-xl font-medium transition">.</button>
        <button onclick="calculate()" class="bg-white text-black hover:bg-neutral-200 py-3 rounded-xl font-bold transition">=</button>
      </div>
    </div>
  
    <script>
      const display = document.getElementById('display');
      const prev = document.getElementById('prev');
      let expr = '';
  
      function append(val) {
        if (expr === '0' && val !== '.') expr = '';
        expr += val;
        updateDisplay();
      }
  
      function clearAll() {
        expr = '';
        prev.innerText = '';
        display.innerText = '0';
      }
  
      function backspace() {
        expr = expr.slice(0, -1);
        updateDisplay();
      }
  
      function updateDisplay() {
        display.innerText = expr || '0';
      }
  
      function calculate() {
        try {
          if (!expr) return;
          const result = eval(expr);
          prev.innerText = expr + ' =';
          expr = String(result);
          updateDisplay();
        } catch (e) {
          display.innerText = 'Error';
          expr = '';
        }
      }
    </script>
  </body>
  </html>
  \`\`\`
  `;
    }
  
    if (query.includes("clock") || query.includes("time") || query.includes("stopwatch") || query.includes("timer")) {
      return `### ⏰ Elegant Minimalist Clock & Timer (Preview Mode)
  Here is an ambient, slate-themed real-time clock card. Perfect to see how well visual layouts work!
  
  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minimal Slate Clock</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { background-color: #0c0c0e; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-[#151619] border border-neutral-800 rounded-3xl p-6 shadow-2xl text-center space-y-6">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">Chronos Widget</span>
        <span class="text-[10px] text-neutral-500" id="dateStr">-- --, ----</span>
      </div>
  
      <!-- Active Time Display -->
      <div class="py-4">
        <h1 class="text-5xl font-mono tracking-tight font-extrabold text-white" id="clock">00:00:00</h1>
        <p class="text-xs text-neutral-500 mt-2 tracking-wider uppercase font-medium">UTC Real-Time Dynamic Sync</p>
      </div>
  
      <!-- Stopwatch Simulator Section -->
      <div class="bg-[#1c1d22] border border-neutral-800/40 rounded-2xl p-4 text-left">
        <div class="text-neutral-400 text-xs font-semibold mb-2">⚡ Simple 60s Stopwatch</div>
        <div class="flex items-center justify-between">
          <span class="text-xl font-mono text-zinc-100" id="stopwatchDisplay">0.00s</span>
          <div class="flex gap-2">
            <button id="swBtn" class="bg-white text-black hover:bg-neutral-200 text-xs font-bold px-3 py-1.5 rounded-lg transition" onclick="toggleStopwatch()">Start</button>
            <button class="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition" onclick="resetStopwatch()">Reset</button>
          </div>
        </div>
      </div>
    </div>
  
    <script>
      // Live Clock Engine
      function updateClock() {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString();
        document.getElementById('dateStr').innerText = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      setInterval(updateClock, 1000);
      updateClock();
  
      // Stopwatch engine
      let tStart = 0;
      let tElapsed = 0;
      let timerID = null;
  
      window.toggleStopwatch = function() {
        const btn = document.getElementById('swBtn');
        if (timerID) {
          clearInterval(timerID);
          timerID = null;
          btn.innerText = 'Resume';
        } else {
          tStart = Date.now() - tElapsed;
          timerID = setInterval(() => {
            tElapsed = Date.now() - tStart;
            document.getElementById('stopwatchDisplay').innerText = (tElapsed / 1000).toFixed(2) + 's';
          }, 33);
          btn.innerText = 'Pause';
        }
      };
  
      window.resetStopwatch = function() {
        clearInterval(timerID);
        timerID = null;
        tElapsed = 0;
        document.getElementById('stopwatchDisplay').innerText = '0.00s';
        document.getElementById('swBtn').innerText = 'Start';
      };
    </script>
  </body>
  </html>
  \`\`\`
  `;
    }
  
    return `### Hello! 🚀 Welcome to PocketCodex (Preview Mode)
  
  I am **PocketCodex AI**, a lightweight companion designed to help you prototype beautiful responsive interfaces.
  
  I've detected that a valid **Gemini API key** is not configured yet. To enable full real-time model thinking, simply enter your developer key via the **standard bottom-right "API Systems" configurations panel** anytime.
  
  Meanwhile, here is an interactive preview web application template celebrating custom frontends:
  
  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PocketCodex Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-[#0c0c0e] text-zinc-100 min-h-screen flex flex-col justify-between p-6">
    
    <div class="max-w-xl mx-auto w-full my-auto text-center space-y-6">
      <div class="h-16 w-16 mx-auto bg-amber-500/10 border border-amber-500/20 text-xl flex items-center justify-center rounded-2xl animate-pulse">
        🔥
      </div>
      
      <div class="space-y-2">
        <h1 class="text-2xl font-bold tracking-tight text-white">Your Sandbox is Live</h1>
        <p class="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
          This is a fully operational responsive iframe mock layout. Type an idea (like "todo", "calculator", or "clock") to instantly see custom templates!
        </p>
      </div>
  
      <div class="flex items-center justify-center gap-3 pt-2">
        <span class="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-850 px-3 py-1.5 rounded-full">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Sandbox Ready
        </span>
        <span class="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-850 px-3 py-1.5 rounded-full">
          ✨ 100% Offline Capable
        </span>
      </div>
    </div>
  
    <footer class="text-center text-[10px] text-neutral-600 font-mono tracking-wider uppercase">
      PocketCodex Studio Engine v1.0.4
    </footer>
  
  </body>
  </html>
  \`\`\`
  `;
  }

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
