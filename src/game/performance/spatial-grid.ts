/**
 * Spatial Grid for Optimized Collision Detection
 * Divides space into cells for efficient proximity queries
 */

export interface GridObject {
  x: number;
  y: number;
  radius: number;
  id?: number | string;
}

export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, Set<GridObject>>;
  private objectCells: Map<GridObject, Set<string>>;
  private width: number;
  private height: number;

  constructor(width: number, height: number, cellSize: number = 100) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cells = new Map();
    this.objectCells = new Map();
  }

  /**
   * Get cell key for a position
   */
  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Get all cells that an object overlaps
   */
  private getObjectCells(obj: GridObject): string[] {
    const cells: string[] = [];
    const minX = obj.x - obj.radius;
    const maxX = obj.x + obj.radius;
    const minY = obj.y - obj.radius;
    const maxY = obj.y + obj.radius;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        cells.push(`${cx},${cy}`);
      }
    }

    return cells;
  }

  /**
   * Insert an object into the grid
   */
  insert(obj: GridObject): void {
    const cellKeys = this.getObjectCells(obj);
    const cellSet = new Set(cellKeys);
    
    // Store which cells this object is in
    this.objectCells.set(obj, cellSet);

    // Add object to each cell
    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key)!.add(obj);
    }
  }

  /**
   * Remove an object from the grid
   */
  remove(obj: GridObject): void {
    const cellKeys = this.objectCells.get(obj);
    if (!cellKeys) return;

    // Remove from each cell
    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(obj);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.objectCells.delete(obj);
  }

  /**
   * Update an object's position
   */
  update(obj: GridObject): void {
    const oldCells = this.objectCells.get(obj);
    const newCells = this.getObjectCells(obj);
    const newCellSet = new Set(newCells);

    // If cells haven't changed, no need to update
    if (oldCells && this.areSetsEqual(oldCells, newCellSet)) {
      return;
    }

    // Remove from old cells
    if (oldCells) {
      for (const key of oldCells) {
        if (!newCellSet.has(key)) {
          const cell = this.cells.get(key);
          if (cell) {
            cell.delete(obj);
            if (cell.size === 0) {
              this.cells.delete(key);
            }
          }
        }
      }
    }

    // Add to new cells
    for (const key of newCells) {
      if (!oldCells || !oldCells.has(key)) {
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(obj);
      }
    }

    this.objectCells.set(obj, newCellSet);
  }

  /**
   * Query objects near a point
   */
  query(x: number, y: number, radius: number): GridObject[] {
    const results: Set<GridObject> = new Set();
    const minX = x - radius;
    const maxX = x + radius;
    const minY = y - radius;
    const maxY = y + radius;

    const startCX = Math.floor(minX / this.cellSize);
    const endCX = Math.floor(maxX / this.cellSize);
    const startCY = Math.floor(minY / this.cellSize);
    const endCY = Math.floor(maxY / this.cellSize);

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (cell) {
          cell.forEach(obj => results.add(obj));
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Get potential collision pairs
   */
  getPotentialPairs(): [GridObject, GridObject][] {
    const pairs: [GridObject, GridObject][] = [];
    const checked = new Set<string>();

    for (const cell of this.cells.values()) {
      const objects = Array.from(cell);
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const pairKey = this.getPairKey(objects[i], objects[j]);
          if (!checked.has(pairKey)) {
            checked.add(pairKey);
            pairs.push([objects[i], objects[j]]);
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Clear the grid
   */
  clear(): void {
    this.cells.clear();
    this.objectCells.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    cellCount: number;
    objectCount: number;
    avgObjectsPerCell: number;
  } {
    const cellCount = this.cells.size;
    const objectCount = this.objectCells.size;
    
    let totalObjects = 0;
    for (const cell of this.cells.values()) {
      totalObjects += cell.size;
    }

    return {
      cellCount,
      objectCount,
      avgObjectsPerCell: cellCount > 0 ? totalObjects / cellCount : 0
    };
  }

  /**
   * Helper: Check if two sets are equal
   */
  private areSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  /**
   * Helper: Get unique key for a pair of objects
   */
  private getPairKey(a: GridObject, b: GridObject): string {
    const aId = a.id || `${a.x},${a.y}`;
    const bId = b.id || `${b.x},${b.y}`;
    return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
  }
}

/**
 * Optimized collision detection using spatial grid
 */
export function checkCollisions(
  grid: SpatialGrid,
  bullets: GridObject[],
  enemies: GridObject[],
  player: GridObject
): {
  bulletHits: Array<{ bullet: GridObject; enemy: GridObject }>;
  playerHits: GridObject[];
} {
  const bulletHits: Array<{ bullet: GridObject; enemy: GridObject }> = [];
  const playerHits: GridObject[] = [];

  // Check bullet-enemy collisions
  for (const bullet of bullets) {
    const nearbyEnemies = grid.query(bullet.x, bullet.y, bullet.radius + 30);
    for (const enemy of nearbyEnemies) {
      if (enemies.includes(enemy)) {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < bullet.radius + enemy.radius) {
          bulletHits.push({ bullet, enemy });
          break; // Bullet can only hit one enemy
        }
      }
    }
  }

  // Check player-enemy collisions
  const nearbyEnemies = grid.query(player.x, player.y, player.radius + 30);
  for (const enemy of nearbyEnemies) {
    if (enemies.includes(enemy)) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.radius + enemy.radius) {
        playerHits.push(enemy);
      }
    }
  }

  return { bulletHits, playerHits };
}