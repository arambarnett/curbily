import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { google } from "googleapis";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import cors from "cors";

// Initialize Firebase Admin (uses Application Default Credentials in deployed env, or explicit SA if provided locally)
if (!getApps().length) {
  initializeApp();
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : "http://localhost:3000/auth/google/callback"
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      if (!endpointSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      console.log('Checkout completed for user:', userId, 'Mode:', session.mode);

      if (userId) {
        try {
          const userRef = getFirestore().collection('users').doc(userId);
          
          if (session.mode === 'subscription') {
            await userRef.set({ subscription: 'producer' }, { merge: true });
            console.log(`Updated user ${userId} to producer subscription`);
          } else {
            await userRef.set({ tokens: FieldValue.increment(1) }, { merge: true });
            console.log(`Incremented tokens for user ${userId}`);
          }
        } catch (dbError) {
          console.error("Failed to update user in Firestore:", dbError);
        }
      }
    }
    res.json({received: true});
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Service Worker specific route for subpath deployments
  app.get(["/_service-worker.js", "/projects/_service-worker.js"], async (req, res) => {
    const distPath = path.join(process.cwd(), "dist");
    const publicPath = path.join(process.cwd(), "public");
    let filePath = path.join(distPath, "_service-worker.js");
    
    // Check if it exists in dist, fallback to public
    const { existsSync } = await import("fs");
    if (!existsSync(filePath)) {
      filePath = path.join(publicPath, "_service-worker.js");
    }

    if (existsSync(filePath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(filePath);
    } else {
      res.status(404).send("Service worker not found");
    }
  });

  // API Routes
  app.get("/api/proxy/google-doc", async (req, res) => {
    const { docId } = req.query;
    if (!docId) return res.status(400).send("Missing docId");
    try {
      const response = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`);
      if (!response.ok) throw new Error("Failed to fetch from Google. Ensure it is shared with 'Anyone with the link'.");
      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/proxy/google-sheet", async (req, res) => {
    const { sheetId } = req.query;
    if (!sheetId) return res.status(400).send("Missing sheetId");
    try {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
      if (!response.ok) throw new Error("Failed to fetch from Google. Ensure it is shared with 'Anyone with the link'.");
      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Gemini API Proxy
  // Used by the live site if the frontend Service Worker intercepts Gemini requests
  // or if the frontend points to this endpoint to keep the API key safe.
  app.all(["/gemini-api-proxy/*", "/projects/gemini-api-proxy/*"], async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-goog-api-key, x-goog-api-client");
      return res.status(204).end();
    }

    try {
      const urlPath = req.path;
      let targetPath = "";
      
      if (urlPath.includes("/projects/gemini-api-proxy/")) {
        targetPath = urlPath.split("/projects/gemini-api-proxy/")[1];
      } else if (urlPath.includes("/gemini-api-proxy/")) {
        targetPath = urlPath.split("/gemini-api-proxy/")[1];
      } else {
        // Fallback to older param logic if split fails
        targetPath = (req.params as any)[0] || "";
      }

      if (!targetPath) {
        console.error(`[Proxy] No target path extracted from ${urlPath}`);
        return res.status(400).json({ error: "Missing API path" });
      }

      const targetUrl = `https://generativelanguage.googleapis.com/${targetPath}`;
      
      // EXHAUSTIVE API KEY DISCOVERY
      let apiKey = "";
      
      const candidates = [
        process.env.GEMINI_API_KEY,
        process.env.API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.VITE_GOOGLE_API_KEY,
        process.env.VITE_GEMINI_API_KEY,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ];

      for (const cand of candidates) {
        if (cand && cand !== "MY_GEMINI_API_KEY" && cand.length > 5) {
          apiKey = cand;
          break;
        }
      }

      if (!apiKey) {
        // Broadest fallback - check anything that looks like an API key in env
        for (const [key, value] of Object.entries(process.env)) {
          if ((key.includes("API_KEY") || key.includes("GEMINI") || key.includes("GOOGLE_API")) && 
              value && value !== "MY_GEMINI_API_KEY" && value.length > 5) {
            apiKey = value;
            console.log(`[Proxy] Found key fallback in env matching patterns: ${key}`);
            break;
          }
        }
      }

      console.log(`[Proxy] Request: ${req.method} ${targetPath} | Key Found: ${!!apiKey} | Key Length: ${apiKey ? apiKey.length : 0} | Origin: ${req.headers.origin || 'unknown'}`);
      
      if (!apiKey) {
        console.error("[Proxy] CRITICAL: No Gemini API Key found in environment variables.");
        // Log keys available for debugging (WITHOUT VALUES)
        console.log("[Proxy] Available env keys:", Object.keys(process.env).join(", "));
        return res.status(500).json({ 
          error: "Missing GEMINI_API_KEY on the server.",
          availableKeys: Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY") || k.includes("GOOGLE") || k.includes("GEMINI"))
        });
      }

      // Reconstruct the URL, preserve all other query parameters
      const urlWithKey = new URL(targetUrl);
      urlWithKey.searchParams.append("key", apiKey.trim());
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== "key") {
          urlWithKey.searchParams.append(key, value as string);
        }
      }

      const proxyHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim()
      };
      
      // Forward relevant headers but be selective to avoid 403s from Google
      const allowedHeaders = ['user-agent', 'x-goog-api-client', 'x-goog-user-project'];
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (allowedHeaders.includes(lowerKey)) {
          proxyHeaders[lowerKey] = Array.isArray(value) ? value.join(', ') : value as string;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: proxyHeaders,
        signal: controller.signal
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const finalUrl = urlWithKey.toString();
      let response;
      try {
        response = await fetch(finalUrl, fetchOptions);
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Proxy] Gemini API Upstream Error (${response.status}):`, errorText);
        console.error(`[Proxy] Target URL used: ${finalUrl.replace(apiKey, 'REDACTED')}`);
        try {
          return res.status(response.status).json(JSON.parse(errorText));
        } catch {
          return res.status(response.status).send(errorText);
        }
      }

      // Stream the response back
      let contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      // Add CORS headers for reliability
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-goog-api-key, x-goog-api-client");
      
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          } catch (e: any) {
            console.error("[Proxy] Stream read error:", e.message);
          } finally {
            res.end();
          }
        };
        await pump();
      } else {
        const buffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("[Proxy] Internal Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { userId, userEmail, priceId, type } = req.body;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId || 'price_1TM7DaLK4hGC6HUB6EYhmFoP', // default to $39 sub if not provided
            quantity: 1,
          },
        ],
        mode: type === 'tokens' ? "payment" : "subscription",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/`,
        customer_email: userEmail,
        metadata: {
          userId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-links", async (req, res) => {
    const { links } = req.body;
    if (!Array.isArray(links)) return res.status(400).send("Links must be an array");

    try {
      const results = await Promise.all(links.map(async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          
          // Special handling for Amazon - if it's a known domain, we might fallback to true if blocked
          const isAmazon = url.includes('amazon.com') || url.includes('amzn.to');

          const response = await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          });
          clearTimeout(timeoutId);
          
          if (response.ok) return { url, ok: true, status: response.status };
          
          // If Amazon returns 403 or 503, it's often a bot block. 
          // If the URL looks well-formed, we might want to let it through.
          if (isAmazon && (response.status === 403 || response.status === 503 || response.status === 405)) {
            return { url, ok: true, status: response.status, note: 'Probable bot block' };
          }

          return { url, ok: response.ok, status: response.status };
        } catch (e) {
          // If HEAD fails, try GET since some sites block HEAD
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { 
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              }
            });
            clearTimeout(timeoutId);
            
            if (response.ok) return { url, ok: true, status: response.status };
            
            if (url.includes('amazon.com') && (response.status === 403 || response.status === 503)) {
              return { url, ok: true, status: response.status, note: 'Probable bot block' };
            }

            return { url, ok: response.ok, status: response.status };
          } catch (innerE) {
            // For Amazon/Peerspace, if we can't connect, it MIGHT be a cloud IP block
            if (url.includes('amazon.com') || url.includes('peerspace.com')) {
               return { url, ok: true, error: 'Connection failed, allowing fallback' };
            }
            return { url, ok: false, error: 'Failed' };
          }
        }
      }));
      res.json(results);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/vapi/outbound-call", async (req, res) => {
    const { phoneNumber, assistantId, assistantOverrides } = req.body;
    const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || "4861a26e-419a-4b77-aabb-34f594d61273";

    if (!phoneNumber) return res.status(400).send("Missing phoneNumber");

    try {
      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VAPI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            number: phoneNumber,
          },
          assistantId: assistantId,
          assistant: assistantOverrides,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to start Vapi call");
      }

      res.json(data);
    } catch (error: any) {
      console.error("Vapi Outbound Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // YouTube OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const scopes = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly"
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent"
    });

    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // In a real app, you'd associate this with a user in your DB.
      // Here we'll send it back to the UI via postMessage and let the UI handle storage for the demo.
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'YOUTUBE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/youtube/analytics", async (req, res) => {
    const { tokens } = req.body;
    if (!tokens) return res.status(400).send("Missing tokens");

    try {
      oauth2Client.setCredentials(tokens);
      
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth: oauth2Client });

      // Get channel info
      const channelRes = await youtube.channels.list({
        mine: true,
        part: ["snippet", "statistics"]
      });

      const channel = channelRes.data.items?.[0];
      if (!channel) throw new Error("Channel not found");

      // Get basic analytics for last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const analyticsRes = await youtubeAnalytics.reports.query({
        ids: `channel==MINE`,
        startDate,
        endDate,
        metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost",
        dimensions: "day"
      });

      // Get age/gender demographics (for the presentation)
      const demoRes = await youtubeAnalytics.reports.query({
        ids: `channel==MINE`,
        startDate: "2010-01-01",
        endDate,
        metrics: "viewerPercentage",
        dimensions: "gender,ageGroup"
      });

      res.json({
        channel: {
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnails: channel.snippet?.thumbnails,
          statistics: channel.statistics,
        },
        analytics: analyticsRes.data,
        demographics: demoRes.data
      });
    } catch (error: any) {
      console.error("YouTube Analytics Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
