import { spawn, execFile, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import type { LookupType } from '@thinklish/shared';
import skillRaw from './english-intuition.md?raw';

const execFileAsync = promisify(execFile);

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

interface CliInfo {
  cmd: string;
  supportsStreamJson: boolean;
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

function buildUserMessage(input: {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  mode: LookupType;
}): string {
  const context = `...${input.contextBefore}【${input.selectedText}】${input.contextAfter}...`;

  return `用户在阅读英文文章时选中了以下内容，需要你帮助理解。

**选中文本**: "${input.selectedText}"
**文章上下文**: "${context}"
**检测模式**: ${MODE_LABEL[input.mode]}

请根据 Skill 规则，使用对应模板输出。注意：用户提供了文章上下文，请输出「在这篇文章里」模块。`;
}

function buildFullPrompt(input: {
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  mode: LookupType;
}): string {
  return `${skillContent}\n\n---\n\n# 用户请求\n\n${buildUserMessage(input)}`;
}

async function findCli(): Promise<CliInfo | null> {
  const candidates: CliInfo[] = [
    { cmd: 'claude', supportsStreamJson: true },
    { cmd: 'codex', supportsStreamJson: false }
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

function buildCliArgs(cli: CliInfo, userMessage: string): string[] {
  if (cli.supportsStreamJson) {
    return [
      '-p',
      '--verbose',
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--system-prompt', skillContent,
      userMessage
    ];
  }
  return ['-q', `${skillContent}\n\n---\n\n# 用户请求\n\n${userMessage}`];
}

function parseStreamJsonLine(line: string): string | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;

    if (obj.type === 'stream_event') {
      const event = obj.event as Record<string, unknown> | undefined;
      if (event?.type === 'content_block_delta') {
        const delta = event.delta as Record<string, unknown> | undefined;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          return delta.text;
        }
      }
    }

    if (obj.type === 'result' && typeof obj.result === 'string') {
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

function extractResultText(line: string): string | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    if (obj.type === 'result' && typeof obj.result === 'string') {
      return obj.result;
    }
    return null;
  } catch {
    return null;
  }
}

export async function explainTextStream(
  input: { selectedText: string; contextBefore: string; contextAfter: string },
  callbacks: StreamCallbacks
): Promise<ChildProcess | null> {
  const mode = detectMode(input.selectedText);
  const userMessage = buildUserMessage({ ...input, mode });

  const cli = await findCli();
  if (!cli) {
    callbacks.onError(
      '未找到 Claude CLI 或 Codex CLI。请先安装：\n• Claude: https://docs.anthropic.com/en/docs/claude-code\n• Codex: https://github.com/openai/codex'
    );
    return null;
  }

  const args = buildCliArgs(cli, userMessage);
  const child = spawn(cli.cmd, args, {
    env: { ...process.env, TERM: 'dumb' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let streamedText = '';
  let resultText: string | null = null;
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, 60000);

  if (cli.supportsStreamJson) {
    let lineBuffer = '';

    child.stdout!.on('data', (data: Buffer) => {
      lineBuffer += data.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const text = parseStreamJsonLine(line);
        if (text) {
          streamedText += text;
          callbacks.onChunk(text);
        }

        const result = extractResultText(line);
        if (result) {
          resultText = result;
        }
      }
    });
  } else {
    child.stdout!.on('data', (data: Buffer) => {
      const chunk = data.toString();
      streamedText += chunk;
      callbacks.onChunk(chunk);
    });
  }

  child.on('close', (code) => {
    clearTimeout(timeout);

    if (timedOut) {
      callbacks.onError('AI 响应超时（60 秒），请重试');
      return;
    }

    const finalText = (resultText ?? streamedText).trim();

    if (finalText) {
      callbacks.onDone(finalText);
    } else if (code === 0) {
      callbacks.onError('AI 返回了空响应，请重试');
    } else {
      callbacks.onError(`AI 调用失败 (exit code: ${code ?? 'unknown'})`);
    }
  });

  child.on('error', (err) => {
    clearTimeout(timeout);
    callbacks.onError(`AI 调用失败: ${err.message}`);
  });

  return child;
}

export { detectMode, buildFullPrompt };
