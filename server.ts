import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const BACKEND_PORT = 5000;

// 1. Launch & Manage Python Flask Process
let pythonProcess: ChildProcess | null = null;

function ensurePythonDependencies() {
  try {
    execSync('python3 -c "import flask, flask_jwt_extended, pymysql" 2>/dev/null');
    return true;
  } catch {
    console.log('[ResolveX Supervisor] Python dependencies missing. Installing in background...');
    try {
      execSync(
        'DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" python3-pip python3-flask python3-flask-cors python3-flask-sqlalchemy python3-dotenv python3-werkzeug && python3 -m pip install -q flask-jwt-extended pymysql joblib scikit-learn --break-system-packages',
        { stdio: 'inherit' }
      );
      return true;
    } catch (installErr) {
      console.error('[ResolveX Supervisor] Dependency install error:', installErr);
      return false;
    }
  }
}

function startFlaskBackend() {
  ensurePythonDependencies();
  console.log('[ResolveX Supervisor] Spawning Flask backend (backend/run.py)...');
  pythonProcess = spawn('python3', ['backend/run.py'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, BACKEND_PORT: String(BACKEND_PORT), BACKEND_HOST: '127.0.0.1' },
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[ResolveX Supervisor] Flask backend exited with code ${code} (${signal}).`);
    // Auto-restart if exited unexpectedly
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log('[ResolveX Supervisor] Restarting Flask backend in 2 seconds...');
      setTimeout(startFlaskBackend, 2000);
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('[ResolveX Supervisor] Failed to start Flask process:', err);
  });
}

startFlaskBackend();

// Clean up child process on exit
const cleanup = () => {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('[ResolveX Supervisor] Terminating Flask child process...');
    pythonProcess.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// 2. Reverse Proxy /api/* to Flask on Port 5000 with CORS and startup retry resilience
app.use('/api', (req: Request, res: Response) => {
  // Always handle CORS headers for dev/preview iframe domains
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Buffer request body to allow retry if backend is still spinning up
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  req.on('end', () => {
    const bodyBuffer = Buffer.concat(chunks);
    let attempts = 0;
    const maxAttempts = 6;

    const tryProxy = () => {
      attempts++;
      const headers = { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` };
      if (bodyBuffer.length > 0) {
        headers['content-length'] = String(bodyBuffer.length);
      }

      const options: http.RequestOptions = {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: req.originalUrl,
        method: req.method,
        headers,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        const responseHeaders = { ...proxyRes.headers };
        if (req.headers.origin) {
          responseHeaders['access-control-allow-origin'] = req.headers.origin;
          responseHeaders['access-control-allow-credentials'] = 'true';
        }
        res.writeHead(proxyRes.statusCode || 500, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED' && attempts < maxAttempts) {
          setTimeout(tryProxy, 400);
          return;
        }
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message: 'ResolveX API engine is initializing. Please retry in a moment.',
            error: err.message,
          });
        }
      });

      if (bodyBuffer.length > 0) {
        proxyReq.write(bodyBuffer);
      }
      proxyReq.end();
    };

    tryProxy();
  });
});

// 3. Vite Middleware (Dev) or Static Assets (Prod)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ResolveX Full-Stack] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
