# FFprobe Docker Setup Guide

FFprobe is **not bundled** in the Curatr Docker image to keep it lightweight. This guide covers how to enable FFprobe for media analysis when running Curatr in Docker — particularly on NAS devices (Synology, QNAP, Unraid, etc.).

## Why a Static Binary?

The Curatr Docker image uses Alpine Linux (musl libc), while most NAS systems use glibc. This means you **cannot** simply mount your NAS's native ffprobe binary into the container — it will fail with a missing library error.

The solution is to use a **statically-linked** ffprobe binary that works independently of the host's C library. You download it once, store it on the NAS, and mount it into the container as a volume.

## Setup

### 1. Download a Static FFprobe Build

SSH into your NAS and run:

```bash
# Create a directory for the binary
mkdir -p /volume1/docker/curatr-app/ffprobe

# Check your architecture
uname -m
# x86_64  → use amd64
# aarch64 → use arm64
```

Download the matching build from [johnvansickle.com/ffmpeg](https://johnvansickle.com/ffmpeg/):

```bash
# For x86_64 (most Synology, QNAP, Unraid)
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# For ARM64 (some newer Synology models)
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz
```

Extract and copy the binary:

```bash
tar xf ffmpeg-release-*-static.tar.xz
cp ffmpeg-*-static/ffprobe /volume1/docker/curatr-app/ffprobe/
chmod +x /volume1/docker/curatr-app/ffprobe/ffprobe

# Clean up
rm -rf ffmpeg-release-*-static.tar.xz ffmpeg-*-static/
```

Verify it works:

```bash
/volume1/docker/curatr-app/ffprobe/ffprobe -version
```

> **Note**: The path `/volume1/docker/curatr-app/ffprobe/` is a Synology convention. Adjust for your NAS (e.g., `/mnt/user/appdata/ffprobe/` for Unraid, `/share/Container/ffprobe/` for QNAP).

### 2. Configure Docker Compose

Add the volume mount and environment variables to your `docker-compose.yml`:

```yaml
services:
  curatr-app:
    image: curatr-app
    environment:
      # ... existing environment variables ...
      - FFPROBE_PATH=/ffprobe/ffprobe
      - FFPROBE_TIMEOUT=60000  # 60 seconds (generous for NAS storage)
    volumes:
      # ... existing volumes ...
      - /volume1/docker/curatr-app/ffprobe:/ffprobe:ro
```

### 3. Restart the Container

```bash
docker compose up -d
```

### 4. Verify in the App

Go to the **FFprobe integration page** at `/integrations/ffprobe`. You should see:
- Status: **Available**
- Path: `/ffprobe/ffprobe`
- Version info from the static binary

Then navigate to any episode file page and use the **Analyze** button to test it on a real media file.

## Timeout Configuration

NAS storage can be slower than local SSDs, especially for large files or when accessing media over the network. If analysis times out:

| Scenario | Recommended `FFPROBE_TIMEOUT` |
|----------|-------------------------------|
| Local SSD / fast NAS | `30000` (30s, default) |
| Spinning disks / typical NAS | `60000` (60s) |
| Large 4K/HDR files on slow storage | `120000` (120s) |

## Alternative: Extend the Docker Image

If you prefer not to manage a static binary, you can extend the Curatr image to include ffmpeg from Alpine's package manager:

Create a `Dockerfile.ffprobe`:

```dockerfile
FROM curatr-app:latest
RUN apk add --no-cache ffmpeg
```

Build and use it:

```bash
docker build -t curatr-app-ffprobe -f Dockerfile.ffprobe .
```

Then in `docker-compose.yml`:

```yaml
services:
  curatr-app:
    image: curatr-app-ffprobe
    environment:
      - FFPROBE_PATH=/usr/bin/ffprobe
```

## Troubleshooting

### "ffprobe: not found" or "permission denied"
- Check that the binary is executable: `chmod +x /volume1/docker/curatr-app/ffprobe/ffprobe`
- Verify the volume mount is correct in `docker-compose.yml`
- Check container logs: `docker logs curatr-app`

### "Exec format error"
- Architecture mismatch: you downloaded the wrong build (e.g., amd64 binary on an ARM NAS)
- Run `uname -m` on the NAS and download the matching static build

### Analysis times out on large files
- Increase `FFPROBE_TIMEOUT` (see table above)
- Verify your media volume isn't mounted over a slow network link

### NAS has ffmpeg installed but it shows the wrong version
- Synology ships a built-in ffmpeg (v4.x) at `/usr/bin/ffmpeg`
- Community packages install to different paths (e.g., `/var/packages/ffmpeg/target/bin/ffprobe`)
- Run `find / -name "ffprobe" 2>/dev/null` to see all installed copies
- This doesn't affect the Docker setup — the static binary in the container is independent
