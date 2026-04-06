import { spawn, execFile, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import type { LookupType } from '@english-studio/shared';
import skillRaw from './english-intuition.md?raw';

const execFileAsync = promisify(execFile);

interface AiExplainInput {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  mode: LookupType;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

function stripFrontmatter(raw: string): string {
  const match = raw.match(/^---\n[\s\S]*?\n---\n/);
  if (match) return raw.slice(match[0].length).trim();
  return raw.trim();
}

const skillContent = stripFrontmatter(skillRaw);

function detectMode(text: string): LookupType {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const hasSentencePunctuation = /[.!?;]/.test(trimmed);

  if (wordCount === 1) return 'word';
  if (wordCount <= 6 && !hasSentencePunctuation) return 'phrase';
  return 'sentence';
}

const MODE_LABEL: Record<LookupType, string> = {
  word: '单词模式（模板 A）',
  phrase: '短语模式（模板 B）',
  sentence: '句子模式（模板 C）'
};

function buildPrompt(input: AiExplainInput): string {
  const context = `...${input.contextBefore}【${input.selectedText}】${input.contextAfter}...`;

  return `${skillContent}

---

# 用户请求

用户在阅读英文文章时选中了以下内容，需要你帮助理解。

**选中文本**: "${input.selectedText}"
**文章上下文**: "${context}"
**检测模式**: ${MODE_LABEL[input.mode]}

请根据上述 Skill 规则，使用对应模板输出。注意：用户提供了文章上下文，请输出「在这篇文章里」模块。`;
}

async function findCli(): Promise<{ cmd: string; args: string[] } | null> {
  const candidates = [
    { cmd: 'claude', args: ['-p'] },
    { cmd: 'codex', args: ['-q'] }
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync('which', [candidate.cmd]);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export async function explainTextStream(
  input: { selectedText: string; contextBefore: string; contextAfter: string },
  callbacks: StreamCallbacks
): Promise<ChildProcess | null> {
  const mode = detectMode(input.selectedText);
  const prompt = buildPrompt({ ...input, mode });

  const cli = await findCli();
  if (!cli) {
    callbacks.onError(
      '未找到 Claude CLI 或 Codex CLI。请先安装：\n• Claude: https://docs.anthropic.com/en/docs/claude-code\n• Codex: https://github.com/openai/codex'
    );
    return null;
  }

  const child = spawn(cli.cmd, [...cli.args, prompt], {
    env: { ...process.env, TERM: 'dumb' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let fullText = '';
  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    callbacks.onError('AI 响应超时（60 秒），请重试');
  }, 60000);

  child.stdout!.on('data', (data: Buffer) => {
    const chunk = data.toString();
    fullText += chunk;
    callbacks.onChunk(chunk);
  });

  child.stderr!.on('data', (data: Buffer) => {
    const text = data.toString();
    if (text.trim()) {
      fullText += text;
      callbacks.onChunk(text);
    }
  });

  child.on('close', (code) => {
    clearTimeout(timeout);
    if (code === 0 || (code === null && fullText.length > 0)) {
      const trimmed = fullText.trim();
      if (!trimmed) {
        callbacks.onError('AI 返回了空响应，请重试');
      } else {
        callbacks.onDone(trimmed);
      }
    } else if (code !== null) {
      callbacks.onError(`AI 调用失败 (exit code: ${code})`);
    }
  });

  child.on('error', (err) => {
    clearTimeout(timeout);
    callbacks.onError(`AI 调用失败: ${err.message}`);
  });

  return child;
}

export { detectMode };
