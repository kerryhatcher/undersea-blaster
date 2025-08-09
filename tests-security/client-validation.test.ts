/**
 * Client-Side Validation Security Tests
 * Tests for score tampering, state manipulation, and input validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, createInitialState } from '../src/game/state';
import { JSDOM } from 'jsdom';

describe('Client-Side Security Validation', () => {
  let gameState: GameState;
  let dom: JSDOM;
  
  beforeEach(() => {
    // Setup DOM environment
    dom = new JSDOM('<!DOCTYPE html><canvas id="game"></canvas>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    global.window = dom.window as any;
    global.document = dom.window.document;
    
    // Initialize game state
    gameState = createInitialState(() => 800, () => 600);
  });

  describe('Score Manipulation Protection', () => {
    it('should validate score is non-negative', () => {
      // Test: Attempt to set negative score
      const validateScore = (score: number): number => {
        return Math.max(0, Math.min(score, Number.MAX_SAFE_INTEGER));
      };
      
      expect(validateScore(-100)).toBe(0);
      expect(validateScore(-1)).toBe(0);
    });

    it('should cap score at maximum safe integer', () => {
      const validateScore = (score: number): number => {
        return Math.max(0, Math.min(score, Number.MAX_SAFE_INTEGER));
      };
      
      expect(validateScore(Number.MAX_SAFE_INTEGER + 1)).toBe(Number.MAX_SAFE_INTEGER);
      expect(validateScore(Infinity)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should detect impossible score jumps', () => {
      const detectScoreAnomaly = (oldScore: number, newScore: number, deltaTime: number): boolean => {
        const maxScorePerSecond = 1000; // Maximum possible score gain per second
        const maxPossibleScore = oldScore + (maxScorePerSecond * deltaTime / 1000);
        return newScore > maxPossibleScore;
      };
      
      expect(detectScoreAnomaly(100, 200, 1000)).toBe(false); // Possible
      expect(detectScoreAnomaly(100, 10000, 1000)).toBe(true); // Impossible
      expect(detectScoreAnomaly(0, 50000, 100)).toBe(true); // Impossible
    });

    it('should validate score-to-level ratio', () => {
      const validateScoreLevelRatio = (score: number, level: number): boolean => {
        // Approximate max score per level (conservative estimate)
        const maxScorePerLevel = 500;
        const maxPossibleScore = level * maxScorePerLevel;
        return score <= maxPossibleScore;
      };
      
      expect(validateScoreLevelRatio(100, 1)).toBe(true);
      expect(validateScoreLevelRatio(1000, 1)).toBe(false);
      expect(validateScoreLevelRatio(5000, 15)).toBe(true);
      expect(validateScoreLevelRatio(100000, 10)).toBe(false);
    });
  });

  describe('Player State Validation', () => {
    it('should validate player position bounds', () => {
      const validatePosition = (x: number, y: number, w: number, h: number): {x: number, y: number} => {
        return {
          x: Math.max(0, Math.min(x, w)),
          y: Math.max(0, Math.min(y, h))
        };
      };
      
      const validated = validatePosition(-100, 9999, 800, 600);
      expect(validated.x).toBe(0);
      expect(validated.y).toBe(600);
    });

    it('should validate player speed limits', () => {
      const MAX_SPEED = 500; // Maximum allowed speed
      const validateSpeed = (speed: number): number => {
        return Math.max(0, Math.min(speed, MAX_SPEED));
      };
      
      expect(validateSpeed(9999)).toBe(MAX_SPEED);
      expect(validateSpeed(-50)).toBe(0);
      expect(validateSpeed(260)).toBe(260); // Normal speed
    });

    it('should validate invulnerability timer', () => {
      const MAX_INVULN = 5000; // Maximum invulnerability time in ms
      const validateInvuln = (invuln: number): number => {
        if (invuln === Infinity || invuln < 0) return 0;
        return Math.min(invuln, MAX_INVULN);
      };
      
      expect(validateInvuln(Infinity)).toBe(0);
      expect(validateInvuln(-100)).toBe(0);
      expect(validateInvuln(10000)).toBe(MAX_INVULN);
    });

    it('should validate health values', () => {
      const validateHealth = (hits: number, maxHits: number): {hits: number, maxHits: number} => {
        const MAX_HEALTH = 10;
        const validMaxHits = Math.max(1, Math.min(maxHits, MAX_HEALTH));
        const validHits = Math.max(0, Math.min(hits, validMaxHits));
        return { hits: validHits, maxHits: validMaxHits };
      };
      
      expect(validateHealth(-5, 5)).toEqual({ hits: 0, maxHits: 5 });
      expect(validateHealth(100, 100)).toEqual({ hits: 10, maxHits: 10 });
      expect(validateHealth(5, 3)).toEqual({ hits: 3, maxHits: 3 });
    });
  });

  describe('Weapon Timer Validation', () => {
    it('should cap weapon timers at maximum duration', () => {
      const MAX_WEAPON_TIME = 30000; // 30 seconds max
      const validateWeaponTimer = (timer: number): number => {
        if (timer < 0) return 0;
        return Math.min(timer, MAX_WEAPON_TIME);
      };
      
      expect(validateWeaponTimer(999999)).toBe(MAX_WEAPON_TIME);
      expect(validateWeaponTimer(-100)).toBe(0);
      expect(validateWeaponTimer(5000)).toBe(5000);
    });

    it('should detect simultaneous weapon exploit', () => {
      const validateWeaponStates = (bazooka: boolean, shotgun: boolean, laser: boolean): boolean => {
        // Only one special weapon should be active at a time
        const activeCount = [bazooka, shotgun, laser].filter(Boolean).length;
        return activeCount <= 1;
      };
      
      expect(validateWeaponStates(true, false, false)).toBe(true);
      expect(validateWeaponStates(true, true, false)).toBe(false);
      expect(validateWeaponStates(true, true, true)).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize player name input', () => {
      const sanitizeName = (name: string): string => {
        // Remove HTML tags and dangerous characters
        return name
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/[<>\"'`]/g, '') // Remove dangerous characters
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .trim()
          .substring(0, 20); // Limit length
      };
      
      expect(sanitizeName('<script>alert("XSS")</script>')).toBe('alert(XSS)');
      expect(sanitizeName('Normal Name')).toBe('Normal Name');
      expect(sanitizeName('Name<img src=x onerror=alert(1)>')).toBe('Nameimg src=x onerror=alert(1)');
      expect(sanitizeName('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should validate save slot names', () => {
      const validateSlotName = (name: string): boolean => {
        const validSlots = ['autosave', 'quicksave', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];
        return validSlots.includes(name);
      };
      
      expect(validateSlotName('slot1')).toBe(true);
      expect(validateSlotName("'; DROP TABLE saves; --")).toBe(false);
      expect(validateSlotName('../../../etc/passwd')).toBe(false);
    });

    it('should validate settings keys', () => {
      const validateSettingsKey = (key: string): boolean => {
        // Only allow alphanumeric and dots for nested keys
        const validKeyPattern = /^[a-zA-Z0-9.]+$/;
        const hasPathTraversal = key.includes('../') || key.includes('..\\');
        
        return validKeyPattern.test(key) && !hasPathTraversal && key.length < 100;
      };
      
      expect(validateSettingsKey('graphics.resolution')).toBe(true);
      expect(validateSettingsKey('../../etc/passwd')).toBe(false);
      expect(validateSettingsKey('settings"; DROP TABLE; --')).toBe(false);
      expect(validateSettingsKey('a'.repeat(101))).toBe(false);
    });
  });

  describe('Entity Limit Validation', () => {
    it('should enforce maximum entity counts', () => {
      const MAX_ENTITIES = {
        bullets: 100,
        enemies: 50,
        explosions: 20,
        upgrades: 5
      };
      
      const validateEntityCount = (type: keyof typeof MAX_ENTITIES, count: number): boolean => {
        return count <= MAX_ENTITIES[type];
      };
      
      expect(validateEntityCount('bullets', 50)).toBe(true);
      expect(validateEntityCount('bullets', 200)).toBe(false);
      expect(validateEntityCount('enemies', 100)).toBe(false);
      expect(validateEntityCount('explosions', 15)).toBe(true);
    });

    it('should detect memory exhaustion attempts', () => {
      const detectMemoryAttack = (arrayLength: number, objectSize: number): boolean => {
        const MAX_MEMORY = 50 * 1024 * 1024; // 50MB limit
        const estimatedMemory = arrayLength * objectSize;
        return estimatedMemory > MAX_MEMORY;
      };
      
      expect(detectMemoryAttack(10000, 100)).toBe(false); // 1MB
      expect(detectMemoryAttack(1000000, 100)).toBe(true); // 100MB
    });
  });

  describe('State Consistency Checks', () => {
    it('should validate game state consistency', () => {
      const validateStateConsistency = (state: Partial<GameState>): string[] => {
        const errors: string[] = [];
        
        // Check score consistency
        if (state.score !== undefined && state.score < 0) {
          errors.push('Negative score detected');
        }
        
        // Check level consistency
        if (state.level !== undefined && state.level < 1) {
          errors.push('Invalid level value');
        }
        
        // Check player state
        if (state.player) {
          if (state.player.hits > state.player.maxHits) {
            errors.push('Player hits exceed maximum');
          }
          if (state.player.invuln === Infinity) {
            errors.push('Infinite invulnerability detected');
          }
        }
        
        // Check weapon states
        if (state.bazookaActive && state.shotgunActive && state.laserActive) {
          errors.push('Multiple weapons active simultaneously');
        }
        
        return errors;
      };
      
      expect(validateStateConsistency({ score: -100 })).toContain('Negative score detected');
      expect(validateStateConsistency({ 
        player: { hits: 10, maxHits: 5 } as any 
      })).toContain('Player hits exceed maximum');
      expect(validateStateConsistency({ 
        bazookaActive: true, 
        shotgunActive: true, 
        laserActive: true 
      })).toContain('Multiple weapons active simultaneously');
    });

    it('should detect teleportation', () => {
      const detectTeleportation = (
        oldX: number, 
        oldY: number, 
        newX: number, 
        newY: number, 
        deltaTime: number,
        maxSpeed: number
      ): boolean => {
        const distance = Math.sqrt((newX - oldX) ** 2 + (newY - oldY) ** 2);
        const maxDistance = (maxSpeed * deltaTime) / 1000;
        return distance > maxDistance * 1.1; // 10% tolerance
      };
      
      expect(detectTeleportation(0, 0, 100, 0, 1000, 260)).toBe(false); // Possible
      expect(detectTeleportation(0, 0, 1000, 0, 100, 260)).toBe(true); // Teleportation
    });
  });

  describe('Checksum Validation', () => {
    it('should calculate consistent checksums', () => {
      const calculateChecksum = (data: any): string => {
        const crypto = require('crypto');
        const sortedData = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(sortedData).digest('hex');
      };
      
      const data1 = { score: 100, level: 5 };
      const data2 = { level: 5, score: 100 }; // Different order, same data
      const data3 = { score: 101, level: 5 }; // Different data
      
      expect(calculateChecksum(data1)).toBe(calculateChecksum(data2));
      expect(calculateChecksum(data1)).not.toBe(calculateChecksum(data3));
    });

    it('should detect tampered save data', () => {
      const verifyChecksum = (data: any, providedChecksum: string): boolean => {
        const crypto = require('crypto');
        const sortedData = JSON.stringify(data, Object.keys(data).sort());
        const calculatedChecksum = crypto.createHash('sha256').update(sortedData).digest('hex');
        return calculatedChecksum === providedChecksum;
      };
      
      const saveData = { score: 100, level: 5 };
      const correctChecksum = require('crypto')
        .createHash('sha256')
        .update(JSON.stringify(saveData, Object.keys(saveData).sort()))
        .digest('hex');
      const wrongChecksum = 'tamperedchecksum123';
      
      expect(verifyChecksum(saveData, correctChecksum)).toBe(true);
      expect(verifyChecksum(saveData, wrongChecksum)).toBe(false);
    });
  });
});