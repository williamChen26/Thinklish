import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ResolvedEntry } from './acp-agents';
import type { SessionNotification } from '@agentclientprotocol/sdk';

export interface AcpCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export interface AcpQueryHandle {
  cancel: () => void;
}

let _loginShellEnv: Record<string, string> | null = null;

function getLoginShellEnv(): Record<string, string> {
  if (_loginShellEnv) return _loginShellEnv;

  const candidates = [process.env['SHELL'], '/bin/zsh', '/bin/bash'].filter(Boolean) as string[];
  for (const sh of candidates) {
    try {
      const raw = execSync(`${sh} -lic "env"`, {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const env: Record<string, string> = {};
      for (const line of raw.split('\n')) {
        const idx = line.indexOf('=');
        if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
      }
      if (env['PATH']) {
        _loginShellEnv = env;
        console.log('[acp-conn] login shell env loaded from', sh);
        return env;
      }
    } catch {
      continue;
    }
  }
  console.warn('[acp-conn] failed to load login shell env');
  return {};
}

function findNodeBinary(): string {
  const shellEnv = getLoginShellEnv();
  const pathDirs = (shellEnv['PATH'] ?? process.env['PATH'] ?? '').split(':');

  for (const dir of pathDirs) {
    const candidate = join(dir, 'node');
    if (existsSync(candidate)) {
      console.log(`[acp-conn] found node binary: ${candidate}`);
      return candidate;
    }
  }

  console.warn('[acp-conn] node not found in PATH, falling back to process.execPath + ELECTRON_RUN_AS_NODE');
  return process.execPath;
}

function spawnAdapter(entry: ResolvedEntry): ChildProcess {
  const shellEnv = getLoginShellEnv();
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...shellEnv,
    TERM: 'dumb',
  };

  if (entry.kind === 'native') {
    const args = entry.acpArgs ?? [];
    console.log(`[acp-conn] spawning native binary: ${entry.filePath} ${args.join(' ')}`.trimEnd());
    return spawn(entry.filePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });
  }

  const isInAsar = /[/\\]app\.asar[/\\]/.test(entry.filePath);
  if (isInAsar) {
    env['ELECTRON_RUN_AS_NODE'] = '1';
    console.log(`[acp-conn] spawning node adapter (electron-as-node, asar): ${entry.filePath}`);
    return spawn(process.execPath, [entry.filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });
  }

  const nodePath = findNodeBinary();
  const useElectronAsNode = nodePath === process.execPath;
  if (useElectronAsNode) {
    env['ELECTRON_RUN_AS_NODE'] = '1';
  }
  console.log(`[acp-conn] spawning node adapter: ${nodePath} ${entry.filePath} (electron_as_node=${useElectronAsNode})`);
  return spawn(nodePath, [entry.filePath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });
}

function nodeToWebWritable(proc: ChildProcess): WritableStream<Uint8Array> {
  return new WritableStream<Uint8Array>({
    write(chunk) {
      return new Promise<void>((resolve, reject) => {
        proc.stdin!.write(Buffer.from(chunk), (err) =>
          err ? reject(err) : resolve()
        );
      });
    },
  });
}

function nodeToWebReadable(proc: ChildProcess): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      proc.stdout!.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      proc.stdout!.on('end', () => controller.close());
      proc.stdout!.on('error', (err) => controller.error(err));
    },
  });
}

function killProcess(proc: ChildProcess): void {
  if (proc.exitCode === null) {
    try { proc.kill(); } catch { /* already dead */ }
  }
}

async function executeQuery(
  entry: ResolvedEntry,
  prompt: string,
  callbacks: AcpCallbacks,
  registerCancel: (fn: () => void) => void,
): Promise<void> {
  console.log('[acp-conn] step 1: importing ACP SDK...');
  const acp = await import('@agentclientprotocol/sdk');
  console.log('[acp-conn] step 2: ACP SDK imported, spawning adapter...');

  const proc = spawnAdapter(entry);
  console.log(`[acp-conn] step 3: adapter spawned, pid=${proc.pid}`);

  proc.on('exit', (code, signal) => {
    console.log(`[acp-conn] adapter process exited: code=${code}, signal=${signal}`);
  });

  proc.on('error', (err) => {
    console.error(`[acp-conn] adapter process error:`, err.message);
  });

  proc.stderr?.on('data', (data: Buffer) => {
    console.error(`[acp-stderr] ${data.toString().trim()}`);
  });

  const output = nodeToWebWritable(proc);
  const input = nodeToWebReadable(proc);
  const stream = acp.ndJsonStream(output, input);

  let fullText = '';
  let chunkCount = 0;

  const conn = new acp.ClientSideConnection(
    () => ({
      sessionUpdate: async (params: SessionNotification) => {
        const update = params.update;
        if (update.sessionUpdate === 'agent_message_chunk') {
          const content = update.content;
          if (content.type === 'text' && 'text' in content) {
            const text = String(content.text);
            fullText += text;
            chunkCount++;
            if (chunkCount <= 3) {
              console.log(`[acp-conn] chunk #${chunkCount}: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
            }
            callbacks.onChunk(text);
          }
        } else {
          console.log(`[acp-conn] session update: ${update.sessionUpdate}`);
        }
      },
      requestPermission: async () => {
        console.log('[acp-conn] requestPermission called, auto-approving');
        return {
          outcome: { outcome: 'selected' as const, optionId: 'allow' },
        };
      },
    }),
    stream,
  );

  try {
    console.log('[acp-conn] step 4: calling initialize...');
    const initResult = await conn.initialize({
      clientCapabilities: {},
      protocolVersion: 1,
    });
    console.log('[acp-conn] step 5: initialized OK, capabilities:', JSON.stringify(initResult).slice(0, 200));

    console.log('[acp-conn] step 6: calling newSession...');
    const session = await conn.newSession({
      cwd: process.cwd(),
      mcpServers: [],
    });
    console.log(`[acp-conn] step 7: session created, id=${session.sessionId}`);

    registerCancel(() => {
      console.log('[acp-conn] cancel requested');
      conn.cancel({ sessionId: session.sessionId }).catch(() => {});
    });

    console.log(`[acp-conn] step 8: sending prompt (${prompt.length} chars)...`);
    const promptResult = await conn.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: 'text' as const, text: prompt }],
    });
    console.log(`[acp-conn] step 9: prompt completed, stopReason=${JSON.stringify(promptResult)}, chunks=${chunkCount}, fullText=${fullText.length} chars`);

    callbacks.onDone(fullText.trim() || '');
  } catch (err) {
    console.error('[acp-conn] error during ACP lifecycle:', err);
    if (fullText) {
      console.log(`[acp-conn] error but have ${fullText.length} chars of text, returning`);
      callbacks.onDone(fullText.trim());
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  } finally {
    console.log(`[acp-conn] cleanup: killing process pid=${proc.pid}`);
    killProcess(proc);
  }
}

export function queryViaAcp(
  entry: ResolvedEntry,
  prompt: string,
  callbacks: AcpCallbacks,
): AcpQueryHandle {
  let cancelFn: (() => void) | null = null;

  console.log(`[acp-conn] queryViaAcp called, entry=${entry.filePath} (${entry.kind})`);

  executeQuery(entry, prompt, callbacks, (fn) => {
    cancelFn = fn;
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[acp-conn] executeQuery failed:`, message);
    callbacks.onError(message);
  });

  return {
    cancel: () => cancelFn?.(),
  };
}
