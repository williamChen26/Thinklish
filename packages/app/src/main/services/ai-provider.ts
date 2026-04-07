import type { LookupType } from '@thinklish/shared';
import { findFirstAvailableAgent } from './acp-agents';
import { queryViaAcp, type AcpQueryHandle } from './acp-connection';
import skillRaw from './english-intuition.md?raw';

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

const TIMEOUT_MS = 60_000;

export function explainTextStream(
  input: { selectedText: string; contextBefore: string; contextAfter: string },
  callbacks: StreamCallbacks,
): AcpQueryHandle | null {
  const agent = findFirstAvailableAgent();
  if (!agent || agent.status !== 'ready' || !agent.entry) {
    callbacks.onError(
      '未找到可用的 AI Agent。请安装以下任一工具：\n' +
      '• Claude Code: https://docs.anthropic.com/en/docs/claude-code\n' +
      '• Codex CLI: https://github.com/openai/codex'
    );
    return null;
  }

  const mode = detectMode(input.selectedText);
  const prompt = buildFullPrompt({ ...input, mode });

  let settled = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const wrappedCallbacks: StreamCallbacks = {
    onChunk: (chunk) => {
      callbacks.onChunk(chunk);
    },
    onDone: (fullText) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      callbacks.onDone(fullText);
    },
    onError: (error) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      callbacks.onError(error);
    },
  };

  const handle = queryViaAcp(agent.entry, prompt, wrappedCallbacks);

  timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    handle.cancel();
    callbacks.onError('AI 响应超时（60 秒），请重试');
  }, TIMEOUT_MS);

  return handle;
}

export { detectMode, buildFullPrompt };
