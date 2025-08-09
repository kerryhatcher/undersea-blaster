/**
 * Performance Test Suite for Undersea Blaster
 * 
 * This module provides automated performance testing capabilities
 * to measure and validate game performance against defined benchmarks.
 */

import { GameState } from './game/state';

export interface PerformanceMetrics {
  fps: number[];
  updateTime: number[];
  renderTime: number[];
  memoryUsage: number[];
  objectCounts: {
    bullets: number;
    enemies: number;
    explosions: number;
    impacts: number;
    trails: number;
  };
  gcEvents: number;
  frameBudgetViolations: number;
}

export interface TestResult {
  name: string;
  duration: number;
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  p95FPS: number;
  p99FPS: number;
  avgUpdateTime: number;
  maxUpdateTime: number;
  avgRenderTime: number;
  maxRenderTime: number;
  memoryUsedMB: number;
  memoryPeakMB: number;
  gcCount: number;
  violations: number;
  passed: boolean;
  details: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameStart: number = 0;
  private updateEnd: number = 0;
  private lastGCTime: number = 0;
  private readonly maxSamples = 600; // 10 seconds at 60 FPS

  constructor() {
    this.metrics = {
      fps: [],
      updateTime: [],
      renderTime: [],
      memoryUsage: [],
      objectCounts: {
        bullets: 0,
        enemies: 0,
        explosions: 0,
        impacts: 0,
        trails: 0
      },
      gcEvents: 0,
      frameBudgetViolations: 0
    };
  }

  startFrame(): void {
    this.frameStart = performance.now();
    
    // Detect GC events (heuristic: frame time spike > 30ms)
    if (this.lastGCTime > 0) {
      const timeSinceLastFrame = this.frameStart - this.lastGCTime;
      if (timeSinceLastFrame > 30) {
        this.metrics.gcEvents++;
      }
    }
    this.lastGCTime = this.frameStart;
  }

  endUpdate(): void {
    this.updateEnd = performance.now();
    const updateTime = this.updateEnd - this.frameStart;
    this.metrics.updateTime.push(updateTime);
    
    // Check update budget violation (>10ms)
    if (updateTime > 10) {
      this.metrics.frameBudgetViolations++;
    }
    
    this.trimMetrics();
  }

  endRender(): void {
    const renderEnd = performance.now();
    const renderTime = renderEnd - this.updateEnd;
    const frameTime = renderEnd - this.frameStart;
    
    this.metrics.renderTime.push(renderTime);
    this.metrics.fps.push(1000 / frameTime);
    
    // Check render budget violation (>7ms)
    if (renderTime > 7) {
      this.metrics.frameBudgetViolations++;
    }
    
    this.trimMetrics();
  }

  recordMemory(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage.push(memInfo.usedJSHeapSize);
    }
  }

  recordObjects(state: GameState): void {
    let trailCount = 0;
    for (const bullet of state.bullets) {
      if (bullet.trail) {
        trailCount += bullet.trail.length;
      }
    }

    this.metrics.objectCounts = {
      bullets: state.bullets.length,
      enemies: state.patties.length,
      explosions: state.explosions.length,
      impacts: state.impacts.length,
      trails: trailCount
    };
  }

  private trimMetrics(): void {
    if (this.metrics.fps.length > this.maxSamples) {
      this.metrics.fps.shift();
    }
    if (this.metrics.updateTime.length > this.maxSamples) {
      this.metrics.updateTime.shift();
    }
    if (this.metrics.renderTime.length > this.maxSamples) {
      this.metrics.renderTime.shift();
    }
    if (this.metrics.memoryUsage.length > this.maxSamples) {
      this.metrics.memoryUsage.shift();
    }
  }

  getReport(testName: string, duration: number): TestResult {
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
    const percentile = (arr: number[], p: number) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * (1 - p));
      return sorted[index];
    };

    const avgFPS = avg(this.metrics.fps);
    const minFPS = min(this.metrics.fps);
    const p95FPS = percentile(this.metrics.fps, 0.95);
    const p99FPS = percentile(this.metrics.fps, 0.99);
    const avgUpdate = avg(this.metrics.updateTime);
    const maxUpdate = max(this.metrics.updateTime);
    const avgRender = avg(this.metrics.renderTime);
    const maxRender = max(this.metrics.renderTime);
    const memoryUsedMB = avg(this.metrics.memoryUsage) / 1048576;
    const memoryPeakMB = max(this.metrics.memoryUsage) / 1048576;

    // Determine pass/fail based on requirements
    const passed = 
      minFPS >= 45 &&
      avgFPS >= 55 &&
      maxUpdate <= 15 &&
      maxRender <= 10 &&
      memoryPeakMB <= 150;

    const details = this.generateDetails(avgFPS, minFPS, maxUpdate, maxRender, memoryPeakMB);

    return {
      name: testName,
      duration,
      avgFPS,
      minFPS,
      maxFPS: max(this.metrics.fps),
      p95FPS,
      p99FPS,
      avgUpdateTime: avgUpdate,
      maxUpdateTime: maxUpdate,
      avgRenderTime: avgRender,
      maxRenderTime: maxRender,
      memoryUsedMB,
      memoryPeakMB,
      gcCount: this.metrics.gcEvents,
      violations: this.metrics.frameBudgetViolations,
      passed,
      details
    };
  }

  private generateDetails(avgFPS: number, minFPS: number, maxUpdate: number, maxRender: number, memoryPeakMB: number): string {
    const issues: string[] = [];
    
    if (avgFPS < 55) issues.push(`Low average FPS: ${avgFPS.toFixed(1)}`);
    if (minFPS < 45) issues.push(`Critical FPS drop: ${minFPS.toFixed(1)}`);
    if (maxUpdate > 15) issues.push(`Update loop exceeded budget: ${maxUpdate.toFixed(1)}ms`);
    if (maxRender > 10) issues.push(`Render loop exceeded budget: ${maxRender.toFixed(1)}ms`);
    if (memoryPeakMB > 150) issues.push(`High memory usage: ${memoryPeakMB.toFixed(1)}MB`);
    
    return issues.length ? issues.join('; ') : 'All performance criteria met';
  }

  reset(): void {
    this.metrics = {
      fps: [],
      updateTime: [],
      renderTime: [],
      memoryUsage: [],
      objectCounts: {
        bullets: 0,
        enemies: 0,
        explosions: 0,
        impacts: 0,
        trails: 0
      },
      gcEvents: 0,
      frameBudgetViolations: 0
    };
    this.frameStart = 0;
    this.updateEnd = 0;
    this.lastGCTime = 0;
  }
}

export interface TestScenario {
  name: string;
  duration: number;
  setup: (state: GameState) => void;
  update?: (state: GameState, elapsed: number) => void;
  teardown?: (state: GameState) => void;
}

export class PerformanceTestRunner {
  private monitor: PerformanceMonitor;
  private results: TestResult[] = [];

  constructor() {
    this.monitor = new PerformanceMonitor();
  }

  async runTest(
    scenario: TestScenario, 
    state: GameState, 
    updateFn: (dt: number, now: number) => void,
    drawFn: (now: number) => void
  ): Promise<TestResult> {
    console.log(`🧪 Running test: ${scenario.name}`);
    this.monitor.reset();
    
    // Setup test conditions
    scenario.setup(state);
    
    const startTime = performance.now();
    let lastUpdate = startTime;
    let frameCount = 0;
    
    // Run test for specified duration
    while (performance.now() - startTime < scenario.duration) {
      const now = performance.now();
      const elapsed = now - startTime;
      
      this.monitor.startFrame();
      
      // Call scenario update if provided
      if (scenario.update) {
        scenario.update(state, elapsed);
      }
      
      // Run game update with fixed timestep for consistency
      updateFn(0.016, now);
      this.monitor.endUpdate();
      
      // Run game render
      drawFn(now);
      this.monitor.endRender();
      
      // Record metrics
      this.monitor.recordMemory();
      this.monitor.recordObjects(state);
      
      frameCount++;
      
      // Yield to browser for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    // Cleanup
    if (scenario.teardown) {
      scenario.teardown(state);
    }
    
    const result = this.monitor.getReport(scenario.name, scenario.duration);
    this.results.push(result);
    
    console.log(`✅ Test complete: ${scenario.name}`);
    console.log(`   FPS: ${result.avgFPS.toFixed(1)} avg, ${result.minFPS.toFixed(1)} min`);
    console.log(`   Update: ${result.avgUpdateTime.toFixed(2)}ms avg, ${result.maxUpdateTime.toFixed(2)}ms max`);
    console.log(`   Render: ${result.avgRenderTime.toFixed(2)}ms avg, ${result.maxRenderTime.toFixed(2)}ms max`);
    console.log(`   Memory: ${result.memoryUsedMB.toFixed(1)}MB avg, ${result.memoryPeakMB.toFixed(1)}MB peak`);
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (!result.passed) {
      console.log(`   Issues: ${result.details}`);
    }
    
    return result;
  }

  async runSuite(
    scenarios: TestScenario[],
    state: GameState,
    updateFn: (dt: number, now: number) => void,
    drawFn: (now: number) => void
  ): Promise<TestResult[]> {
    console.log('🚀 Starting Performance Test Suite');
    console.log('=' . repeat(50));
    
    this.results = [];
    
    for (const scenario of scenarios) {
      await this.runTest(scenario, state, updateFn, drawFn);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.printSummary();
    return this.results;
  }

  private printSummary(): void {
    console.log('=' . repeat(50));
    console.log('📊 Performance Test Summary');
    console.log('=' . repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      for (const result of this.results.filter(r => !r.passed)) {
        console.log(`  - ${result.name}: ${result.details}`);
      }
    }
    
    // Performance summary table
    console.log('\nPerformance Metrics:');
    console.log('Test Name                    | Avg FPS | Min FPS | Max Update | Max Render | Memory Peak');
    console.log('-'.repeat(92));
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      console.log(
        `${status} ${result.name.padEnd(25)} | ` +
        `${result.avgFPS.toFixed(1).padStart(7)} | ` +
        `${result.minFPS.toFixed(1).padStart(7)} | ` +
        `${result.maxUpdateTime.toFixed(1).padStart(10)}ms | ` +
        `${result.maxRenderTime.toFixed(1).padStart(10)}ms | ` +
        `${result.memoryPeakMB.toFixed(1).padStart(10)}MB`
      );
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// Pre-defined test scenarios
export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Baseline Performance',
    duration: 5000,
    setup: (state) => {
      // Clean state with minimal objects
      state.bullets.length = 0;
      state.patties.length = 0;
      state.explosions.length = 0;
      state.impacts.length = 0;
      state.level = 1;
      state.gameOver = false;
      state.paused = false;
    }
  },
  
  {
    name: 'Normal Combat',
    duration: 10000,
    setup: (state) => {
      state.level = 5;
      state.gameOver = false;
      state.paused = false;
      // Spawn moderate enemies
      for (let i = 0; i < 20; i++) {
        state.patties.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h() * 0.5,
          vx: (Math.random() - 0.5) * 40,
          vy: 40 + Math.random() * 30,
          size: 40 + Math.random() * 20
        });
      }
    }
  },
  
  {
    name: 'Heavy Combat',
    duration: 10000,
    setup: (state) => {
      state.level = 10;
      state.gameOver = false;
      state.paused = false;
      // Maximum enemies
      for (let i = 0; i < 60; i++) {
        state.patties.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h() * 0.6,
          vx: (Math.random() - 0.5) * 60,
          vy: 50 + Math.random() * 40,
          size: 35 + Math.random() * 30
        });
      }
      // Many bullets
      for (let i = 0; i < 50; i++) {
        state.bullets.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h(),
          vy: -300 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 50,
          r: 5,
          kind: 'bubble'
        });
      }
    }
  },
  
  {
    name: 'Bullet Storm',
    duration: 8000,
    setup: (state) => {
      state.gameOver = false;
      state.paused = false;
      state.shotgunActive = true;
      state.shotgunTimer = 100; // Long duration for testing
    },
    update: (state, elapsed) => {
      // Continuously spawn bullets
      if (elapsed % 100 < 16) { // Every 100ms
        for (let i = 0; i < 5; i++) {
          state.bullets.push({
            x: state.player.x + (Math.random() - 0.5) * 100,
            y: state.player.y,
            vy: -400 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 200,
            r: 5,
            kind: 'bubble'
          });
        }
      }
      // Keep bullets array at max capacity
      if (state.bullets.length > 150) {
        state.bullets.splice(0, state.bullets.length - 150);
      }
    }
  },
  
  {
    name: 'Explosion Stress',
    duration: 8000,
    setup: (state) => {
      state.gameOver = false;
      state.paused = false;
      state.bazookaActive = true;
      state.bazookaTimer = 100; // Long duration
    },
    update: (state, elapsed) => {
      // Trigger explosions periodically
      if (elapsed % 200 < 16) { // Every 200ms
        const x = Math.random() * state.w();
        const y = Math.random() * state.h() * 0.7;
        state.explosions.push({
          x, y,
          life: 0,
          duration: 0.5
        });
        // Add some impacts too
        for (let i = 0; i < 5; i++) {
          state.impacts.push({
            x: x + (Math.random() - 0.5) * 100,
            y: y + (Math.random() - 0.5) * 100,
            life: 0,
            duration: 0.3
          });
        }
      }
      // Cap explosions
      if (state.explosions.length > 30) {
        state.explosions.splice(0, state.explosions.length - 30);
      }
    }
  },
  
  {
    name: 'Missile Trails',
    duration: 8000,
    setup: (state) => {
      state.gameOver = false;
      state.paused = false;
      state.bazookaActive = true;
      state.bazookaTimer = 100;
    },
    update: (state, elapsed) => {
      // Launch missiles continuously
      if (elapsed % 150 < 16) { // Every 150ms
        for (let i = 0; i < 3; i++) {
          state.bullets.push({
            x: state.player.x + (i - 1) * 30,
            y: state.player.y,
            vy: -260,
            vx: (i - 1) * 20,
            r: 6,
            kind: 'missile',
            trail: []
          });
        }
      }
    }
  },
  
  {
    name: 'Maximum Load',
    duration: 15000,
    setup: (state) => {
      state.level = 15;
      state.gameOver = false;
      state.paused = false;
      // Fill to capacity
      for (let i = 0; i < 80; i++) {
        state.patties.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h() * 0.7,
          vx: (Math.random() - 0.5) * 80,
          vy: 60 + Math.random() * 50,
          size: 30 + Math.random() * 35
        });
      }
      for (let i = 0; i < 100; i++) {
        const kind = ['bubble', 'missile', 'laser'][Math.floor(Math.random() * 3)] as any;
        state.bullets.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h(),
          vy: -300 - Math.random() * 300,
          vx: (Math.random() - 0.5) * 100,
          r: 6,
          kind,
          trail: kind === 'missile' ? [] : undefined
        });
      }
    },
    update: (state, elapsed) => {
      // Maintain maximum load
      while (state.patties.length < 80) {
        state.patties.push({
          x: Math.random() * state.w(),
          y: -50,
          vx: (Math.random() - 0.5) * 80,
          vy: 60 + Math.random() * 50,
          size: 30 + Math.random() * 35
        });
      }
      while (state.bullets.length < 100) {
        state.bullets.push({
          x: Math.random() * state.w(),
          y: state.h() + 50,
          vy: -400,
          vx: (Math.random() - 0.5) * 100,
          r: 5,
          kind: 'bubble'
        });
      }
      // Random explosions
      if (elapsed % 500 < 16 && state.explosions.length < 10) {
        state.explosions.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h(),
          life: 0,
          duration: 0.4
        });
      }
    }
  },
  
  {
    name: 'Memory Stability',
    duration: 30000, // 30 second test
    setup: (state) => {
      state.level = 8;
      state.gameOver = false;
      state.paused = false;
    },
    update: (state, elapsed) => {
      // Cycle through creating and destroying objects
      const cycle = elapsed % 2000; // 2 second cycles
      
      if (cycle < 1000) {
        // Growth phase
        if (state.patties.length < 60) {
          state.patties.push({
            x: Math.random() * state.w(),
            y: -50,
            vx: 0,
            vy: 70,
            size: 45
          });
        }
        if (state.bullets.length < 80) {
          state.bullets.push({
            x: Math.random() * state.w(),
            y: state.h(),
            vy: -350,
            vx: 0,
            r: 5,
            kind: 'bubble'
          });
        }
      } else {
        // Cleanup phase
        if (state.patties.length > 10) {
          state.patties.splice(0, 5);
        }
        if (state.bullets.length > 10) {
          state.bullets.splice(0, 5);
        }
      }
    }
  }
];

// Export a function to run all tests
export async function runFullPerformanceTestSuite(
  state: GameState,
  updateFn: (dt: number, now: number) => void,
  drawFn: (now: number) => void
): Promise<TestResult[]> {
  const runner = new PerformanceTestRunner();
  return runner.runSuite(TEST_SCENARIOS, state, updateFn, drawFn);
}

// Export function to run a quick smoke test
export async function runQuickPerformanceTest(
  state: GameState,
  updateFn: (dt: number, now: number) => void,
  drawFn: (now: number) => void
): Promise<TestResult> {
  const runner = new PerformanceTestRunner();
  const quickTest: TestScenario = {
    name: 'Quick Performance Check',
    duration: 3000,
    setup: (state) => {
      state.level = 5;
      state.gameOver = false;
      state.paused = false;
      // Moderate load
      for (let i = 0; i < 30; i++) {
        state.patties.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h() * 0.5,
          vx: 0,
          vy: 50,
          size: 45
        });
      }
      for (let i = 0; i < 40; i++) {
        state.bullets.push({
          x: Math.random() * state.w(),
          y: Math.random() * state.h(),
          vy: -300,
          vx: 0,
          r: 5,
          kind: 'bubble'
        });
      }
    }
  };
  
  return runner.runTest(quickTest, state, updateFn, drawFn);
}