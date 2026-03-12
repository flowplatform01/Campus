import { config } from "./config.js";

import express, { type Request, Response, NextFunction } from "express";

import { registerRoutes } from "./routes/index.js";

import { log, serveStatic } from "./vite-production.ts";


import cors from "cors";


const app = express();



process.on("unhandledRejection", (reason) => {

  console.error("Unhandled Promise rejection:", reason);

});



process.on("uncaughtException", (err) => {

  console.error("Uncaught exception:", err);

});



// Dynamic CORS configuration for production

const allowedOrigins = [

  process.env.CLIENT_URL || 'http://localhost:5173',

  // Add Render frontend URL dynamically in production

];



app.use(cors({

  origin: function (origin, callback) {

    // Allow requests with no origin (like mobile apps or curl requests)

    if (!origin) return callback(null, true);

    

    // In development, allow localhost

    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {

      return callback(null, true);

    }

    

    // Allow configured origins

    if (allowedOrigins.includes(origin)) {

      return callback(null, true);

    }

    

    // Allow Render subdomains dynamically

    if (origin.includes('.onrender.com')) {

      return callback(null, true);

    }

    

    callback(new Error('Not allowed by CORS'));

  },

  credentials: true

}));



declare module 'http' {

  interface IncomingMessage {

    rawBody: unknown

  }

}

app.use(express.json({

  verify: (req, _res, buf) => {

    req.rawBody = buf;

  }

}));

app.use(express.urlencoded({ extended: false }));



app.use((req, res, next) => {

  const start = Date.now();

  const path = req.path;

  let capturedJsonResponse: Record<string, any> | undefined = undefined;



  const originalResJson = res.json;

  res.json = function (bodyJson, ...args) {

    capturedJsonResponse = bodyJson;

    return originalResJson.apply(res, [bodyJson, ...args]);

  };



  res.on("finish", () => {

    const duration = Date.now() - start;

    if (path.startsWith("/api")) {

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {

        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;

      }



      if (logLine.length > 80) {

        logLine = logLine.slice(0, 79) + "…";

      }



      log(logLine);

    }

  });



  next();

});



(async () => {

  const server = await registerRoutes(app);

  app.get("/", (_req, res) => {
    res.redirect("/api/health");
  });



  app.use("/api", (req, res) => {

    res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });

  });



  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {

    const status = err.status || err.statusCode || 500;

    const message = err.message || "Internal Server Error";



    res.status(status).json({ message });

    return;

  });



  // When RUN_SERVER_ONLY=1 (separate dev: server on 3001, client on 5000), skip Vite/static

  const runServerOnly = process.env.RUN_SERVER_ONLY === "1";

  const port = config.port;

  if (runServerOnly) {

    // API-only mode - no frontend serving

    console.log(`[Express] Running in API-only mode on port ${port}`);

  } else if (app.get("env") === "development") {

    // Import setupVite only in development

    const { setupVite } = await import("./vite-development.ts");

    await setupVite(app, server);

  } else {

    const serveClient = process.env.SERVE_CLIENT === "1";
    if (serveClient) {
      serveStatic(app);
    } else {
      console.log("[Express] Production API-only mode (SERVE_CLIENT not enabled)");
    }

  }



  // ALWAYS serve the app on the port specified in the environment variable PORT

  // Other ports are firewalled. Default to 5000 if not specified.

  // this serves both the API and the client.

  // It is the only port that is not firewalled.

  server.listen({

    port,

    host: "0.0.0.0",

    reusePort: true,

  }, () => {

    log(`serving on port ${port}`);

  });

})();

