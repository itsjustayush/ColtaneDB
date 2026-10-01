import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lex, parse } from './packages/parser/src/index.ts';
import { compile, postgresCapabilities } from './packages/compiler/src/index.ts';
import { createColtaneApi } from './packages/api/src/index.ts';
import hello from './hello.ts';

const apiSystem = createColtaneApi();
apiSystem.authService.createInvite('COLTANE-ALPHA-2026', 720);
const seedResult = apiSystem.authService.verifyInvite('COLTANE-ALPHA-2026', 'developer@coltanedb.dev');
let defaultProjectId = '';
if (seedResult.user) {
  const seedProject = await apiSystem.projectService.createProject({
    name: 'Default Workspace',
    ownerId: seedResult.user.id,
  });
  defaultProjectId = seedProject.tenantId;
}

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
const HOST = '0.0.0.0';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > 5e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolveBody(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

async function getExampleCode(): Promise<string> {
  try {
    return await readFile(resolve(process.cwd(), 'examples/library.colt'), 'utf8');
  } catch {
    return `-- Colt v0.1 Example: Library Catalogue
DEFINE COLLECTION authors STRICT @backend(neon) {
  id: uuid @key,
  name: text @unique,
  joined: time @default(now)
}

DEFINE COLLECTION books STRICT @backend(neon) {
  id: uuid @key,
  title: text,
  author: link<authors>,
  tags: list<text>,
  published: time?,
  metadata: doc,
  embedding: vector(3) @index(hnsw),
  views: int @default(0)
}

FIND books SELECT title, author, metadata.edition
WHERE views > 10 AND published != null
ORDER BY views DESC
LIMIT 20 OFFSET 0`;
  }
}

function getProvidersStatus() {
  return [
    {
      id: 'neon',
      name: 'PostgreSQL plan target',
      role: 'Colt compiler output; no database connection or execution.',
      status: 'plan-only',
      target: '@backend(neon)',
      features: ['Schema and query plan generation'],
    },
    {
      id: 'redis',
      name: 'Upstash Redis',
      role: 'Adapter planned; not available in this preview.',
      status: 'planned',
      target: '@backend(redis)',
      features: [],
    },
    {
      id: 'mongodb',
      name: 'MongoDB Atlas',
      role: 'Adapter planned; not available in this preview.',
      status: 'planned',
      target: '@backend(mongodb)',
      features: [],
    },
    {
      id: 'firebase',
      name: 'Firebase Firestore',
      role: 'Adapter planned; not available in this preview.',
      status: 'planned',
      target: '@backend(firestore)',
      features: [],
    },
  ];
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // 0. API v1 routes (Milestone 3 & 4)
    if (url.pathname === '/api/v1/default-project') {
      sendJson(res, 200, { tenantId: defaultProjectId });
      return;
    }
    if (url.pathname.startsWith('/api/v1/')) {
      let body: unknown = undefined;
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const raw = await readBody(req);
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            sendJson(res, 400, { error: 'Invalid JSON body' });
            return;
          }
        }
      }
      const apiHeaders: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') apiHeaders[k.toLowerCase()] = v;
      }
      const apiResponse = await apiSystem.router.handle({
        method: req.method ?? 'GET',
        path: url.pathname,
        headers: apiHeaders,
        body,
      });
      sendJson(res, apiResponse.status, apiResponse.body);
      return;
    }

    // 1. Neon function route
    if (url.pathname === '/api/hello' || url.pathname === '/neon') {
      const helloResponse = await hello();
      const text = await helloResponse.text();
      res.writeHead(helloResponse.status, {
        'Content-Type': helloResponse.headers.get('content-type') || 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(text);
      return;
    }

    // 2. Colt example file
    if (url.pathname === '/api/example' || url.pathname === '/examples/library.colt') {
      const example = await getExampleCode();
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(example);
      return;
    }

    // 3. Colt capabilities
    if (url.pathname === '/api/capabilities') {
      sendJson(res, 200, postgresCapabilities);
      return;
    }

    // 4. Providers status
    if (url.pathname === '/api/providers') {
      sendJson(res, 200, getProvidersStatus());
      return;
    }

    // 5. Colt plan / check
    if (url.pathname === '/api/plan' || url.pathname === '/api/check') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as { source?: string }) : { source: '' };
      const source = typeof body.source === 'string' ? body.source : '';
      const result = compile(source);
      sendJson(res, 200, result);
      return;
    }

    // 6. Colt parse
    if (url.pathname === '/api/parse') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as { source?: string }) : { source: '' };
      const source = typeof body.source === 'string' ? body.source : '';
      const parsed = parse(source);
      sendJson(res, 200, { ast: parsed.program, diagnostics: parsed.diagnostics });
      return;
    }

    // 7. Colt lex
    if (url.pathname === '/api/lex') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as { source?: string }) : { source: '' };
      const source = typeof body.source === 'string' ? body.source : '';
      const lexed = lex(source);
      sendJson(res, 200, { tokens: lexed.tokens, diagnostics: lexed.diagnostics });
      return;
    }

    // 8. Import .colt file API
    if (url.pathname === '/api/import') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as { source?: string; filename?: string }) : { source: '' };
      const source = typeof body.source === 'string' ? body.source : '';
      const parsed = parse(source);
      const compiled = compile(source);
      sendJson(res, 200, {
        success: parsed.diagnostics.length === 0 && compiled.diagnostics.length === 0,
        filename: body.filename || 'imported.colt',
        source,
        diagnostics: compiled.diagnostics,
        plan: compiled.plan,
        ast: parsed.program,
      });
      return;
    }

    // Health check endpoint for container and platform proxies
    if (url.pathname === '/health' || url.pathname === '/healthz' || url.pathname === '/api/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      }
      return;
    }

    // 9. Web UI & Documentation pages (serve index.html for SPA routing)
    if (req.method === 'GET' || req.method === 'HEAD') {
      const html = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html),
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(html);
      }
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: errorMsg });
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please terminate the conflicting process.`);
  } else {
    console.error('Server error:', err);
  }
});

if (!process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    console.log(`ColtaneDB dev server listening at http://${HOST}:${PORT}`);
  });
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  server.emit('request', req, res);
}

