# Comprehensive Requirements Document - Undersea Blaster Major Updates
**Compiled by**: Grace Davis  
**Date**: 2025-08-11  
**Purpose**: Complete requirements baseline for multi-stage planning process

## Executive Summary
This document consolidates all requirements, clarifications, and specifications for transforming Undersea Blaster from arcade action to strategic resource management gameplay. This serves as the authoritative source for all planning agents.

## Process Overview

### Stage Structure
1. **Stage 1**: 9 agents review current code and proposed changes (parallel execution)
2. **Stage 2**: 3 technical architecture/development specialists review Stage 1 outputs (27 reports total)
3. **Stage 3**: Final report compilation with proofreading by docs-arch agent
4. **Stage 4**: 4 developer agents create implementation plans
5. **Stage 5**: Final itemized plan with parallel work streams

### Key Constraints
- NO CODE WRITING during planning stages
- All agents must generate unique names via random-name MCP
- Reports saved to `/reports/newmechs/` with author name in filename
- Maintain performance across browser, desktop, and mobile
- Create user stories suitable for GitHub issues
- Focus on parallel development opportunities

## Core Game Changes

### 1. Level System Overhaul

#### Health Restoration
- **Change**: From every level → Every 10 levels only
- **Amount**: 1 health point per restoration
- **Levels**: 10, 20, 30, 40, etc.

#### Level Progression
- **Base Points**: Double current baseline requirement
- **Scaling Formula**: Each level = Previous × 1.2 (exponential)
- **Application**: ALL difficulty parameters scale with 1.2x multiplier:
  - Points required to advance
  - Enemy spawn rates
  - Enemy movement speed
  - All other difficulty metrics
- **Difficulty Boost**: Additional 5% faster progression on all parameters

#### UI Enhancement
- **New Element**: Level progress indicator
- **Format**: Progress bar with fraction display
- **Example**: "250/500" showing current/required points
- **Location**: TBD based on UI analysis

### 2. Weapon System Redesign

#### Core Mechanics Changes
- **From**: Time-based duration → **To**: Ammo-based system
- **Spawning**: Only ONE power-up appears per trigger (not multiple)
- **Distribution**: Weighted random system adjusting probabilities
  - Target: Even distribution over 100 spawns
  - Tracking resets on game restart (not persisted)
- **Cooldowns**: Still apply, start when ammo depletes
  - Prevents immediate re-pickup of another upgrade

#### Weapon Specifications

##### Regular Gun (Base Weapon)
- **Ammo**: Unlimited
- **Fire Rate Enhancement**:
  - Tap-firing: 100% bonus (2x speed)
  - Hold-fire: Current rate (no change)

##### Bazooka
- **Ammo**: 5 missiles total
- **Fire Rate**: 20% slower than current
- **Damage**: Double area effect splash damage
- **Speed Mechanics**: Accelerates until 3/4 screen height, then constant
- **Splash Radius**: Affects enemies within defined radius

##### Shotgun
- **Ammo**: 55 total shots
  - 5 rounds per magazine
  - 10 reloads available
  - Formula: 5 initial + (5 × 10 reloads) = 55
- **Reload**: Automatic after 5 shots, 3-second duration
- **Fire Rate**: 50% of current rate
- **Visual**: Silver/metallic bullet color (distinct from regular)
- **Spread**: 3-pellet pattern

##### Laser
- **Ammo**: 1,000 bullets
- **Ricochet Mechanics**:
  - Creates 3 clones on ricochet
  - Clone separation: ~33° (randomized)
  - Clones have SAME damage as original
  - Clones DON'T count against ammo limit
  - Clones CANNOT ricochet again
  - Only original bullets can create clones
  - Single ricochet limit per bullet
- **Fire Rate**: Rapid fire capability

### 3. Enemy System Updates

#### Crabby Patties (Existing Enemy - Enhanced)
- **Variety**: 10% more variation in:
  - Size
  - Speed  
  - Movement direction
- **Physics**: Bounce off other enemies with randomization
  - Bounces off: Other patties, lobsters, barrels
  - Does NOT bounce off: Player
  - Small randomness to prevent predictable patterns
- **Score**: 50 points per patty

#### Atomic Lobsters (NEW ENEMY)
- **Spawn Schedule**: Every 3rd level (3, 6, 9, 12, etc.)
- **Count**: 3-20 randomly
  - Weighted toward higher counts at higher levels
- **Entry**: From left/right screen edges
- **Movement**:
  - Continuous downward fall
  - Variable speed (never stops/reverses)
  - Never faster than player
  - Active horizontal tracking with acceleration/deceleration
  - Max horizontal speed LESS than player (player can escape)
  - Graphics flip when changing direction
- **Combat System**:
  - Dual pincer cannons
  - Fire rate: 1/3 of player's standard weapon
  - Bullets: Larger, visually distinct, horizontal trajectory
  - No cannon graphics (bullets emerge from pincers)
- **Health/Damage**:
  - 2 regular bullets to destroy
  - 1 shotgun blast to destroy
  - 1 missile to destroy
  - 4 laser hits to destroy
- **Visual Style**:
  - Simple red 2D line art
  - Top-down perspective
  - Nuclear symbol on outfit
  - Pre-rendered sprites
  - Match existing game art style
- **Score**: 100 points (2x patty value)

#### Nuclear Waste Barrels (SPECIAL LEVEL ENEMY)
- **Schedule**: Every 10 levels starting at 11 (11, 21, 31, etc.)
- **Level Type**: Special challenge level
- **Exclusivity**: No other enemies spawn during barrel level
  - Existing enemies clear naturally
  - Barrels spawn after screen clears
- **Count**: Random 10-50 barrels
- **Physics**:
  - Base: Float down like burgers
  - Gravitational pull toward player
  - Gravity model: Inverse square law (stronger when closer)
  - Pull fades quickly with distance
- **Damage System**:
  - Contact damage: 2x patty damage
  - Splash damage on destruction: 1x patty damage
  - Splash radius: 2x player size
- **Special Features**:
  - Level progress HUD DISABLED (secret count)
  - Dramatic pre-spawn animation warning
  - Celebration animation on completion
  - PAUSE with action required to continue
  - Natural break point in gameplay
  - Direct progression to next level (12, 22, 32)
- **Visual Style**:
  - Cartoonish nuclear waste barrel design
  - Pre-rendered sprites
  - Match existing game art style

### 4. Visual and Audio Assets

#### Available Assets Location
`/home/kwhatcher/projects/games/assets/`

#### Relevant Existing Assets
- **Underwater Elements**: Fish pack with bubbles, seaweed
- **Sound Effects**:
  - Impact and explosion sounds (sci-fi sounds, impact sounds)
  - Laser weapon sounds
  - Metal impact sounds (for barrels)
  - Underwater ambience (underwater-ambience-376890.mp3)

#### Assets to Create
- **Atomic Lobster**: Pre-rendered sprites matching line art style
- **Nuclear Barrel**: Pre-rendered sprites matching line art style
- **Style Guide**: Simple 2D line art, consistent with existing game

### 5. Performance Requirements

#### Core Targets
- **Frame Rate**: Maintain 60 FPS
- **Platforms**: Browser, Desktop, Mobile (browser-based)
- **Scaling**: Automatic quality adjustment based on device performance

#### Performance Considerations
- Enemy-to-enemy collision detection
- Gravitational calculations for barrels
- Laser clone bullet tracking
- Multiple concurrent enemy types
- Particle effects and explosions
- Mobile touch input handling

#### Optimization Strategy
- Automatic quality scaling system
- Device performance detection
- Dynamic entity limits
- Efficient collision detection algorithms
- Object pooling for bullets/enemies

### 6. Technical Architecture Considerations

#### Current Stack
- **Language**: TypeScript
- **Build Tool**: Vite
- **Main Loop**: src/main.ts
- **State Management**: src/game/state.ts
- **Systems**: Modular systems in src/game/systems/

#### Key Systems to Modify/Add
- Collision system (enemy-enemy bouncing)
- Weapon/ammo management system
- AI system for lobster tracking
- Physics system for barrel gravity
- Level progression system
- UI/HUD system for progress bars
- Performance scaling system

### 7. User Experience Goals

#### Player Progression
- **Session Length**: Target 10-15 minutes median
- **Difficulty Curve**: Smooth exponential increase
- **Strategic Depth**: Resource management via ammo system
- **Break Points**: Natural pauses at barrel levels

#### Gameplay Balance
- **Weapon Variety**: Each weapon has distinct use case
- **Enemy Challenge**: Progressive difficulty with elite enemies
- **Risk/Reward**: Health management over 10-level spans
- **Player Agency**: Can escape lobsters, manage ammo

### 8. Implementation Priorities

#### High Priority
- Level progression and health restoration changes
- Basic weapon ammo system conversion
- Level progress HUD indicator
- Core enemy mechanics (no physics yet)

#### Medium Priority
- New enemy types (lobsters, barrels)
- Special barrel levels with transitions
- Weapon-specific mechanics (laser clones, shotgun reload)
- Enemy collision bouncing

#### Lower Priority
- Gravitational pull for barrels
- Celebration animations
- Advanced particle effects
- Audio integration

### 9. Testing Requirements

#### Functional Testing
- Exponential progression feels balanced
- Weapon ammo counts appropriate
- Enemy spawn schedules correct
- Special level triggers work

#### Performance Testing
- 60 FPS maintained with max entities
- Mobile performance acceptable
- Memory usage stable
- No memory leaks

#### Cross-Platform Testing
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)
- PWA functionality
- Touch controls responsive

### 10. Success Criteria

#### Technical Success
- All features implemented without breaking existing functionality
- Performance targets met across platforms
- Code maintainable and well-structured
- Parallel development paths utilized

#### Gameplay Success
- Difficulty curve engaging but fair
- Weapon balance encourages variety
- Special levels provide excitement
- Player retention improved

#### Process Success
- User stories clearly defined
- Parallel work streams identified
- Dependencies mapped
- Testing strategy comprehensive

## Stage 1 Agent Focus Areas

### Agent 1: UI/UX Changes
- Level progress bar design and placement
- Ammo counter displays for weapons
- Special level transition screens
- Mobile touch control adaptations
- HUD layout optimization

### Agent 2: Game Mechanics Implementation
- Weapon ammo system conversion
- Enemy behavior patterns
- Collision and physics systems
- Level progression mathematics
- Score and point systems

### Agent 3: Performance Optimization
- Entity management strategies
- Collision detection efficiency
- Rendering optimization
- Memory management
- Quality scaling system design

### Agent 4: Security Considerations
- Score validation
- Anti-cheat mechanisms
- Input validation
- State integrity
- Client-side security

### Agent 5: Data Structures
- Game state organization
- Entity management structures
- Weapon/ammo tracking
- Level progression data
- Performance metrics storage

### Agent 6: Mobile Compatibility
- Touch input handling
- Screen size adaptations
- Performance on mobile devices
- PWA considerations
- Battery usage optimization

### Agent 7: Testing Strategies
- Unit test requirements
- Integration testing approach
- Performance testing methods
- Cross-platform testing
- Balance testing procedures

### Agent 8: Deployment Considerations
- Build process updates
- Asset optimization
- Version management
- Rollback procedures
- Progressive deployment

### Agent 9: Game Balance
- Difficulty curve analysis
- Weapon effectiveness metrics
- Enemy challenge ratings
- Progression pacing
- Player skill accommodation

## Stage 2 Specializations
Three technical architecture and development specialists will review all Stage 1 outputs, creating 9 reports each (27 total).

## Stage 3 Compilation
Final report consolidation with proofreading and refinement.

## Stage 4 Development Plans
Four developer agents create detailed implementation plans from final report.

## Stage 5 Final Plan
Creation of itemized, parallel-executable development plan with user stories.

## Document Control
- **Version**: 1.0
- **Author**: Grace Davis
- **Date**: 2025-08-11
- **Status**: COMPLETE - Ready for Stage 1 execution

---
*This document serves as the complete requirements baseline. Any clarifications or changes should be documented as amendments to maintain consistency across all planning stages.*