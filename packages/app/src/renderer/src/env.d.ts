/// <reference types="vite/client" />

interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): () => void;
}

interface Window {
  electron: ElectronAPI;
}
