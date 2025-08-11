## 0.1.1 - 2025-08-10

### Added
- Vertical movement (Up/Down/W/S and mobile drag).
- Diagonal movement normalization to prevent faster diagonals.
- Live debug logging (`?debug=1`) with control flags and position.
- Alternative fire keys (Shift/J/K/Enter) to mitigate Arrow+Space ghosting.
- Pause toggles on Esc or P.
- Basic key remapping (paused: press M to enter remap, 1=Left, 2=Right, 3=Up, 4=Down, 5=Fire, then press the new key). Config persists to localStorage.

### Changed
- Removed on-screen pads; mobile uses tap-and-drag.
- Canvas resize and player reflow are robust to viewport changes and rotation.
- Pause screen shows updated control tips.

### Tests
- E2E: diagonal movement, vertical movement (keyboard + drag), DPR/backing size, rotation.
- Unit: movement normalization and clamping.


