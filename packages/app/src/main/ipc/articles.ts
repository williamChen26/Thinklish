import { ipcMain } from 'electron';
import {
  createArticle,
  getAllArticles,
  getArticleById,
  deleteArticle
} from '@english-studio/core';
import type { ArticleCreateInput } from '@english-studio/shared';
import { extractArticle } from '../services/article-extractor';

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

  ipcMain.handle('articles:getById', (_event, id: number) => {
    return getArticleById(id);
  });

  ipcMain.handle('articles:delete', (_event, id: number) => {
    deleteArticle(id);
  });
}
