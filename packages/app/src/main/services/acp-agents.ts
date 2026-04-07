import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface ResolvedEntry {
  filePath: string;
  kind: 'node' | 'native';
}

export interface AgentAdapter {
  id: string;
  name: string;
  adapterPackage: string;
  installUrl: string;
  resolveEntry: () => ResolvedEntry | null;
}

export interface AgentStatus {
  adapter: AgentAdapter;
  status: 'ready' | 'not_found';
  entry: ResolvedEntry | null;
  installHint: string;
}

// Electron asar 打包后，node_modules 可能被打入 app.asar，
// 但原生二进制和 JS adapter 需要从 unpacked 目录读取
function fixAsarPath(filePath: string): string {
  return filePath.replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked');
}

const _require = createRequire(import.meta.url);

function tryResolve(specifier: string): string | null {
  try {
    return _require.resolve(specifier);
  } catch {
    return null;
  }
}

function resolveClaudeEntry(): ResolvedEntry | null {
  const resolved = tryResolve('@agentclientprotocol/claude-agent-acp/dist/index.js');
  if (!resolved) return null;

  const filePath = fixAsarPath(resolved);
  if (!existsSync(filePath)) return null;

  return { filePath, kind: 'node' };
}

function resolveCodexEntry(): ResolvedEntry | null {
  const platformPkg = `@zed-industries/codex-acp-${process.platform}-${process.arch}`;
  const binaryName = process.platform === 'win32' ? 'codex-acp.exe' : 'codex-acp';

  const pkgJson = tryResolve(`${platformPkg}/package.json`);
  if (pkgJson) {
    const binPath = fixAsarPath(join(dirname(pkgJson), 'bin', binaryName));
    if (existsSync(binPath)) {
      return { filePath: binPath, kind: 'native' };
    }
  }

  const jsEntry = tryResolve('@zed-industries/codex-acp/bin/codex-acp.js');
  if (jsEntry) {
    const filePath = fixAsarPath(jsEntry);
    if (existsSync(filePath)) {
      return { filePath, kind: 'node' };
    }
  }

  return null;
}

const BUILTIN_ADAPTERS: readonly AgentAdapter[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    adapterPackage: '@agentclientprotocol/claude-agent-acp',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    resolveEntry: resolveClaudeEntry,
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    adapterPackage: '@zed-industries/codex-acp',
    installUrl: 'https://github.com/openai/codex',
    resolveEntry: resolveCodexEntry,
  },
];

export function getAvailableAgents(): AgentStatus[] {
  return BUILTIN_ADAPTERS.map((adapter) => {
    const entry = adapter.resolveEntry();
    console.log(`[acp-agents] ${adapter.id}: ${entry ? `ready → ${entry.filePath} (${entry.kind})` : 'not_found'}`);
    return {
      adapter,
      status: entry ? 'ready' as const : 'not_found' as const,
      entry,
      installHint: `安装 ${adapter.name}: ${adapter.installUrl}`,
    };
  });
}

export function findFirstAvailableAgent(): AgentStatus | null {
  const agents = getAvailableAgents();
  const found = agents.find((a) => a.status === 'ready') ?? null;
  console.log(`[acp-agents] findFirstAvailableAgent → ${found ? found.adapter.id : 'none'}`);
  return found;
}
