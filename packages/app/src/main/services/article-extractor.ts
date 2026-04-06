import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import type { ArticleCreateInput } from '@thinklish/shared';

export type ExtractionResult =
  | { success: true; article: ArticleCreateInput }
  | { success: false; error: string };

export async function extractArticle(url: string): Promise<ExtractionResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) EnglishStudio/0.1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed';
    return { success: false, error: `网络请求失败: ${message}` };
  }

  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  if (!parsed || !parsed.textContent?.trim()) {
    return { success: false, error: '无法提取文章正文，请尝试手动粘贴内容' };
  }

  const urlObj = new URL(url);

  return {
    success: true,
    article: {
      url,
      title: parsed.title || urlObj.hostname,
      content: parsed.textContent ?? '',
      contentHtml: parsed.content ?? '',
      sourceDomain: urlObj.hostname,
      publishedAt: parsed.publishedTime ?? null
    }
  };
}
