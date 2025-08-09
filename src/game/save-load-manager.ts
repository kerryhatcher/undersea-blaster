/**
 * Save/Load Manager for Undersea Blaster
 * Handles game state persistence with Electron backend
 */

import type { GameState } from './state';
import { desktopIntegration } from './desktop-integration';

export interface SaveSlot {
  slotName: string;
  displayName: string;
  timestamp: number;
  score: number;
  level: number;
  playTime: number;
  isEmpty: boolean;
}

export interface SaveData {
  score: number;
  level: number;
  playerHits: number;
  playerMaxHits: number;
  bazookaActive: boolean;
  shotgunActive: boolean;
  laserActive: boolean;
  bazookaTimer: number;
  shotgunTimer: number;
  laserTimer: number;
  nextUpgradeAt: number;
  bazookaCooldown: number;
  playTime: number;
  timestamp: number;
}

export class SaveLoadManager {
  private slots: SaveSlot[] = [];
  private currentSlot: string | null = null;
  private autoSaveEnabled = true;
  private autoSaveInterval = 5 * 60 * 1000; // 5 minutes
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private sessionStartTime = Date.now();
  private sessionPlayTime = 0;
  
  constructor() {
    this.initializeSlots();
  }
  
  /**
   * Initialize save slots
   */
  private initializeSlots(): void {
    // Create 5 save slots plus autosave and quicksave
    this.slots = [
      { slotName: 'autosave', displayName: 'Auto Save', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'quicksave', displayName: 'Quick Save', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'slot1', displayName: 'Save Slot 1', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'slot2', displayName: 'Save Slot 2', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'slot3', displayName: 'Save Slot 3', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'slot4', displayName: 'Save Slot 4', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true },
      { slotName: 'slot5', displayName: 'Save Slot 5', timestamp: 0, score: 0, level: 0, playTime: 0, isEmpty: true }
    ];
  }
  
  /**
   * Load all save slots from database
   */
  async loadSlots(): Promise<void> {
    if (!window.electronAPI) return;
    
    try {
      const saves = await window.electronAPI.game.getSaves();
      
      // Update slot information
      for (const slot of this.slots) {
        const save = saves.find((s: any) => s.slotName === slot.slotName);
        if (save) {
          slot.timestamp = save.timestamp;
          slot.score = save.score;
          slot.level = save.level;
          slot.playTime = save.playTime || 0;
          slot.isEmpty = false;
        } else {
          slot.isEmpty = true;
          slot.timestamp = 0;
          slot.score = 0;
          slot.level = 0;
          slot.playTime = 0;
        }
      }
    } catch (error) {
      console.error('Failed to load save slots:', error);
    }
  }
  
  /**
   * Get all save slots
   */
  getSlots(): SaveSlot[] {
    return [...this.slots];
  }
  
  /**
   * Get a specific slot
   */
  getSlot(slotName: string): SaveSlot | undefined {
    return this.slots.find(s => s.slotName === slotName);
  }
  
  /**
   * Save game state to a slot
   */
  async saveToSlot(slotName: string, state: GameState): Promise<boolean> {
    if (!window.electronAPI) {
      console.warn('Electron API not available');
      return false;
    }
    
    try {
      const playTime = this.getSessionPlayTime();
      
      const saveData: SaveData = {
        score: state.score,
        level: state.level,
        playerHits: state.player.hits,
        playerMaxHits: state.player.maxHits,
        bazookaActive: state.bazookaActive,
        shotgunActive: state.shotgunActive,
        laserActive: state.laserActive,
        bazookaTimer: state.bazookaTimer,
        shotgunTimer: state.shotgunTimer,
        laserTimer: state.laserTimer,
        nextUpgradeAt: state.nextUpgradeAt,
        bazookaCooldown: state.bazookaCooldown,
        playTime,
        timestamp: Date.now()
      };
      
      const result = await window.electronAPI.game.saveToSlot(slotName, saveData);
      
      if (result.success) {
        // Update slot information
        const slot = this.getSlot(slotName);
        if (slot) {
          slot.isEmpty = false;
          slot.timestamp = saveData.timestamp;
          slot.score = saveData.score;
          slot.level = saveData.level;
          slot.playTime = playTime;
        }
        
        this.currentSlot = slotName;
        this.showNotification(`Game saved to ${this.getSlot(slotName)?.displayName}`);
      } else {
        this.showNotification('Failed to save game', 'error');
      }
      
      return result.success;
    } catch (error) {
      console.error('Save failed:', error);
      this.showNotification('Save failed', 'error');
      return false;
    }
  }
  
  /**
   * Load game state from a slot
   */
  async loadFromSlot(slotName: string, state: GameState): Promise<boolean> {
    if (!window.electronAPI) {
      console.warn('Electron API not available');
      return false;
    }
    
    try {
      const result = await window.electronAPI.game.loadFromSlot(slotName);
      
      if (result && result.data) {
        const data = result.data;
        
        // Apply loaded data to game state
        state.score = data.score;
        state.level = data.level;
        state.player.hits = data.playerHits;
        state.player.maxHits = data.playerMaxHits;
        state.bazookaActive = data.bazookaActive;
        state.shotgunActive = data.shotgunActive;
        state.laserActive = data.laserActive;
        state.bazookaTimer = data.bazookaTimer || 0;
        state.shotgunTimer = data.shotgunTimer || 0;
        state.laserTimer = data.laserTimer || 0;
        state.nextUpgradeAt = data.nextUpgradeAt;
        state.bazookaCooldown = data.bazookaCooldown || 0;
        
        // Reset other state
        state.gameOver = false;
        state.paused = false;
        
        this.currentSlot = slotName;
        this.sessionPlayTime = data.playTime || 0;
        this.sessionStartTime = Date.now();
        
        this.showNotification(`Game loaded from ${this.getSlot(slotName)?.displayName}`);
        return true;
      } else {
        this.showNotification('No save found in this slot', 'error');
        return false;
      }
    } catch (error) {
      console.error('Load failed:', error);
      this.showNotification('Load failed', 'error');
      return false;
    }
  }
  
  /**
   * Quick save - save to quicksave slot
   */
  async quickSave(state: GameState): Promise<boolean> {
    return this.saveToSlot('quicksave', state);
  }
  
  /**
   * Quick load - load from quicksave slot
   */
  async quickLoad(state: GameState): Promise<boolean> {
    return this.loadFromSlot('quicksave', state);
  }
  
  /**
   * Auto save - save to autosave slot
   */
  async autoSave(state: GameState): Promise<boolean> {
    if (!this.autoSaveEnabled) return false;
    return this.saveToSlot('autosave', state);
  }
  
  /**
   * Delete a save slot
   */
  async deleteSlot(slotName: string): Promise<boolean> {
    if (!window.electronAPI) return false;
    
    // Don't allow deleting autosave
    if (slotName === 'autosave') {
      this.showNotification('Cannot delete autosave slot', 'error');
      return false;
    }
    
    try {
      const result = await window.electronAPI.game.deleteSave(slotName);
      
      if (result.success) {
        const slot = this.getSlot(slotName);
        if (slot) {
          slot.isEmpty = true;
          slot.timestamp = 0;
          slot.score = 0;
          slot.level = 0;
          slot.playTime = 0;
        }
        
        if (this.currentSlot === slotName) {
          this.currentSlot = null;
        }
        
        this.showNotification(`${this.getSlot(slotName)?.displayName} deleted`);
      }
      
      return result.success;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }
  
  /**
   * Start auto save timer
   */
  startAutoSave(state: GameState): void {
    if (!this.autoSaveEnabled) return;
    
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      if (!state.gameOver && !state.paused) {
        this.autoSave(state);
      }
    }, this.autoSaveInterval);
  }
  
  /**
   * Stop auto save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  /**
   * Set auto save enabled
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    
    if (!enabled) {
      this.stopAutoSave();
    }
  }
  
  /**
   * Set auto save interval
   */
  setAutoSaveInterval(minutes: number): void {
    this.autoSaveInterval = minutes * 60 * 1000;
    
    // Restart timer if active
    if (this.autoSaveTimer) {
      // Will restart with new interval
    }
  }
  
  /**
   * Get current session play time
   */
  getSessionPlayTime(): number {
    const currentSession = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    return this.sessionPlayTime + currentSession;
  }
  
  /**
   * Format play time for display
   */
  formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
  
  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Empty';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    if (desktopIntegration && desktopIntegration.showNotification) {
      desktopIntegration.showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  /**
   * Get current slot name
   */
  getCurrentSlot(): string | null {
    return this.currentSlot;
  }
  
  /**
   * Check if a slot has a save
   */
  hasSlotSave(slotName: string): boolean {
    const slot = this.getSlot(slotName);
    return slot ? !slot.isEmpty : false;
  }
}

// Export singleton instance
export const saveLoadManager = new SaveLoadManager();