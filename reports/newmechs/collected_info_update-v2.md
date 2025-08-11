# Game Mechanics Updates - Complete Specification v2

## Level Health Gain
- Health should only be restored every 10 levels instead of every 1
- Restoration amount: 1 health point (same as current per-level amount)

## Level Progression
- The points needed to progress from level to level should be doubled from current baseline
- Exponential progression: Each subsequent level requires 1.2x the previous level's points
- A HUD/UI indicator should be added to indicate to the user their progress in the current level
  - Display format: Progress bar with fraction inside (e.g., "250/500")
- Level difficulty progression should happen 5% faster across all parameters (spawn rate, enemy speed, etc.)

## Weapon Changes

### Major Changes
- Upgraded weapons will now have a limited ammo stock rather than a time limit
- Only one power up should appear when the trigger event is reached
- Which upgrade is spawned should be random, with logic to ensure there is an even amount of spawns of each over every 100 spawns
  - This tracking resets with each game start (not persisted across sessions)
- Cooldowns still apply
  - Cooldown starts when the ammo runs out, preventing immediate pickup of another upgrade

### Weapon Specifications

#### Regular Gun
- The regular gun rate of fire should be faster if manually triggered rather than if the user manually holds the button down
  - Tap-firing gets a 100% bonus (2x fire rate)
  - Held fire stays at the current rate

#### Bazooka
- The missiles should have a 20% slower rate of fire
- Missiles should have double the area effect splash damage when they explode
- Missiles should slowly increase speed until reaching 3/4 of screen height in pixels, then maintain maximum speed
- Only 5 missiles per power up

#### Shotgun
- Bullets should have a slightly different color from the regular gun, closer to a silver/metallic look
- 5 rounds per load, with 10 reloads
  - Total of 55 shots (5 initial + 5×10 reloads)
  - Each reload takes 3 seconds
  - Reloading is automatic after every 5 shots
- Rate of fire should be half of what it is currently

#### Laser
- When a laser bullet ricochets, it should be cloned 3 times and the 3 clones should fire off in different directions approximately 33 degrees from each other (as measured from the center of the target)
  - The exact separation and directions should be randomized
  - Only original laser bullets can create clones, not the clones themselves
  - Laser bullets can only ricochet once before disappearing
- The clones each have the same effect on any target and the user
- Laser will have 1,000 "bullets"

## Enemies

### Crabby Patties (Burgers)
- The burgers should have 10% more variety in size, speed, and direction
- Burgers should bounce off each other and other enemies (lobsters, barrels) with a small amount of randomness to keep directions a little unpredictable
  - Burgers bounce off other burgers and enemies, but NOT the player
- Score value: 50 points per patty

### Atomic Lobsters (NEW)
- Every 3rd level (starting with the 3rd level) a random number of "atomic lobsters" should fly onto the screen from the left and right sides and then fall to the bottom in a similar speed and fashion as the burgers
  - Spawn count: 3-20 lobsters randomly, with weighted preference toward higher numbers as levels increase
- The lobsters should have mechanics similar to fighter jets with dual slow fire rate cannons in its pincers (1/3 of the rate of the user's standard weapon)
  - The cannon "bullets" should be noticeably larger than the user's bullets and look different as well
  - These bullets travel horizontally in a straight line
  - Note: there shouldn't be actual cannon graphics, the "bullets" should just come out of the pincers like the bullets come out of the user
- The lobsters should actively target the user
  - They fall continuously downward (can vary speed but never stop or go up, never faster than the user)
  - They actively move left/right to track the player position
  - Graphics flip when changing horizontal direction
- Health/damage thresholds:
  - 2 regular bullets to destroy
  - 1 shotgun blast to destroy
  - 1 missile to destroy
  - 4 laser hits to destroy
- Score value: 100 points per lobster (2x burger value)
- The lobsters should follow the same visual style as the rest of the game but be simplified, cartoon, red, 2D line art lobsters with a top down perspective (like how a lobster would look on the ground if you were standing over it)
- They should have some sort of "outfit" with the nuclear symbol on it

### Nuclear Waste Barrels (Special Level)
- Every 10 levels (starting on the 11th), the user should enter a special level
- Other enemies (burgers, lobsters) should not spawn during this level. Existing ones will go away as they normally would
- Once all the other enemies are gone from the screen, cartoonish nuclear waste barrels should start floating down with mechanics like the burgers
  - These should have a sort of gravity that gently attracts them to the user
  - Gravitational pull gets stronger as barrels get closer to the player and quickly fades to zero with distance
- The barrels do 2x damage compared to the patties
- When the barrels are killed by the user they have splash damage and can do 1x damage as the patties if they are shot too close to the user
  - Splash damage radius: 2x the player size
- Spawn a random amount of barrels between 10 and 50
- Disable the HUD item tracking the level progression so the total number of barrels are a secret to the user
- Make some sort of drastic animation to indicate to the user something big is about to happen before the barrels spawn
- Make celebration animation once the barrel level has been defeated before moving on to the next level
  - There should be a pause here and the user should have to click or take action to continue. This will serve as a natural break in the game
  - After completing the barrel level and continuing, players go directly to the next level (12, 22, 32, etc.)

## Assets
A large collection of Art/graphics, music, and sound effects are available in `/home/kwhatcher/projects/games/assets`

### Available Assets Summary (from exploration)
- Fish pack with underwater themed elements (bubbles, seaweed)
- Various impact and explosion sounds (sci-fi sounds, impact sounds)
- Laser sounds for weapons
- Metal impact sounds for barrel collisions
- Underwater ambience sound file (underwater-ambience-376890.mp3)
- Note: No existing lobster or barrel graphics found - these will need to be drawn programmatically to match the game's simple line-art style