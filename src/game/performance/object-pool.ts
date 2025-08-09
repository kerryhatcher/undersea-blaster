/**
 * Generic object pool for game entities
 * Reduces garbage collection overhead by reusing objects
 */

export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize = 10,
    maxSize = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }
  
  /**
   * Get an object from the pool
   */
  acquire(): T | null {
    let obj = this.available.pop();
    
    if (!obj && this.inUse.size < this.maxSize) {
      obj = this.createFn();
    }
    
    if (obj) {
      this.inUse.add(obj);
      return obj;
    }
    
    return null; // Pool exhausted
  }
  
  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.resetFn(obj);
      this.available.push(obj);
    }
  }
  
  /**
   * Release all objects back to the pool
   */
  releaseAll(): void {
    this.inUse.forEach(obj => {
      this.resetFn(obj);
      this.available.push(obj);
    });
    this.inUse.clear();
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
  
  /**
   * Clear the pool completely
   */
  clear(): void {
    this.available.length = 0;
    this.inUse.clear();
  }
}

/**
 * Specialized pool for arrays of objects
 * Manages an array directly for better performance
 */
export class ArrayPool<T> {
  private items: (T & { _active: boolean })[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  private activeCount = 0;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize = 10,
    maxSize = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate array
    for (let i = 0; i < initialSize; i++) {
      const obj = { ...createFn(), _active: false };
      this.items.push(obj);
    }
  }
  
  /**
   * Get next available object
   */
  acquire(): (T & { _active: boolean }) | null {
    // Find inactive object
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i]._active) {
        this.items[i]._active = true;
        this.activeCount++;
        return this.items[i];
      }
    }
    
    // Create new if under limit
    if (this.items.length < this.maxSize) {
      const obj = { ...this.createFn(), _active: true };
      this.items.push(obj);
      this.activeCount++;
      return obj;
    }
    
    return null;
  }
  
  /**
   * Release an object back to pool
   */
  release(obj: T & { _active: boolean }): void {
    if (obj._active) {
      obj._active = false;
      this.activeCount--;
      this.resetFn(obj);
    }
  }
  
  /**
   * Get all active objects
   */
  getActive(): T[] {
    return this.items.filter(item => item._active);
  }
  
  /**
   * Process active objects and auto-release based on condition
   */
  processActive(
    processor: (obj: T, index: number) => boolean // return false to release
  ): void {
    let activeIndex = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i]._active) {
        const shouldKeep = processor(this.items[i], activeIndex++);
        if (!shouldKeep) {
          this.release(this.items[i]);
        }
      }
    }
  }
  
  /**
   * Release all active objects
   */
  releaseAll(): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i]._active) {
        this.items[i]._active = false;
        this.resetFn(this.items[i]);
      }
    }
    this.activeCount = 0;
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { active: number; total: number; capacity: number } {
    return {
      active: this.activeCount,
      total: this.items.length,
      capacity: this.maxSize
    };
  }
}