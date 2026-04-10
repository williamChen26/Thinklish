import { ipcMain } from 'electron';
import {
  createArticle,
  fillArticleFromExtraction,
  getAllArticles,
  getArticleById,
  deleteArticle
} from '@thinklish/core';
import type { Article, ArticleCreateInput } from '@thinklish/shared';
import { extractArticle } from '../services/article-extractor';

const stubExtractionInFlight = new Map<number, Promise<Article | null>>();

function isPositiveIntegerId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function registerArticleHandlers(): void {
  ipcMain.handle('articles:add', async (_event, url: string) => {
    const result = await extractArticle(url);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    const article = createArticle(result.article);
    return { success: true as const, article };
  });

  ipcMain.handle('articles:addManual', (_event, input: ArticleCreateInput) => {
    const article = createArticle(input);
    return { success: true as const, article };
  });

  ipcMain.handle('articles:getAll', () => {
    return getAllArticles();
  });

  ipcMain.handle('articles:getById', async (_event, id: unknown) => {
    if (!isPositiveIntegerId(id)) {
      return null;
    }

    const load = async (): Promise<Article | null> => {
      const current = getArticleById(id);
      if (!current) {
        return null;
      }
      if (!current.isStub) {
        return current;
      }
      const result = await extractArticle(current.url);
      if (result.success) {
        return fillArticleFromExtraction(id, {
          title: result.article.title,
          content: result.article.content,
          contentHtml: result.article.contentHtml,
          sourceDomain: result.article.sourceDomain,
          publishedAt: result.article.publishedAt
        });
      }
      return current;
    };

    const pending = stubExtractionInFlight.get(id);
    if (pending) {
      return pending;
    }
    const promise = load().finally(() => {
      stubExtractionInFlight.delete(id);
    });
    stubExtractionInFlight.set(id, promise);
    return promise;
  });

  ipcMain.handle('articles:delete', (_event, id: number) => {
    deleteArticle(id);
  });
}
