"use strict";
/**
 * Database Manager for Undersea Blaster
 * Handles all persistent data storage using SQLite
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseManager = exports.DatabaseManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const electron_1 = require("electron");
const crypto = __importStar(require("crypto"));
class DatabaseManager {
    db = null;
    dbPath;
    isInitialized = false;
    constructor() {
        // Store database in user data directory
        const userDataPath = electron_1.app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'undersea-blaster.db');
    }
    /**
     * Initialize database and create tables
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            // Open database
            this.db = new better_sqlite3_1.default(this.dbPath);
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');
            // Create tables
            this.createTables();
            // Run migrations if needed
            await this.runMigrations();
            this.isInitialized = true;
            console.log('Database initialized at:', this.dbPath);
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
    /**
     * Create database tables
     */
    createTables() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Save games table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_name TEXT UNIQUE NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER NOT NULL,
        player_hits INTEGER NOT NULL,
        player_max_hits INTEGER NOT NULL,
        bazooka_active INTEGER NOT NULL DEFAULT 0,
        shotgun_active INTEGER NOT NULL DEFAULT 0,
        laser_active INTEGER NOT NULL DEFAULT 0,
        next_upgrade_at INTEGER NOT NULL,
        play_time INTEGER NOT NULL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
        // High scores table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS high_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER NOT NULL,
        play_time INTEGER NOT NULL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
        // Settings table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
        // Game statistics table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_play_time INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        highest_level INTEGER DEFAULT 0,
        enemies_defeated INTEGER DEFAULT 0,
        power_ups_collected INTEGER DEFAULT 0,
        last_played INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        CHECK (id = 1)
      )
    `);
        // Initialize game stats if not exists
        this.db.exec(`
      INSERT OR IGNORE INTO game_stats (id) VALUES (1)
    `);
        // Create indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
      CREATE INDEX IF NOT EXISTS idx_saves_updated ON saves(updated_at DESC);
    `);
    }
    /**
     * Run database migrations
     */
    async runMigrations() {
        if (!this.db)
            return;
        // Get current version
        const version = this.getSetting('db_version') || '0';
        // Migration logic would go here
        // For now, just set version to 1
        if (version === '0') {
            this.setSetting('db_version', '1');
        }
    }
    /**
     * Calculate checksum for save data
     */
    calculateChecksum(data) {
        const str = JSON.stringify(data);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    /**
     * Verify checksum for save data
     */
    verifyChecksum(save) {
        const { id, checksum, ...data } = save;
        const calculated = this.calculateChecksum(data);
        return calculated === checksum;
    }
    /**
     * Save game to a slot
     */
    saveGame(slotName, data) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const timestamp = Date.now();
            const saveData = { ...data, slotName, timestamp };
            const checksum = this.calculateChecksum(saveData);
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO saves (
          slot_name, score, level, player_hits, player_max_hits,
          bazooka_active, shotgun_active, laser_active, next_upgrade_at,
          play_time, timestamp, checksum, updated_at
        ) VALUES (
          @slotName, @score, @level, @playerHits, @playerMaxHits,
          @bazookaActive, @shotgunActive, @laserActive, @nextUpgradeAt,
          @playTime, @timestamp, @checksum, @updatedAt
        )
      `);
            const result = stmt.run({
                ...saveData,
                bazookaActive: data.bazookaActive ? 1 : 0,
                shotgunActive: data.shotgunActive ? 1 : 0,
                laserActive: data.laserActive ? 1 : 0,
                checksum,
                updatedAt: timestamp
            });
            return result.changes > 0;
        }
        catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }
    /**
     * Load game from a slot
     */
    loadGame(slotName) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM saves WHERE slot_name = ? LIMIT 1
      `);
            const row = stmt.get(slotName);
            if (!row)
                return null;
            const save = {
                id: row.id,
                slotName: row.slot_name,
                score: row.score,
                level: row.level,
                playerHits: row.player_hits,
                playerMaxHits: row.player_max_hits,
                bazookaActive: row.bazooka_active === 1,
                shotgunActive: row.shotgun_active === 1,
                laserActive: row.laser_active === 1,
                nextUpgradeAt: row.next_upgrade_at,
                playTime: row.play_time || 0,
                timestamp: row.timestamp,
                checksum: row.checksum
            };
            // Verify checksum
            if (!this.verifyChecksum(save)) {
                console.warn('Save file checksum mismatch - data may be corrupted');
            }
            return save;
        }
        catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }
    /**
     * Get all save slots
     */
    getAllSaves() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM saves ORDER BY updated_at DESC
      `);
            const rows = stmt.all();
            return rows.map(row => ({
                id: row.id,
                slotName: row.slot_name,
                score: row.score,
                level: row.level,
                playerHits: row.player_hits,
                playerMaxHits: row.player_max_hits,
                bazookaActive: row.bazooka_active === 1,
                shotgunActive: row.shotgun_active === 1,
                laserActive: row.laser_active === 1,
                nextUpgradeAt: row.next_upgrade_at,
                playTime: row.play_time || 0,
                timestamp: row.timestamp,
                checksum: row.checksum
            }));
        }
        catch (error) {
            console.error('Failed to get saves:', error);
            return [];
        }
    }
    /**
     * Delete a save slot
     */
    deleteSave(slotName) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare('DELETE FROM saves WHERE slot_name = ?');
            const result = stmt.run(slotName);
            return result.changes > 0;
        }
        catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }
    /**
     * Add a high score
     */
    addHighScore(score) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare(`
        INSERT INTO high_scores (player_name, score, level, play_time, timestamp)
        VALUES (@playerName, @score, @level, @playTime, @timestamp)
      `);
            const result = stmt.run({
                playerName: score.playerName.slice(0, 50), // Limit name length
                score: score.score,
                level: score.level,
                playTime: score.playTime || 0,
                timestamp: score.timestamp || Date.now()
            });
            return result.changes > 0;
        }
        catch (error) {
            console.error('Failed to add high score:', error);
            return false;
        }
    }
    /**
     * Get top high scores
     */
    getHighScores(limit = 10) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM high_scores 
        ORDER BY score DESC, timestamp DESC 
        LIMIT ?
      `);
            const rows = stmt.all(limit);
            return rows.map(row => ({
                id: row.id,
                playerName: row.player_name,
                score: row.score,
                level: row.level,
                playTime: row.play_time || 0,
                timestamp: row.timestamp
            }));
        }
        catch (error) {
            console.error('Failed to get high scores:', error);
            return [];
        }
    }
    /**
     * Get a setting value
     */
    getSetting(key) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
            const row = stmt.get(key);
            return row ? row.value : null;
        }
        catch (error) {
            console.error('Failed to get setting:', error);
            return null;
        }
    }
    /**
     * Set a setting value
     */
    setSetting(key, value) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `);
            const result = stmt.run(key, value, Date.now());
            return result.changes > 0;
        }
        catch (error) {
            console.error('Failed to set setting:', error);
            return false;
        }
    }
    /**
     * Get all settings
     */
    getAllSettings() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare('SELECT key, value FROM settings');
            const rows = stmt.all();
            const settings = {};
            for (const row of rows) {
                settings[row.key] = row.value;
            }
            return settings;
        }
        catch (error) {
            console.error('Failed to get settings:', error);
            return {};
        }
    }
    /**
     * Update game statistics
     */
    updateGameStats(updates) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const fields = [];
            const values = {};
            if (updates.totalPlayTime !== undefined) {
                fields.push('total_play_time = total_play_time + @playTime');
                values.playTime = updates.totalPlayTime;
            }
            if (updates.totalGames !== undefined) {
                fields.push('total_games = total_games + @games');
                values.games = updates.totalGames;
            }
            if (updates.totalScore !== undefined) {
                fields.push('total_score = total_score + @score');
                values.score = updates.totalScore;
            }
            if (updates.highestLevel !== undefined) {
                fields.push('highest_level = MAX(highest_level, @level)');
                values.level = updates.highestLevel;
            }
            if (updates.enemiesDefeated !== undefined) {
                fields.push('enemies_defeated = enemies_defeated + @enemies');
                values.enemies = updates.enemiesDefeated;
            }
            if (updates.powerUpsCollected !== undefined) {
                fields.push('power_ups_collected = power_ups_collected + @powerups');
                values.powerups = updates.powerUpsCollected;
            }
            fields.push('last_played = @lastPlayed');
            values.lastPlayed = Date.now();
            const stmt = this.db.prepare(`
        UPDATE game_stats SET ${fields.join(', ')} WHERE id = 1
      `);
            const result = stmt.run(values);
            return result.changes > 0;
        }
        catch (error) {
            console.error('Failed to update game stats:', error);
            return false;
        }
    }
    /**
     * Get game statistics
     */
    getGameStats() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const stmt = this.db.prepare('SELECT * FROM game_stats WHERE id = 1');
            const row = stmt.get();
            if (!row)
                return null;
            return {
                totalPlayTime: row.total_play_time,
                totalGames: row.total_games,
                totalScore: row.total_score,
                highestLevel: row.highest_level,
                enemiesDefeated: row.enemies_defeated,
                powerUpsCollected: row.power_ups_collected,
                lastPlayed: row.last_played
            };
        }
        catch (error) {
            console.error('Failed to get game stats:', error);
            return null;
        }
    }
    /**
     * Export all data (for backup)
     */
    exportData() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            return {
                version: this.getSetting('db_version'),
                saves: this.getAllSaves(),
                highScores: this.getHighScores(100),
                settings: this.getAllSettings(),
                stats: this.getGameStats(),
                exportDate: Date.now()
            };
        }
        catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
    /**
     * Import data (for restore)
     */
    importData(data) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            // Start transaction
            this.db.exec('BEGIN TRANSACTION');
            // Import saves
            if (data.saves) {
                for (const save of data.saves) {
                    this.saveGame(save.slotName, save);
                }
            }
            // Import high scores
            if (data.highScores) {
                for (const score of data.highScores) {
                    this.addHighScore(score);
                }
            }
            // Import settings
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    this.setSetting(key, value);
                }
            }
            // Commit transaction
            this.db.exec('COMMIT');
            return true;
        }
        catch (error) {
            console.error('Failed to import data:', error);
            this.db?.exec('ROLLBACK');
            return false;
        }
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}
exports.DatabaseManager = DatabaseManager;
// Export singleton instance
exports.databaseManager = new DatabaseManager();
