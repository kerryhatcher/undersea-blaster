// Type definitions for the Electron API exposed to the renderer process

export interface ElectronAPI {
  system: {
    getPlatform(): NodeJS.Platform;
    getVersion(): string;
    toggleFullscreen(): Promise<void>;
    getDisplayInfo(): Promise<any>;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
  };
  
  game: {
    saveState(data: any): Promise<void>;
    loadState(): Promise<any>;
    getSaves(): Promise<any[]>;
    deleteSave(saveId: string): Promise<void>;
    takeScreenshot(): Promise<string>;
    getHighScores(): Promise<any[]>;
    saveHighScore(score: number, name: string): Promise<void>;
  };
  
  settings: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    reset(): Promise<void>;
  };
  
  on(channel: string, callback: (...args: any[]) => void): () => void;
  removeAllListeners(channel: string): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}