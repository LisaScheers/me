#!/run/current-system/sw/bin/nix-shell
#! nix-shell -i bash -p imagemagick
set -euo pipefail
cd "$(dirname "$0")/.."
frames_dir=$(mktemp -d)
trap 'rm -rf "$frames_dir"' EXIT

# A short meteor crosses the open sky inside the crescent; the art stays still.
for ((frame = 0; frame < 15; frame++)); do
  drawing=()
  for ((tail = 3; tail >= 0; tail--)); do
    step=$((frame - tail))
    if ((step >= 0 && step < 11)); then
      x=$((27 - step))
      y=$((3 + step))
      colors=('#fff6ff' '#c1a0ff' '#80659f' '#4c3b63')
      drawing+=(-fill "${colors[tail]}" -draw "point $x,$y")
    fi
  done
  printf -v frame_name '%02d' "$frame"
  magick public/88x31.png "${drawing[@]}" "$frames_dir/$frame_name.png"
done

magick -delay 280 public/88x31.png \
  -delay 8 "$frames_dir"/*.png \
  -loop 0 -layers Optimize public/88x31.gif
