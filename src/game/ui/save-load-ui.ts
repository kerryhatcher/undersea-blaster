/**
 * Save/Load UI Component
 * Visual interface for save slot management
 */

import type { SaveSlot } from '../save-load-manager';
import { saveLoadManager } from '../save-load-manager';

export interface SaveLoadState {
  slots: SaveSlot[];
  selectedSlot: number;
  mode: 'save' | 'load';
  isLoading: boolean;
  confirmAction: {
    active: boolean;
    slot: SaveSlot | null;
    action: 'save' | 'delete' | 'overwrite';
  };
}

export class SaveLoadUI {
  private state: SaveLoadState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onAction?: (action: string, slot: SaveSlot) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.state = {
      slots: [],
      selectedSlot: 0,
      mode: 'save',
      isLoading: false,
      confirmAction: {
        active: false,
        slot: null,
        action: 'save'
      }
    };
  }

  /**
   * Set action callback
   */
  setActionCallback(callback: (action: string, slot: SaveSlot) => void): void {
    this.onAction = callback;
  }

  /**
   * Initialize with mode and load slots
   */
  async initialize(mode: 'save' | 'load'): Promise<void> {
    this.state.mode = mode;
    this.state.isLoading = true;
    
    try {
      await saveLoadManager.loadSlots();
      this.state.slots = saveLoadManager.getSlots();
      
      // Filter slots based on mode
      if (mode === 'load') {
        // Show only slots with saves
        this.state.slots = this.state.slots.filter(slot => !slot.isEmpty);
      }
      
      // Select first available slot
      this.state.selectedSlot = 0;
    } catch (error) {
      console.error('Failed to load save slots:', error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Handle input
   */
  handleInput(key: string): boolean {
    if (this.state.isLoading) return false;

    if (this.state.confirmAction.active) {
      return this.handleConfirmInput(key);
    }

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.navigateUp();
        return true;
      case 'arrowdown':
      case 's':
        this.navigateDown();
        return true;
      case 'enter':
      case ' ':
        this.activateSelected();
        return true;
      case 'delete':
      case 'd':
        if (this.state.mode === 'save') {
          this.deleteSelected();
          return true;
        }
        break;
      case 'escape':
        this.onAction?.('back', this.state.slots[0]);
        return true;
    }

    return false;
  }

  /**
   * Handle confirmation dialog input
   */
  private handleConfirmInput(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'enter':
      case 'y':
        this.confirmAction();
        return true;
      case 'escape':
      case 'n':
        this.cancelAction();
        return true;
    }
    return false;
  }

  /**
   * Navigate up in slot list
   */
  private navigateUp(): void {
    if (this.state.slots.length === 0) return;
    this.state.selectedSlot = this.state.selectedSlot > 0 
      ? this.state.selectedSlot - 1 
      : this.state.slots.length - 1;
  }

  /**
   * Navigate down in slot list
   */
  private navigateDown(): void {
    if (this.state.slots.length === 0) return;
    this.state.selectedSlot = this.state.selectedSlot < this.state.slots.length - 1
      ? this.state.selectedSlot + 1 
      : 0;
  }

  /**
   * Activate selected slot
   */
  private activateSelected(): void {
    const slot = this.state.slots[this.state.selectedSlot];
    if (!slot) return;

    if (this.state.mode === 'save') {
      if (slot.isEmpty || slot.slotName === 'autosave') {
        // Save directly to empty slot or autosave
        this.onAction?.('save', slot);
      } else {
        // Confirm overwrite
        this.state.confirmAction = {
          active: true,
          slot,
          action: 'overwrite'
        };
      }
    } else if (this.state.mode === 'load') {
      if (!slot.isEmpty) {
        this.onAction?.('load', slot);
      }
    }
  }

  /**
   * Delete selected slot
   */
  private deleteSelected(): void {
    const slot = this.state.slots[this.state.selectedSlot];
    if (!slot || slot.isEmpty || slot.slotName === 'autosave') return;

    this.state.confirmAction = {
      active: true,
      slot,
      action: 'delete'
    };
  }

  /**
   * Confirm action
   */
  private confirmAction(): void {
    const { slot, action } = this.state.confirmAction;
    if (!slot) return;

    switch (action) {
      case 'overwrite':
        this.onAction?.('save', slot);
        break;
      case 'delete':
        this.onAction?.('delete', slot);
        break;
    }

    this.cancelAction();
  }

  /**
   * Cancel action
   */
  private cancelAction(): void {
    this.state.confirmAction = {
      active: false,
      slot: null,
      action: 'save'
    };
  }

  /**
   * Render the save/load UI
   */
  render(): void {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.save();

    // Background overlay
    this.ctx.fillStyle = 'rgba(0, 20, 40, 0.95)';
    this.ctx.fillRect(0, 0, w, h);

    if (this.state.isLoading) {
      this.renderLoading(w, h);
    } else if (this.state.confirmAction.active) {
      this.renderConfirmDialog(w, h);
    } else {
      this.renderSlotList(w, h);
    }

    this.ctx.restore();
  }

  /**
   * Render loading state
   */
  private renderLoading(w: number, h: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Loading...', w / 2, h / 2);
  }

  /**
   * Render slot list
   */
  private renderSlotList(w: number, h: number): void {
    const centerX = w / 2;
    const startY = 100;
    
    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    const title = this.state.mode === 'save' ? 'Save Game' : 'Load Game';
    this.ctx.fillText(title, centerX, 40);

    // Slots
    const slotHeight = 80;
    const slotSpacing = 10;
    const slotWidth = Math.min(600, w - 100);

    this.state.slots.forEach((slot, index) => {
      const y = startY + (index * (slotHeight + slotSpacing));
      const isSelected = index === this.state.selectedSlot;
      
      this.renderSlot(centerX, y, slotWidth, slotHeight, slot, isSelected);
    });

    // Instructions
    this.renderInstructions(centerX, h - 100);
  }

  /**
   * Render individual save slot
   */
  private renderSlot(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    slot: SaveSlot, 
    selected: boolean
  ): void {
    this.ctx.save();

    const left = x - width / 2;
    const right = x + width / 2;

    // Slot background
    if (selected) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(left, y, width, height);
      
      // Selection border
      this.ctx.strokeStyle = '#4a9eff';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(left, y, width, height);
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(left, y, width, height);
      
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(left, y, width, height);
    }

    // Slot icon
    const iconX = left + 20;
    const iconY = y + height / 2;
    this.renderSlotIcon(iconX, iconY, slot);

    // Slot content
    const contentX = left + 80;
    const contentY = y + 15;
    
    if (slot.isEmpty) {
      this.renderEmptySlot(contentX, contentY, slot);
    } else {
      this.renderFilledSlot(contentX, contentY, width - 100, slot);
    }

    this.ctx.restore();
  }

  /**
   * Render slot icon
   */
  private renderSlotIcon(x: number, y: number, slot: SaveSlot): void {
    this.ctx.save();
    
    if (slot.isEmpty) {
      // Empty slot icon
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - 15, y - 15, 30, 30);
    } else {
      // Filled slot icon
      this.ctx.fillStyle = '#4a9eff';
      this.ctx.fillRect(x - 15, y - 15, 30, 30);
      
      // Save icon
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 8, y - 5);
      this.ctx.lineTo(x - 8, y + 8);
      this.ctx.lineTo(x + 8, y + 8);
      this.ctx.lineTo(x + 8, y - 2);
      this.ctx.lineTo(x + 5, y - 5);
      this.ctx.closePath();
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  /**
   * Render empty slot content
   */
  private renderEmptySlot(x: number, y: number, slot: SaveSlot): void {
    // Slot name
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(slot.displayName, x, y);

    // Empty indicator
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '16px system-ui';
    this.ctx.fillText('Empty Slot', x, y + 30);
  }

  /**
   * Render filled slot content
   */
  private renderFilledSlot(x: number, y: number, width: number, slot: SaveSlot): void {
    // Slot name
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(slot.displayName, x, y);

    // Score and level
    this.ctx.fillStyle = '#4a9eff';
    this.ctx.font = '16px system-ui';
    this.ctx.fillText(`Score: ${slot.score.toLocaleString()}`, x, y + 25);
    this.ctx.fillText(`Level: ${slot.level}`, x + 150, y + 25);

    // Date and play time
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '14px system-ui';
    const dateText = saveLoadManager.formatTimestamp(slot.timestamp);
    const timeText = saveLoadManager.formatPlayTime(slot.playTime);
    this.ctx.fillText(dateText, x, y + 45);
    this.ctx.fillText(`Play time: ${timeText}`, x + 200, y + 45);
  }

  /**
   * Render instructions
   */
  private renderInstructions(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '16px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const instructions = this.state.mode === 'save' 
      ? [
          '↑↓ Select slot • Enter to save • D to delete • Escape to cancel'
        ]
      : [
          '↑↓ Select slot • Enter to load • Escape to cancel'
        ];

    instructions.forEach((instruction, index) => {
      this.ctx.fillText(instruction, x, y + (index * 20));
    });
  }

  /**
   * Render confirmation dialog
   */
  private renderConfirmDialog(w: number, h: number): void {
    const dialogW = 400;
    const dialogH = 200;
    const x = (w - dialogW) / 2;
    const y = (h - dialogH) / 2;

    // Dialog background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = 'rgba(20, 40, 60, 0.95)';
    this.ctx.fillRect(x, y, dialogW, dialogH);

    // Dialog border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, dialogW, dialogH);

    // Dialog content
    const centerX = x + dialogW / 2;
    const centerY = y + dialogH / 2;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const { slot, action } = this.state.confirmAction;
    let message = '';
    
    switch (action) {
      case 'overwrite':
        message = `Overwrite save in ${slot?.displayName}?`;
        break;
      case 'delete':
        message = `Delete save from ${slot?.displayName}?`;
        break;
    }

    this.ctx.fillText(message, centerX, centerY - 20);

    // Confirmation options
    this.ctx.font = '16px system-ui';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('Y to confirm • N or Escape to cancel', centerX, centerY + 30);
  }

  /**
   * Get current state
   */
  getState(): SaveLoadState {
    return { ...this.state };
  }
}