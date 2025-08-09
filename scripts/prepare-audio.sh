#!/usr/bin/env bash
set -euo pipefail

# Usage:
# 1) Download one or more SFX packs (Kenney, Sonniss, Mixkit, etc.) into a folder, e.g. downloads/
# 2) Run: scripts/prepare-audio.sh downloads/
# 3) The script will search common names and copy into public/audio/* expected filenames

SRC_DIR="${1:-}"
if [[ -z "${SRC_DIR}" || ! -d "${SRC_DIR}" ]]; then
  echo "Usage: $0 <source-directory-with-audio-files>"
  echo "Place your downloaded packs (unzipped) under that directory."
  exit 1
fi

mkdir -p public/audio

copy_first_match() {
  local pattern="$1"; shift
  local dest="$1"; shift
  local found
  found=$(find "$SRC_DIR" -type f \( -iname "*.wav" -o -iname "*.ogg" -o -iname "*.mp3" \) -print | grep -iE "$pattern" | head -n 1 || true)
  if [[ -n "$found" ]]; then
    local ext
    ext=${found##*.}
    cp -f "$found" "public/audio/${dest}.${ext}"
    echo "✔ Copied $found -> public/audio/${dest}.${ext}"
  else
    echo "⚠ No match for pattern: $pattern"
  fi
}

# Prefer known Kenney names if present
copy_first_match '(laserSmall_0\d+\.ogg|laserSmall|laser_small|laser small|gunshot|gun shot|pew)' gun_basic_01
copy_first_match '(laserLarge_0\d+\.ogg|laserLarge|laser large|shotgun|boomstick|pump|12g|12-gauge|12 gauge)' shotgun_01
copy_first_match '(engineCircular_0\d+\.ogg|engineCircular|rocket|missile|whoosh|launch|swoosh)' missile_launch_01
copy_first_match '(lowFrequency_explosion_0\d+\.ogg|explosionCrunch_0\d+\.ogg|explosion|explode|blast|boom|detonation)' explosion_big_01
copy_first_match '(explosionCrunch_0\d+\.ogg|lowFrequency_explosion_0\d+\.ogg|small explosion|pop)' explosion_small_01
copy_first_match '(underwater|bubbles|bubble|water ambience|water loop|under water)' amb_bubbles_01

cat <<EOF

Done.
If any file was missing, place an appropriate SFX manually into public/audio with these names:
  - gun_basic_01.(wav|ogg|mp3)
  - shotgun_01.(wav|ogg|mp3)
  - missile_launch_01.(wav|ogg|mp3)
  - explosion_big_01.(wav|ogg|mp3)
  - explosion_small_01.(wav|ogg|mp3)
  - amb_bubbles_01.(wav|ogg|mp3)

Recommended sources:
- Kenney (CC0): https://kenney.nl/assets?q=audio
- OpenGameArt (CC0/CC-BY): https://opengameart.org/
- Sonniss GDC packs (free use): https://sonniss.com/gameaudiogdc
- Mixkit: https://mixkit.co/
- Pixabay Audio: https://pixabay.com/sound-effects/
- Freesound (CC0): https://freesound.org
EOF
