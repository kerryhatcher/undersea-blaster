# Performance Test Plan - Undersea Blaster

## Executive Summary
This comprehensive performance test plan ensures the shared game core maintains optimal performance across web and desktop platforms, targeting 60 FPS with minimal memory overhead and responsive gameplay under maximum load conditions.

## Performance Requirements

### Core Benchmarks
- **Frame Rate**: Maintain 60 FPS (16.67ms frame budget)
- **Update Loop**: Complete in <10ms under maximum load
- **Render Loop**: Complete in <6ms for drawing operations
- **Memory Usage**: Stay under 100MB during 10-minute sessions
- **Input Latency**: <16ms response to user input
- **Audio Sync**: <8ms delay between event and sound

## 1. Frame Rate Testing

### 1.1 Baseline FPS Measurements
**Tools**: Chrome DevTools Performance Monitor, Firefox Performance Profiler

**Test Scenarios**:
- **Idle State**: Game paused, measure baseline render cost
  - Target: 60 FPS with <5% CPU usage
  - Memory: <20MB baseline allocation
  
- **Normal Gameplay**: Level 1-3, standard enemy density
  - Target: Stable 60 FPS
  - Enemies: 5-15 on screen
  - Bullets: 10-30 active
  
- **Intense Gameplay**: Level 10+, high enemy density
  - Target: Maintain 55+ FPS minimum
  - Enemies: 30-50 on screen
  - Bullets: 40-60 active

**Measurement Strategy**:
```javascript
// Performance measurement wrapper
const perfMonitor = {
  frameCount: 0,
  lastTime: performance.now(),
  fps: 0,
  frameTimes: [],
  
  measure() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.frameTimes.push(delta);
    
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
      this.fps = 1000 / (this.frameTimes.reduce((a,b) => a+b) / this.frameTimes.length);
    }
    
    this.lastTime = now;
    return this.fps;
  }
};
```

### 1.2 FPS Under Load
**Stress Test Conditions**:
- 80 enemies simultaneously on screen
- 100 bullets active
- 5 simultaneous explosions
- 3 upgrade pickups visible
- All weapon types cycling

**Platform-Specific Targets**:
- **Desktop (Electron)**: 60 FPS sustained
- **Chrome/Edge**: 58+ FPS sustained
- **Firefox**: 56+ FPS sustained
- **Safari**: 54+ FPS sustained
- **Mobile Chrome**: 45+ FPS sustained
- **Mobile Safari**: 45+ FPS sustained

### 1.3 Visual Effects Impact
**Test Each Effect Isolation**:
- Background bubbles animation
  - Cost: <0.5ms per frame
  - 30 bubbles maximum
  
- Missile trails (per missile)
  - Cost: <0.2ms per trail
  - 30 segments maximum per trail
  
- Explosions (per explosion)
  - Cost: <0.8ms during peak animation
  - Flash + 9 puff clouds + shockwave ring
  
- Impact effects
  - Cost: <0.1ms per impact
  - 64 maximum simultaneous

## 2. Memory Profiling

### 2.1 Memory Leak Detection
**Tools**: Chrome Memory Profiler, Heap Snapshots

**Test Protocol**:
1. Take initial heap snapshot at game start
2. Play for 5 minutes at high intensity
3. Take second snapshot
4. Play for another 5 minutes
5. Take third snapshot
6. Compare heap growth

**Acceptable Thresholds**:
- Heap growth: <5MB per 5-minute session
- Detached DOM nodes: 0
- Event listeners: Stable count
- Array growth: Capped by limits (bullets: 160, patties: 80)

### 2.2 Object Pooling Analysis
**Current Pooling Limits**:
```javascript
// Verify these limits are enforced
MAX_BULLETS = 160
MAX_ENEMIES = 80
MAX_TRAIL_SEGMENTS = 30
MAX_EXPLOSIONS = 32
MAX_IMPACTS = 64
```

**Memory Allocation Patterns**:
- Measure GC frequency (target: <1 major GC per minute)
- Track allocation rate for game objects
- Monitor array resizing operations

### 2.3 Asset Memory Usage
**Image Assets**:
- Player sprite: ~5KB
- Enemy sprite: ~4KB
- Canvas buffer: Width × Height × 4 bytes

**Audio Buffers**:
- Gunshot: ~10KB
- Explosion: ~30KB
- Missile: ~15KB
- Ambience: ~200KB (streaming)

**Total Memory Budget**:
- Assets: <5MB
- Game state: <10MB
- Canvas/rendering: <20MB
- Audio: <5MB
- **Total Target**: <50MB steady state

### 2.4 Garbage Collection Impact
**Measurement Points**:
- GC pause duration (target: <5ms)
- GC frequency during gameplay
- Memory pressure indicators

## 3. Rendering Performance

### 3.1 Canvas Draw Call Optimization
**Current Draw Operations Per Frame**:
1. Background gradient (1 call)
2. Background bubbles (30 arcs + fills)
3. Enemies (up to 80 drawImage calls)
4. Player (1 drawImage + damage overlay)
5. Bullets (up to 160 draw operations)
6. Explosions (up to 32 complex draws)
7. Impacts (up to 64 simple draws)
8. HUD elements (~20 draw calls)
9. Overlays (conditional)

**Optimization Opportunities**:
- Batch similar draw operations
- Use off-screen canvas for static elements
- Implement dirty rectangle optimization
- Consider WebGL renderer for >200 objects

### 3.2 Batch Rendering Analysis
**Potential Batching**:
```javascript
// Batch all circle bullets into single path
ctx.beginPath();
for (const bullet of bullets.filter(b => b.kind === 'bubble')) {
  ctx.moveTo(bullet.x + bullet.r, bullet.y);
  ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
}
ctx.fillStyle = '#b3ecff';
ctx.fill();
```

### 3.3 Off-screen Rendering Detection
**Culling Strategy**:
```javascript
function isVisible(x, y, radius, canvasWidth, canvasHeight) {
  const buffer = radius + 10;
  return x > -buffer && x < canvasWidth + buffer &&
         y > -buffer && y < canvasHeight + buffer;
}
```

**Expected Savings**:
- 10-20% reduction in draw calls
- Especially effective for bullets/enemies off-screen

### 3.4 Animation Frame Timing
**Frame Budget Breakdown**:
```
Total: 16.67ms (60 FPS)
├── Input Processing: 0.5ms
├── Game Update: 8ms
│   ├── Physics: 2ms
│   ├── Collisions: 3ms
│   ├── State Updates: 2ms
│   └── Audio Triggers: 1ms
├── Rendering: 6ms
│   ├── Clear/Background: 0.5ms
│   ├── Game Objects: 4ms
│   ├── Effects: 1ms
│   └── HUD: 0.5ms
└── Buffer: 2.17ms (for GC/system)
```

## 4. Computational Bottlenecks

### 4.1 Collision Detection Performance
**Current Algorithm**: O(n×m) for bullets vs enemies

**Test Scenarios**:
- 100 bullets × 80 enemies = 8,000 checks/frame
- Target: <3ms for all collision checks

**Optimization Strategies**:
1. Spatial partitioning (quadtree/grid)
2. Broad-phase collision detection
3. Early exit optimizations

**Benchmark Code**:
```javascript
function benchmarkCollisions() {
  const start = performance.now();
  
  // Simulate worst-case collision checking
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 80; j++) {
      circlesOverlap(
        Math.random() * 800, Math.random() * 600, 10,
        Math.random() * 800, Math.random() * 600, 20
      );
    }
  }
  
  const elapsed = performance.now() - start;
  console.log(`Collision check time: ${elapsed.toFixed(2)}ms`);
  return elapsed < 3; // Pass if under 3ms
}
```

### 4.2 Update Loop Performance
**Component Timing Targets**:
- Player input: <0.2ms
- Bullet updates: <1ms for 100 bullets
- Enemy updates: <1ms for 80 enemies
- Upgrade logic: <0.5ms
- Weapon timers: <0.2ms
- Trail decay: <0.5ms per 10 missiles

### 4.3 Physics Calculations
**Movement Updates**:
```javascript
// Current: position += velocity * deltaTime
// Cost per object: ~0.01ms
// 180 objects total: ~1.8ms
```

**Trail System Performance**:
- Segment creation: 0.02ms per missile
- Segment decay: 0.01ms per segment
- Array filtering: 0.1ms per trail

### 4.4 Particle System Overhead
**Explosion Particles**:
- 9 puff clouds per explosion
- 3 radial gradient fills per cloud
- 1 shockwave ring with gradient
- Total: ~0.8ms per explosion

**Optimization Potential**:
- Pre-render explosions to sprite sheet
- Use CSS animations for non-critical effects
- Implement particle pooling

## 5. Load Testing Scenarios

### 5.1 Maximum Bullets Test
**Scenario**: "Bullet Hell Mode"
- Spawn 150 bullets simultaneously
- Mix of all bullet types (bubble, missile, laser)
- Measure frame drop and recovery

**Success Criteria**:
- FPS stays above 45
- No visible stuttering
- Memory remains stable

### 5.2 Maximum Enemies Test  
**Scenario**: "Swarm Attack"
- Spawn 80 enemies in waves
- Varying sizes and speeds
- Full collision detection active

**Success Criteria**:
- Maintain 50+ FPS
- Collision detection <4ms
- Smooth enemy movement

### 5.3 Explosion Chain Reaction
**Scenario**: "Demolition Derby"
- Trigger 10 simultaneous explosions
- Each with full visual effects
- Measure rendering impact

**Success Criteria**:
- FPS drop <20% during peak
- Recovery to 60 FPS within 1 second
- No memory spikes >10MB

### 5.4 Rapid Weapon Switching
**Scenario**: "Arsenal Rotation"
- Switch weapons every 2 seconds
- Fire continuously
- Spawn maximum upgrades

**Success Criteria**:
- Smooth transitions
- No input lag
- Audio remains synchronized

### 5.5 Extended Play Session
**Scenario**: "Marathon Mode"
- 30-minute continuous gameplay
- Monitor performance degradation
- Track memory growth

**Success Criteria**:
- FPS remains stable (±5%)
- Memory growth <20MB total
- No accumulating lag

## 6. Profiling Tools & Measurement

### 6.1 Browser DevTools
**Chrome Performance Panel**:
- Record 10-second gameplay segments
- Analyze frame timing
- Identify long tasks (>50ms)
- Review paint/composite timing

**Firefox Profiler**:
- Capture flame graphs
- Monitor GC activity
- Track DOM mutations
- Analyze network activity

### 6.2 Custom Performance Monitor
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: [],
      updateTime: [],
      renderTime: [],
      memoryUsage: [],
      objectCounts: {}
    };
  }
  
  startFrame() {
    this.frameStart = performance.now();
  }
  
  endUpdate() {
    this.updateEnd = performance.now();
    this.metrics.updateTime.push(this.updateEnd - this.frameStart);
  }
  
  endRender() {
    const renderEnd = performance.now();
    this.metrics.renderTime.push(renderEnd - this.updateEnd);
    this.metrics.fps.push(1000 / (renderEnd - this.frameStart));
  }
  
  recordMemory() {
    if (performance.memory) {
      this.metrics.memoryUsage.push(performance.memory.usedJSHeapSize);
    }
  }
  
  recordObjects(state) {
    this.metrics.objectCounts = {
      bullets: state.bullets.length,
      enemies: state.patties.length,
      explosions: state.explosions.length,
      impacts: state.impacts.length
    };
  }
  
  getReport() {
    const avg = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
    const max = arr => Math.max(...arr);
    const percentile = (arr, p) => {
      const sorted = [...arr].sort((a,b) => a-b);
      return sorted[Math.floor(sorted.length * p)];
    };
    
    return {
      avgFPS: avg(this.metrics.fps),
      minFPS: Math.min(...this.metrics.fps),
      p95FPS: percentile(this.metrics.fps, 0.05), // 95th percentile (worst 5%)
      avgUpdate: avg(this.metrics.updateTime),
      maxUpdate: max(this.metrics.updateTime),
      avgRender: avg(this.metrics.renderTime),
      maxRender: max(this.metrics.renderTime),
      memoryMB: (avg(this.metrics.memoryUsage) / 1048576).toFixed(2),
      objectCounts: this.metrics.objectCounts
    };
  }
}
```

### 6.3 Automated Test Runner
```javascript
class PerformanceTestRunner {
  async runTest(testName, duration, setup) {
    console.log(`Starting test: ${testName}`);
    const monitor = new PerformanceMonitor();
    
    // Setup test conditions
    await setup();
    
    // Run for specified duration
    const startTime = performance.now();
    while (performance.now() - startTime < duration) {
      monitor.startFrame();
      update(0.016); // Fixed timestep for consistency
      monitor.endUpdate();
      draw();
      monitor.endRender();
      monitor.recordMemory();
      monitor.recordObjects(state);
      
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    const report = monitor.getReport();
    console.log(`Test ${testName} complete:`, report);
    return report;
  }
  
  async runSuite() {
    const results = {};
    
    // Test 1: Baseline
    results.baseline = await this.runTest('Baseline', 5000, async () => {
      hardReset(state);
    });
    
    // Test 2: Heavy Combat
    results.heavyCombat = await this.runTest('Heavy Combat', 5000, async () => {
      hardReset(state);
      // Spawn many enemies and bullets
      for (let i = 0; i < 50; i++) {
        state.patties.push({x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 50, size: 50});
      }
      for (let i = 0; i < 80; i++) {
        state.bullets.push({x: Math.random() * 800, y: Math.random() * 600, vy: -300, vx: 0, r: 5, kind: 'bubble'});
      }
    });
    
    // Test 3: Explosion Stress
    results.explosions = await this.runTest('Explosions', 5000, async () => {
      hardReset(state);
      // Trigger multiple explosions
      setInterval(() => {
        if (state.explosions.length < 8) {
          state.explosions.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            life: 0,
            duration: 0.5
          });
        }
      }, 200);
    });
    
    return results;
  }
}
```

## 7. Performance Regression Testing

### 7.1 Continuous Integration Tests
```yaml
# .github/workflows/performance.yml
performance-tests:
  - name: FPS Baseline
    threshold: 58
    duration: 10000
    
  - name: Memory Stability
    maxGrowth: 10MB
    duration: 60000
    
  - name: Load Test
    minFPS: 45
    enemies: 80
    bullets: 100
    
  - name: Render Budget
    maxRenderTime: 6ms
    maxUpdateTime: 10ms
```

### 7.2 Performance Budget Enforcement
```javascript
const PERFORMANCE_BUDGET = {
  fps: {
    min: 55,
    target: 60,
    critical: 45
  },
  frameTime: {
    max: 18,      // ms
    target: 16.67,
    critical: 22
  },
  memory: {
    max: 100,     // MB
    target: 50,
    critical: 150
  },
  updateLoop: {
    max: 10,      // ms
    target: 8,
    critical: 15
  },
  renderLoop: {
    max: 7,       // ms  
    target: 6,
    critical: 10
  }
};
```

## 8. Platform-Specific Testing

### 8.1 Desktop (Electron)
- Test with DevTools disabled (production mode)
- Monitor Chromium process memory
- Test auto-updater impact
- Verify GPU acceleration

### 8.2 Web Browsers
**Chrome/Edge**:
- Enable Performance Observer API
- Test with different hardware acceleration settings
- Monitor V8 heap statistics

**Firefox**:
- Use SpiderMonkey profiler
- Test with WebRender enabled/disabled
- Monitor cycle collection

**Safari**:
- Test with Web Inspector timeline
- Monitor JavaScriptCore memory
- Verify canvas acceleration

### 8.3 Mobile Devices
**Testing Matrix**:
- Low-end: 2GB RAM, older GPU
- Mid-range: 4GB RAM, recent GPU  
- High-end: 8GB+ RAM, flagship GPU

**Touch-specific Tests**:
- Multi-touch performance
- Drag control responsiveness
- Virtual pad input latency

## 9. Optimization Recommendations

### 9.1 Immediate Optimizations
1. **Object Pooling**: Implement for bullets and particles
2. **Dirty Rectangle**: Only redraw changed screen regions
3. **Spatial Indexing**: Grid-based collision detection
4. **Batch Rendering**: Group similar draw operations

### 9.2 Medium-term Improvements
1. **WebGL Renderer**: For >200 objects on screen
2. **Web Workers**: Offload physics calculations
3. **Texture Atlas**: Combine sprites into single image
4. **LOD System**: Reduce detail for distant objects

### 9.3 Long-term Enhancements
1. **WASM Module**: Critical path optimization
2. **GPU Particles**: Compute shader effects
3. **Predictive Loading**: Pre-calculate trajectories
4. **Adaptive Quality**: Auto-adjust based on performance

## 10. Success Metrics

### Core Metrics (Must Pass)
- ✅ 60 FPS during normal gameplay (levels 1-5)
- ✅ 50+ FPS under maximum load
- ✅ <100MB memory after 10 minutes
- ✅ <10ms update loop completion
- ✅ <7ms render loop completion
- ✅ <20ms input latency

### Stretch Goals
- 🎯 60 FPS sustained with 100 enemies
- 🎯 <50MB steady-state memory
- 🎯 <5ms update loop
- 🎯 Zero frame drops during explosions
- 🎯 30+ minute sessions without degradation

## Implementation Schedule

**Phase 1 (Week 1)**: Baseline measurements and monitoring setup
**Phase 2 (Week 2)**: Load testing and bottleneck identification  
**Phase 3 (Week 3)**: Optimization implementation
**Phase 4 (Week 4)**: Regression testing and CI integration

## Monitoring Dashboard

Create real-time dashboard showing:
- Current FPS (line graph)
- Frame time histogram
- Memory usage over time
- Object count indicators
- GC frequency meter
- CPU usage percentage
- GPU usage (if available)

---

This performance test plan ensures the Undersea Blaster game maintains optimal performance across all platforms while providing specific, measurable targets for continuous improvement.