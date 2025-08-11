# Undersea Blaster - Feature Requirements Gathered

## Overview
This document consolidates all requirements for the upcoming feature updates to the Undersea Blaster game. The features focus on gameplay mechanics updates including level progression, weapon systems, new enemy types, and special levels.

## Core Mechanics Updates

### 1. Level System Overhaul

#### Health Restoration
- **Current**: Health restored every level
- **New**: Health restored every 10 levels only
- **Amount**: 1 health point per restoration

#### Level Progression
- **Points Required**: Double the current baseline requirement
- **Scaling**: Exponential growth with 1.2x multiplier per level
- **Difficulty**: All difficulty parameters increase 5% faster (spawn rate, enemy speed, etc.)

#### UI Enhancement
- **New HUD Element**: Level progress indicator
- **Format**: Progress bar with fraction display (e.g., "250/500")
- **Location**: To be determined based on UI layout

### 2. Weapon System Redesign

#### Core Changes
- **Ammo System**: Replace time-based duration with ammo count
- **Spawning**: Only one power-up appears per trigger event
- **Distribution**: Random selection with enforced even distribution over 100 spawns
- **Cooldowns**: Applied after ammo depletion (prevents immediate re-pickup)
- **Session Tracking**: Distribution tracking resets on game restart

#### Weapon Specifications

##### Regular Gun
- **Fire Rate Enhancement**: Tap-firing receives 100% bonus (2x speed)
- **Hold Fire**: Maintains current rate

##### Bazooka
- **Fire Rate**: 20% slower than current
- **Splash Damage**: Doubled area effect
- **Speed**: Accelerates until 3/4 screen height, then maintains max speed
- **Ammo**: 5 missiles per pickup

##### Shotgun
- **Visual**: Silver/metallic bullet color
- **Magazine**: 5 rounds with 10 reloads (55 total shots)
- **Reload**: Automatic after 5 shots, 3-second duration
- **Fire Rate**: 50% of current rate

##### Laser
- **Ricochet Mechanic**: Creates 3 clones on ricochet
- **Clone Direction**: ~33° separation (randomized)
- **Limitations**: Only original bullets create clones, single ricochet limit
- **Ammo**: 1,000 bullets

### 3. Enemy System Updates

#### Crabby Patties (Existing Enemy)
- **Variety**: 10% more variation in size, speed, direction
- **Physics**: Bounce off other enemies with randomization
- **Collision**: Bounces off enemies/lobsters/barrels, NOT player
- **Score**: 50 points

#### Atomic Lobsters (NEW)
- **Spawn Schedule**: Every 3rd level (starting level 3)
- **Count**: 3-20 randomly, weighted toward higher counts at higher levels
- **Movement**: 
  - Entry from left/right screen edges
  - Continuous downward fall (variable speed, never faster than player)
  - Active horizontal tracking of player position
  - Graphics flip on direction change
- **Combat**:
  - Dual pincer cannons (1/3 player fire rate)
  - Larger, distinct horizontal bullets
  - 2 regular bullets to destroy
  - 1 shotgun/missile hit to destroy
  - 4 laser hits to destroy
- **Visual**: Simple red 2D line art, top-down perspective, nuclear symbol outfit
- **Score**: 100 points

#### Nuclear Waste Barrels (Special Level)
- **Schedule**: Every 10 levels (starting level 11)
- **Exclusivity**: No other enemies spawn during barrel level
- **Count**: Random 10-50 barrels
- **Physics**: 
  - Burger-like floating mechanics
  - Gravitational pull toward player (stronger when closer)
- **Damage**: 
  - 2x contact damage vs patties
  - 1x splash damage within 2x player size radius
- **Special Features**:
  - Level progress HUD disabled (secret count)
  - Dramatic pre-spawn animation
  - Celebration animation on completion
  - Pause with action required to continue
  - Direct progression to next level (12, 22, 32, etc.)

## Asset Integration

### Available Assets
- **Location**: `/home/kwhatcher/projects/games/assets`
- **Key Resources**:
  - Fish pack with underwater elements (bubbles, seaweed)
  - Impact and explosion sounds
  - Laser weapon sounds
  - Metal impact sounds for barrels
  - Underwater ambience audio (underwater-ambience-376890.mp3)

### Asset Requirements
- **Lobster Graphics**: Must be drawn programmatically (no existing assets)
- **Barrel Graphics**: Must be drawn programmatically (no existing assets)
- **Style**: Match existing simple line-art aesthetic

## Technical Considerations

### Performance
- Enemy collision detection between multiple enemy types
- Gravitational calculations for barrels
- Clone bullet tracking for laser weapon
- Ammo tracking system implementation

### UI/UX
- Level progress bar integration
- Ammo counter display for weapons
- Special level transition animations
- Pause/continue mechanics for barrel level completion

### Balance
- Exponential level progression curve testing
- Weapon ammo counts may need adjustment
- Enemy spawn rates and difficulty scaling
- Score values for maintaining game economy

## Implementation Priority

1. **High Priority**:
   - Level progression and health restoration changes
   - Basic weapon ammo system
   - Level progress HUD indicator

2. **Medium Priority**:
   - New enemy types (lobsters, barrels)
   - Special barrel levels
   - Weapon-specific mechanics (laser clones, shotgun reload)

3. **Lower Priority**:
   - Enemy collision bouncing
   - Gravitational pull for barrels
   - Celebration animations

## Testing Requirements

- Verify exponential level progression feels balanced
- Test weapon ammo counts for appropriate difficulty
- Ensure enemy collision physics work correctly
- Validate special level transitions and pause mechanics
- Performance testing with multiple enemies and clone bullets
- Cross-platform testing (desktop, mobile, PWA)

## Acceptance Criteria

- All weapon systems converted to ammo-based mechanics
- Level progression follows exponential curve with progress indicator
- Atomic lobsters spawn and behave as specified
- Nuclear barrel special levels trigger correctly
- All animations and visual feedback implemented
- Performance remains smooth on target platforms
- Game balance maintains appropriate difficulty curve