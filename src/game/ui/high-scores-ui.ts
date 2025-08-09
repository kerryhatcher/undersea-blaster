/**
 * High Scores UI Component
 * Visual interface for displaying and managing high scores
 */

export interface HighScore {
  id?: number;
  playerName: string;
  score: number;
  level: number;
  playTime: number;
  timestamp: number;
}

export interface HighScoresState {
  scores: HighScore[];
  selectedIndex: number;
  isLoading: boolean;
  sortBy: 'score' | 'level' | 'time' | 'date';
  sortDirection: 'asc' | 'desc';
  filter: {
    minScore: number;
    minLevel: number;
    dateRange: 'all' | 'week' | 'month' | 'year';
  };
  showDetails: boolean;
  detailsScore: HighScore | null;
}

export class HighScoresUI {
  private state: HighScoresState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onAction?: (action: string, data?: any) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.state = {
      scores: [],
      selectedIndex: 0,
      isLoading: false,
      sortBy: 'score',
      sortDirection: 'desc',
      filter: {
        minScore: 0,
        minLevel: 1,
        dateRange: 'all'
      },
      showDetails: false,
      detailsScore: null
    };
  }

  /**
   * Set action callback
   */
  setActionCallback(callback: (action: string, data?: any) => void): void {
    this.onAction = callback;
  }

  /**
   * Initialize and load high scores
   */
  async initialize(): Promise<void> {
    this.state.isLoading = true;
    
    try {
      await this.loadHighScores();
    } catch (error) {
      console.error('Failed to load high scores:', error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Load high scores from database
   */
  private async loadHighScores(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.game.getHighScores();
      
      if (result && result.scores) {
        this.state.scores = result.scores;
        this.applySorting();
        this.applyFilters();
        
        // Reset selection if out of bounds
        if (this.state.selectedIndex >= this.state.scores.length) {
          this.state.selectedIndex = Math.max(0, this.state.scores.length - 1);
        }
      }
    } catch (error) {
      console.error('Failed to load high scores:', error);
      this.state.scores = [];
    }
  }

  /**
   * Apply sorting to scores
   */
  private applySorting(): void {
    this.state.scores.sort((a, b) => {
      let comparison = 0;
      
      switch (this.state.sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'level':
          comparison = a.level - b.level;
          break;
        case 'time':
          comparison = a.playTime - b.playTime;
          break;
        case 'date':
          comparison = a.timestamp - b.timestamp;
          break;
      }
      
      return this.state.sortDirection === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Apply filters to scores
   */
  private applyFilters(): void {
    const now = Date.now();
    const { minScore, minLevel, dateRange } = this.state.filter;
    
    // Calculate date threshold
    let dateThreshold = 0;
    switch (dateRange) {
      case 'week':
        dateThreshold = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateThreshold = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        dateThreshold = now - (365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        dateThreshold = 0;
        break;
    }
    
    this.state.scores = this.state.scores.filter(score => {
      return score.score >= minScore &&
             score.level >= minLevel &&
             score.timestamp >= dateThreshold;
    });
  }

  /**
   * Handle input
   */
  handleInput(key: string): boolean {
    if (this.state.isLoading) return false;

    if (this.state.showDetails) {
      return this.handleDetailsInput(key);
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
        this.showScoreDetails();
        return true;
      case 'r':
        this.refresh();
        return true;
      case 'f':
        this.toggleSortBy();
        return true;
      case 'd':
        this.toggleSortDirection();
        return true;
      case 'c':
        this.clearAllScores();
        return true;
      case 'escape':
        this.onAction?.('back');
        return true;
    }

    return false;
  }

  /**
   * Handle details view input
   */
  private handleDetailsInput(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'escape':
      case 'enter':
        this.hideScoreDetails();
        return true;
      case 'd':
        this.deleteSelectedScore();
        return true;
    }
    return false;
  }

  /**
   * Navigate up in scores list
   */
  private navigateUp(): void {
    if (this.state.scores.length === 0) return;
    this.state.selectedIndex = this.state.selectedIndex > 0 
      ? this.state.selectedIndex - 1 
      : this.state.scores.length - 1;
  }

  /**
   * Navigate down in scores list
   */
  private navigateDown(): void {
    if (this.state.scores.length === 0) return;
    this.state.selectedIndex = this.state.selectedIndex < this.state.scores.length - 1
      ? this.state.selectedIndex + 1 
      : 0;
  }

  /**
   * Show score details
   */
  private showScoreDetails(): void {
    if (this.state.scores.length > 0) {
      this.state.showDetails = true;
      this.state.detailsScore = this.state.scores[this.state.selectedIndex];
    }
  }

  /**
   * Hide score details
   */
  private hideScoreDetails(): void {
    this.state.showDetails = false;
    this.state.detailsScore = null;
  }

  /**
   * Delete selected score
   */
  private async deleteSelectedScore(): Promise<void> {
    const score = this.state.detailsScore;
    if (!score || !score.id) return;

    try {
      if (window.electronAPI) {
        await window.electronAPI.game.deleteHighScore(score.id);
        await this.loadHighScores();
        this.hideScoreDetails();
        this.onAction?.('score-deleted', score);
      }
    } catch (error) {
      console.error('Failed to delete score:', error);
    }
  }

  /**
   * Refresh scores
   */
  private async refresh(): Promise<void> {
    await this.initialize();
  }

  /**
   * Toggle sort criteria
   */
  private toggleSortBy(): void {
    const sortOptions: Array<'score' | 'level' | 'time' | 'date'> = ['score', 'level', 'time', 'date'];
    const currentIndex = sortOptions.indexOf(this.state.sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    
    this.state.sortBy = sortOptions[nextIndex];
    this.applySorting();
  }

  /**
   * Toggle sort direction
   */
  private toggleSortDirection(): void {
    this.state.sortDirection = this.state.sortDirection === 'desc' ? 'asc' : 'desc';
    this.applySorting();
  }

  /**
   * Clear all scores (with confirmation)
   */
  private clearAllScores(): void {
    this.onAction?.('confirm-clear-scores');
  }

  /**
   * Render the high scores UI
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
    } else if (this.state.showDetails) {
      this.renderScoreDetails(w, h);
    } else {
      this.renderScoresList(w, h);
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
    this.ctx.fillText('Loading high scores...', w / 2, h / 2);
  }

  /**
   * Render scores list
   */
  private renderScoresList(w: number, h: number): void {
    const centerX = w / 2;
    
    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('High Scores', centerX, 40);

    // Sort info
    this.renderSortInfo(centerX, 100);

    // Scores table
    if (this.state.scores.length > 0) {
      this.renderScoresTable(centerX, 150, w - 100, h - 300);
    } else {
      this.renderEmptyState(centerX, h / 2);
    }

    // Instructions
    this.renderInstructions(centerX, h - 100);
  }

  /**
   * Render sort information
   */
  private renderSortInfo(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '16px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const sortLabel = {
      score: 'Score',
      level: 'Level',
      time: 'Play Time',
      date: 'Date'
    };

    const directionSymbol = this.state.sortDirection === 'desc' ? '↓' : '↑';
    const text = `Sorted by: ${sortLabel[this.state.sortBy]} ${directionSymbol}`;
    
    this.ctx.fillText(text, x, y);
  }

  /**
   * Render scores table
   */
  private renderScoresTable(x: number, y: number, width: number, height: number): void {
    const startX = x - width / 2;
    const rowHeight = 50;
    const headerHeight = 30;
    const maxVisible = Math.floor((height - headerHeight) / rowHeight);
    
    // Table headers
    this.renderTableHeaders(startX, y, width, headerHeight);
    
    // Visible scores
    const startIndex = Math.max(0, Math.min(
      this.state.selectedIndex - Math.floor(maxVisible / 2),
      this.state.scores.length - maxVisible
    ));
    
    const endIndex = Math.min(startIndex + maxVisible, this.state.scores.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const score = this.state.scores[i];
      const rowY = y + headerHeight + ((i - startIndex) * rowHeight);
      const isSelected = i === this.state.selectedIndex;
      
      this.renderScoreRow(startX, rowY, width, rowHeight, score, i + 1, isSelected);
    }
  }

  /**
   * Render table headers
   */
  private renderTableHeaders(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const colWidths = [60, 200, 120, 100, 120, 150];
    let colX = x + 10;

    const headers = ['Rank', 'Player', 'Score', 'Level', 'Time', 'Date'];
    
    headers.forEach((header, index) => {
      this.ctx.fillText(header, colX, y + height / 2);
      colX += colWidths[index];
    });
  }

  /**
   * Render individual score row
   */
  private renderScoreRow(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    score: HighScore, 
    rank: number, 
    selected: boolean
  ): void {
    // Row background
    if (selected) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.fillRect(x, y, width, height);
      
      this.ctx.strokeStyle = '#4a9eff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    } else {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }

    // Row data
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const colWidths = [60, 200, 120, 100, 120, 150];
    let colX = x + 10;

    // Rank
    this.ctx.fillText(`#${rank}`, colX, y + height / 2);
    colX += colWidths[0];

    // Player name
    const playerName = score.playerName || 'Anonymous';
    const truncatedName = playerName.length > 20 ? playerName.substring(0, 17) + '...' : playerName;
    this.ctx.fillText(truncatedName, colX, y + height / 2);
    colX += colWidths[1];

    // Score
    this.ctx.fillText(score.score.toLocaleString(), colX, y + height / 2);
    colX += colWidths[2];

    // Level
    this.ctx.fillText(score.level.toString(), colX, y + height / 2);
    colX += colWidths[3];

    // Play time
    this.ctx.fillText(this.formatPlayTime(score.playTime), colX, y + height / 2);
    colX += colWidths[4];

    // Date
    this.ctx.fillText(this.formatTimestamp(score.timestamp), colX, y + height / 2);
  }

  /**
   * Render empty state
   */
  private renderEmptyState(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '20px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('No high scores yet!', x, y);

    this.ctx.font = '16px system-ui';
    this.ctx.fillText('Play some games to see your scores here.', x, y + 40);
  }

  /**
   * Render score details
   */
  private renderScoreDetails(w: number, h: number): void {
    if (!this.state.detailsScore) return;

    const score = this.state.detailsScore;
    const centerX = w / 2;
    const centerY = h / 2;

    // Background dialog
    const dialogW = 500;
    const dialogH = 400;
    const dialogX = centerX - dialogW / 2;
    const dialogY = centerY - dialogH / 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = 'rgba(20, 40, 60, 0.95)';
    this.ctx.fillRect(dialogX, dialogY, dialogW, dialogH);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(dialogX, dialogY, dialogW, dialogH);

    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Score Details', centerX, dialogY + 30);

    // Details
    const detailY = dialogY + 80;
    const lineHeight = 30;
    let currentY = detailY;

    this.ctx.font = '18px system-ui';
    this.ctx.textAlign = 'left';

    const details = [
      ['Player:', score.playerName || 'Anonymous'],
      ['Score:', score.score.toLocaleString()],
      ['Level Reached:', score.level.toString()],
      ['Play Time:', this.formatPlayTime(score.playTime)],
      ['Date Achieved:', this.formatTimestamp(score.timestamp)]
    ];

    details.forEach(([label, value]) => {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fillText(label, dialogX + 40, currentY);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(value, dialogX + 200, currentY);
      
      currentY += lineHeight;
    });

    // Instructions
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '14px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Enter or Escape to close • D to delete', centerX, dialogY + dialogH - 40);
  }

  /**
   * Render instructions
   */
  private renderInstructions(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '14px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const instructions = [
      '↑↓ Navigate • Enter for details • R to refresh',
      'F to change sort • D to toggle direction • C to clear all • Escape to go back'
    ];

    instructions.forEach((instruction, index) => {
      this.ctx.fillText(instruction, x, y + (index * 18));
    });
  }

  /**
   * Format play time for display
   */
  private formatPlayTime(seconds: number): string {
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
  private formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If this year, show month/day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Otherwise show year
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Get current state
   */
  getState(): HighScoresState {
    return { ...this.state };
  }
}