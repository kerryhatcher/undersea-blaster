/**
 * Statistics UI Component
 * Visual interface for displaying game statistics and analytics
 */

export interface GameStatistics {
  totalPlayTime: number;
  totalGames: number;
  totalScore: number;
  highestLevel: number;
  enemiesDefeated: number;
  powerUpsCollected: number;
  lastPlayed: number;
}

export interface StatisticsState {
  stats: GameStatistics;
  isLoading: boolean;
  selectedCategory: 'overview' | 'combat' | 'progression' | 'time';
  selectedIndex: number;
  showResetConfirmation: boolean;
  categories: StatisticsCategory[];
}

export interface StatisticsCategory {
  id: string;
  name: string;
  items: StatisticsItem[];
}

export interface StatisticsItem {
  label: string;
  value: string;
  icon: string;
  description: string;
  color: string;
}

export class StatisticsUI {
  private state: StatisticsState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onAction?: (action: string, data?: any) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.state = {
      stats: {
        totalPlayTime: 0,
        totalGames: 0,
        totalScore: 0,
        highestLevel: 0,
        enemiesDefeated: 0,
        powerUpsCollected: 0,
        lastPlayed: 0
      },
      isLoading: false,
      selectedCategory: 'overview',
      selectedIndex: 0,
      showResetConfirmation: false,
      categories: []
    };
  }

  /**
   * Set action callback
   */
  setActionCallback(callback: (action: string, data?: any) => void): void {
    this.onAction = callback;
  }

  /**
   * Initialize and load statistics
   */
  async initialize(): Promise<void> {
    this.state.isLoading = true;
    
    try {
      await this.loadStatistics();
      this.generateCategories();
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Load statistics from database
   */
  private async loadStatistics(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.game.getStatistics();
      
      if (result && result.stats) {
        this.state.stats = {
          totalPlayTime: result.stats.total_play_time || 0,
          totalGames: result.stats.total_games || 0,
          totalScore: result.stats.total_score || 0,
          highestLevel: result.stats.highest_level || 0,
          enemiesDefeated: result.stats.enemies_defeated || 0,
          powerUpsCollected: result.stats.power_ups_collected || 0,
          lastPlayed: result.stats.last_played || 0
        };
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  /**
   * Generate statistics categories
   */
  private generateCategories(): void {
    const stats = this.state.stats;
    
    this.state.categories = [
      {
        id: 'overview',
        name: 'Overview',
        items: [
          {
            label: 'Total Play Time',
            value: this.formatPlayTime(stats.totalPlayTime),
            icon: '⏱️',
            description: 'Time spent playing across all sessions',
            color: '#4a9eff'
          },
          {
            label: 'Games Played',
            value: stats.totalGames.toLocaleString(),
            icon: '🎮',
            description: 'Total number of games started',
            color: '#00d4aa'
          },
          {
            label: 'Total Score',
            value: stats.totalScore.toLocaleString(),
            icon: '🏆',
            description: 'Cumulative score across all games',
            color: '#ffa500'
          },
          {
            label: 'Last Played',
            value: this.formatLastPlayed(stats.lastPlayed),
            icon: '📅',
            description: 'When you last played the game',
            color: '#9b59b6'
          }
        ]
      },
      {
        id: 'progression',
        name: 'Progression',
        items: [
          {
            label: 'Highest Level',
            value: stats.highestLevel.toString(),
            icon: '📈',
            description: 'The furthest level you\'ve reached',
            color: '#e74c3c'
          },
          {
            label: 'Average Score',
            value: stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames).toLocaleString() : '0',
            icon: '📊',
            description: 'Your average score per game',
            color: '#3498db'
          },
          {
            label: 'Score Rate',
            value: this.calculateScoreRate(),
            icon: '⚡',
            description: 'Points earned per minute of play',
            color: '#f39c12'
          },
          {
            label: 'Game Completion',
            value: this.calculateCompletionRate(),
            icon: '✅',
            description: 'Percentage of games that reached level 10+',
            color: '#27ae60'
          }
        ]
      },
      {
        id: 'combat',
        name: 'Combat',
        items: [
          {
            label: 'Enemies Defeated',
            value: stats.enemiesDefeated.toLocaleString(),
            icon: '💥',
            description: 'Total enemies destroyed',
            color: '#e67e22'
          },
          {
            label: 'Power-ups Collected',
            value: stats.powerUpsCollected.toLocaleString(),
            icon: '⭐',
            description: 'Total power-ups picked up',
            color: '#f1c40f'
          },
          {
            label: 'Kill Rate',
            value: this.calculateKillRate(),
            icon: '🎯',
            description: 'Enemies defeated per minute',
            color: '#e74c3c'
          },
          {
            label: 'Power-up Rate',
            value: this.calculatePowerUpRate(),
            icon: '🔋',
            description: 'Power-ups collected per game',
            color: '#9b59b6'
          }
        ]
      },
      {
        id: 'time',
        name: 'Time Analysis',
        items: [
          {
            label: 'Average Session',
            value: this.calculateAverageSession(),
            icon: '⏰',
            description: 'Average time per gaming session',
            color: '#34495e'
          },
          {
            label: 'Longest Session',
            value: 'N/A', // Would need session tracking
            icon: '🕐',
            description: 'Your longest continuous play session',
            color: '#7f8c8d'
          },
          {
            label: 'Days Since Start',
            value: this.calculateDaysSinceStart(),
            icon: '📆',
            description: 'Days since you started playing',
            color: '#95a5a6'
          },
          {
            label: 'Efficiency Score',
            value: this.calculateEfficiency(),
            icon: '⚙️',
            description: 'Overall gameplay efficiency rating',
            color: '#2c3e50'
          }
        ]
      }
    ];
  }

  /**
   * Handle input
   */
  handleInput(key: string): boolean {
    if (this.state.isLoading) return false;

    if (this.state.showResetConfirmation) {
      return this.handleResetConfirmation(key);
    }

    switch (key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        this.navigateLeft();
        return true;
      case 'arrowright':
      case 'd':
        this.navigateRight();
        return true;
      case 'arrowup':
      case 'w':
        this.navigateUp();
        return true;
      case 'arrowdown':
      case 's':
        this.navigateDown();
        return true;
      case 'r':
        this.refresh();
        return true;
      case 'c':
        this.confirmReset();
        return true;
      case 'escape':
        this.onAction?.('back');
        return true;
    }

    return false;
  }

  /**
   * Handle reset confirmation
   */
  private handleResetConfirmation(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'y':
      case 'enter':
        this.resetStatistics();
        return true;
      case 'n':
      case 'escape':
        this.state.showResetConfirmation = false;
        return true;
    }
    return false;
  }

  /**
   * Navigate between categories
   */
  private navigateLeft(): void {
    const categories = this.state.categories;
    const currentIndex = categories.findIndex(c => c.id === this.state.selectedCategory);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1;
    
    this.state.selectedCategory = categories[newIndex].id as any;
    this.state.selectedIndex = 0;
  }

  private navigateRight(): void {
    const categories = this.state.categories;
    const currentIndex = categories.findIndex(c => c.id === this.state.selectedCategory);
    const newIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0;
    
    this.state.selectedCategory = categories[newIndex].id as any;
    this.state.selectedIndex = 0;
  }

  /**
   * Navigate within category
   */
  private navigateUp(): void {
    const currentCategory = this.getCurrentCategory();
    if (!currentCategory) return;
    
    this.state.selectedIndex = this.state.selectedIndex > 0 
      ? this.state.selectedIndex - 1 
      : currentCategory.items.length - 1;
  }

  private navigateDown(): void {
    const currentCategory = this.getCurrentCategory();
    if (!currentCategory) return;
    
    this.state.selectedIndex = this.state.selectedIndex < currentCategory.items.length - 1
      ? this.state.selectedIndex + 1 
      : 0;
  }

  /**
   * Get current category
   */
  private getCurrentCategory(): StatisticsCategory | undefined {
    return this.state.categories.find(c => c.id === this.state.selectedCategory);
  }

  /**
   * Refresh statistics
   */
  private async refresh(): Promise<void> {
    await this.initialize();
  }

  /**
   * Confirm statistics reset
   */
  private confirmReset(): void {
    this.state.showResetConfirmation = true;
  }

  /**
   * Reset all statistics
   */
  private async resetStatistics(): Promise<void> {
    try {
      if (window.electronAPI) {
        await window.electronAPI.game.resetStatistics();
        await this.initialize();
        this.onAction?.('stats-reset');
      }
    } catch (error) {
      console.error('Failed to reset statistics:', error);
    } finally {
      this.state.showResetConfirmation = false;
    }
  }

  /**
   * Calculation methods
   */
  private calculateScoreRate(): string {
    const { totalScore, totalPlayTime } = this.state.stats;
    if (totalPlayTime === 0) return '0/min';
    
    const rate = Math.round((totalScore / totalPlayTime) * 60);
    return `${rate.toLocaleString()}/min`;
  }

  private calculateCompletionRate(): string {
    const { totalGames, highestLevel } = this.state.stats;
    if (totalGames === 0) return '0%';
    
    // Estimate based on highest level (rough approximation)
    const completionRate = Math.min((highestLevel / 20) * 100, 100);
    return `${Math.round(completionRate)}%`;
  }

  private calculateKillRate(): string {
    const { enemiesDefeated, totalPlayTime } = this.state.stats;
    if (totalPlayTime === 0) return '0/min';
    
    const rate = Math.round((enemiesDefeated / totalPlayTime) * 60);
    return `${rate}/min`;
  }

  private calculatePowerUpRate(): string {
    const { powerUpsCollected, totalGames } = this.state.stats;
    if (totalGames === 0) return '0/game';
    
    const rate = Math.round((powerUpsCollected / totalGames) * 10) / 10;
    return `${rate}/game`;
  }

  private calculateAverageSession(): string {
    const { totalPlayTime, totalGames } = this.state.stats;
    if (totalGames === 0) return '0m';
    
    const avgSeconds = Math.round(totalPlayTime / totalGames);
    return this.formatPlayTime(avgSeconds);
  }

  private calculateDaysSinceStart(): string {
    const { lastPlayed } = this.state.stats;
    if (!lastPlayed) return '0 days';
    
    // This is a rough estimate - in a real app you'd track first play date
    const msInDay = 24 * 60 * 60 * 1000;
    const daysAgo = Math.floor((Date.now() - lastPlayed) / msInDay);
    return `${daysAgo} days`;
  }

  private calculateEfficiency(): string {
    const { totalScore, totalPlayTime, enemiesDefeated } = this.state.stats;
    if (totalPlayTime === 0) return 'N/A';
    
    // Simple efficiency metric based on score per time and enemies per time
    const scorePerMinute = (totalScore / totalPlayTime) * 60;
    const killsPerMinute = (enemiesDefeated / totalPlayTime) * 60;
    
    const efficiency = Math.round(((scorePerMinute + killsPerMinute * 10) / 100) * 100) / 100;
    return `${Math.min(efficiency, 100)}%`;
  }

  /**
   * Format play time
   */
  private formatPlayTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Format last played time
   */
  private formatLastPlayed(timestamp: number): string {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const msInMinute = 60 * 1000;
    const msInHour = 60 * msInMinute;
    const msInDay = 24 * msInHour;
    
    if (diff < msInMinute) {
      return 'Just now';
    } else if (diff < msInHour) {
      const minutes = Math.floor(diff / msInMinute);
      return `${minutes}m ago`;
    } else if (diff < msInDay) {
      const hours = Math.floor(diff / msInHour);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / msInDay);
      if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else {
        return new Date(timestamp).toLocaleDateString();
      }
    }
  }

  /**
   * Render the statistics UI
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
    } else if (this.state.showResetConfirmation) {
      this.renderResetConfirmation(w, h);
    } else {
      this.renderStatistics(w, h);
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
    this.ctx.fillText('Loading statistics...', w / 2, h / 2);
  }

  /**
   * Render main statistics view
   */
  private renderStatistics(w: number, h: number): void {
    const centerX = w / 2;
    
    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Game Statistics', centerX, 40);

    // Category tabs
    this.renderCategoryTabs(centerX, 120, w - 100);

    // Current category content
    const currentCategory = this.getCurrentCategory();
    if (currentCategory) {
      this.renderCategoryContent(centerX, 180, w - 100, h - 350, currentCategory);
    }

    // Instructions
    this.renderInstructions(centerX, h - 100);
  }

  /**
   * Render category tabs
   */
  private renderCategoryTabs(x: number, y: number, width: number): void {
    const tabWidth = width / this.state.categories.length;
    const tabHeight = 40;
    
    this.state.categories.forEach((category, index) => {
      const tabX = x - width / 2 + (index * tabWidth);
      const isSelected = category.id === this.state.selectedCategory;
      
      // Tab background
      this.ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(tabX, y, tabWidth, tabHeight);
      
      // Tab border
      this.ctx.strokeStyle = isSelected ? '#4a9eff' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = isSelected ? 2 : 1;
      this.ctx.strokeRect(tabX, y, tabWidth, tabHeight);
      
      // Tab text
      this.ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
      this.ctx.font = '16px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(category.name, tabX + tabWidth / 2, y + tabHeight / 2);
    });
  }

  /**
   * Render category content
   */
  private renderCategoryContent(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    category: StatisticsCategory
  ): void {
    const itemsPerRow = 2;
    const itemWidth = (width - 40) / itemsPerRow;
    const itemHeight = 120;
    const itemSpacing = 20;
    
    category.items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const itemX = x - width / 2 + 20 + (col * (itemWidth + itemSpacing));
      const itemY = y + (row * (itemHeight + itemSpacing));
      
      const isSelected = index === this.state.selectedIndex;
      
      this.renderStatisticItem(itemX, itemY, itemWidth, itemHeight, item, isSelected);
    });
  }

  /**
   * Render individual statistic item
   */
  private renderStatisticItem(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    item: StatisticsItem, 
    selected: boolean
  ): void {
    // Item background
    if (selected) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.fillRect(x, y, width, height);
      
      this.ctx.strokeStyle = '#4a9eff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.fillRect(x, y, width, height);
      
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }

    // Icon
    this.ctx.font = '24px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(item.icon, x + 15, y + 15);

    // Label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = '14px system-ui';
    this.ctx.fillText(item.label, x + 50, y + 20);

    // Value
    this.ctx.fillStyle = item.color;
    this.ctx.font = 'bold 24px system-ui';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(item.value, x + width - 15, y + 15);

    // Description
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px system-ui';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    
    // Wrap description text
    const maxWidth = width - 30;
    const words = item.description.split(' ');
    let line = '';
    let lineY = y + height - 20;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line) {
        this.ctx.fillText(line, x + 15, lineY);
        line = word;
        lineY += 14;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      this.ctx.fillText(line, x + 15, lineY);
    }
  }

  /**
   * Render reset confirmation
   */
  private renderResetConfirmation(w: number, h: number): void {
    const dialogW = 400;
    const dialogH = 200;
    const x = (w - dialogW) / 2;
    const y = (h - dialogH) / 2;

    // Dialog background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = 'rgba(20, 40, 60, 0.95)';
    this.ctx.fillRect(x, y, dialogW, dialogH);

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
    this.ctx.fillText('Reset All Statistics?', centerX, centerY - 30);

    this.ctx.font = '16px system-ui';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('This action cannot be undone.', centerX, centerY);

    this.ctx.fillText('Y to confirm • N or Escape to cancel', centerX, centerY + 40);
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
      '←→ Change category • ↑↓ Navigate items • R to refresh',
      'C to reset statistics • Escape to go back'
    ];

    instructions.forEach((instruction, index) => {
      this.ctx.fillText(instruction, x, y + (index * 18));
    });
  }

  /**
   * Get current state
   */
  getState(): StatisticsState {
    return { ...this.state };
  }
}