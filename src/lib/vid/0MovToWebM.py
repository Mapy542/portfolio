"""
Batch-convert MOV videos to compressed WebM, mirroring 0ImgResize.py behavior.

Requirements:
- ffmpeg must be installed and available on PATH
    Windows: https://www.gyan.dev/ffmpeg/builds/ (add ffmpeg\bin to PATH)
- Python 3.8+

Behavior:
- Scans the current script directory and its immediate subfolders
- Converts .mov (case-insensitive) to .webm using VP9 + Opus
- Replaces spaces in filenames with dashes, keeps folder structure
- By default, deletes the original .mov after successful conversion
"""

import os
import shutil
import subprocess
import sys
from typing import List


# -------------------- Configuration --------------------
# VP9 quality: lower CRF = higher quality, larger file. Typical: 28–36
VIDEO_CRF = int(os.getenv("WEBM_CRF", "32"))
# Speed/quality tradeoff: 0 (best/slowest) .. 5 (fastest/worst) for libvpx-vp9 via -cpu-used
CPU_USED = int(os.getenv("WEBM_CPU_USED", "4"))
# Audio bitrate (Opus)
AUDIO_BITRATE = os.getenv("WEBM_AUDIO_BITRATE", "96k")
# Delete original MOV after success
DELETE_ORIGINALS = os.getenv("WEBM_DELETE_ORIGINALS", "1") not in ("0", "false", "False")


def which_ffmpeg() -> str:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        print(
            "Error: ffmpeg not found on PATH. Install it and ensure 'ffmpeg' is available.",
            file=sys.stderr,
        )
        sys.exit(1)
    return ffmpeg_path


def collect_videos(base_dir: str) -> List[str]:
    """Collect MOV files in base_dir and its first-level subdirectories, returning relative paths."""
    entries = os.listdir(base_dir)
    rel_paths: List[str] = []

    subdirs = [d for d in entries if os.path.isdir(os.path.join(base_dir, d))]
    # Include files at root
    for name in entries:
        if os.path.isfile(os.path.join(base_dir, name)):
            rel_paths.append(name)
    # Include files in immediate subdirs (mirrors 0ImgResize.py approach)
    for sub in subdirs:
        for name in os.listdir(os.path.join(base_dir, sub)):
            rel_paths.append(os.path.join(sub, name))

    videos = [p for p in rel_paths if p.lower().endswith(".mov")]
    return videos


def convert_mov_to_webm(ffmpeg: str, base_dir: str, rel_in_path: str) -> bool:
    """Convert single MOV to WEBM. Returns True on success."""
    in_abs = os.path.join(base_dir, rel_in_path)
    stem = os.path.splitext(rel_in_path)[0].replace(" ", "-")
    out_rel = f"{stem}.webm"
    out_abs = os.path.join(base_dir, out_rel)

    # Ensure output directory exists (in case nested)
    os.makedirs(os.path.dirname(out_abs), exist_ok=True)

    cmd = [
        ffmpeg,
        "-y",  # overwrite
        "-i",
        in_abs,
        # Video
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",  # use CRF mode
        "-crf",
        str(VIDEO_CRF),
        "-row-mt",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        "0",
        "-cpu-used",
        str(CPU_USED),
        # Audio
        "-c:a",
        "libopus",
        "-b:a",
        AUDIO_BITRATE,
        out_abs,
    ]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            print(f"ffmpeg failed for: {rel_in_path}\n{proc.stderr}", file=sys.stderr)
            return False
        # Delete original if configured
        if DELETE_ORIGINALS:
            try:
                os.remove(in_abs)
            except Exception as e:
                print(f"Warning: failed to remove original '{rel_in_path}': {e}")
        return True
    except FileNotFoundError:
        print("Error: ffmpeg not found when executing.", file=sys.stderr)
        return False


def main() -> None:
    base_dir = os.path.dirname(os.path.realpath(__file__))
    ffmpeg = which_ffmpeg()
    videos = collect_videos(base_dir)

    if not videos:
        print("No MOV files found to convert.")
        return

    total = len(videos)
    print(f"Found {total} MOV file(s). Starting conversion…")
    for i, rel in enumerate(videos, 1):
        pct = f"{(i-1)/total*100:.1f}%"
        print(f"[{pct}] Converting: {rel}")
        ok = convert_mov_to_webm(ffmpeg, base_dir, rel)
        if not ok:
            print(f"Failed: {rel}")
    print("Done!")


if __name__ == "__main__":
    main()
