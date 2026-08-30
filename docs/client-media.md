# Client media — pick, shrink, upload

Companion to [backend-architecture.md](./backend-architecture.md) §6 (presign → PUT → worker variants) and [product-spec.md](./product-spec.md) §10 (create flow).

The API never sees the file. The app PUTs bytes at a short-lived URL. That only stays cheap and reliable if the **thing we PUT is already small enough to view well on a phone**. This document is the contract for that work: what V1 does on device today, and how the rest of the pipeline runs in parallel without blocking the create screen.

Web never uploads. Video is MEDIA-06. Camera capture is on the create screen but disabled until we ship it.

---

## 1. Why the app has to shrink the file

A current iPhone photo is 12–48 MP, often HEIC, often 4–15 MB. The worker already makes a 1080-wide feed JPEG and a 400-wide thumb at quality 85 (`apps/api/src/media/process-media.service.ts`). Uploading the camera-roll original so the worker can throw most of it away is wasted radio, wasted R2, and a stuck progress bar on a bad network.

Client-side optimize does **not** replace the worker. The worker still owns feed/thumb (and later blurhash). The client owns the **master we are willing to store and reprocess**.

| Plane | Job | Output |
|---|---|---|
| App, before PUT | Decode, orient, optionally downscale, JPEG-encode, measure, (later) hash | One master, longest edge ≤ 2160, usually JPEG |
| Worker, after complete | Deterministic renditions from that master | `feed` 1080 JPEG q85, `thumb` 400 JPEG q85 |
| CDN, at read time | Extra sizes if a surface needs them | `resolver.url(asset, "feed", { width })` |

Never skip the worker because the client already encoded. Clients lie, crash mid-write, and ship old builds. The worker is the source of truth for what the feed shows.

---

## 2. Viewing target, then upload target

Pick the screen first, then the file.

| Constraint | Value | Why |
|---|---|---|
| Largest phone we ship for | 430pt logical width, 3× | iPhone Pro Max class. `supportsTablet` is false. |
| Pixels that must look sharp | ~1290 CSS px on the long edge | 430 × 3. Full-bleed portrait card. |
| Upload master longest edge | **2160** | ≈1.67× the viewing bar, so a light crop or pinch-zoom still holds, and the worker has headroom for 1080 / 400. |
| Client JPEG quality | **0.82** | Visually next to the worker’s 85; enough smaller to matter on cellular. |
| Hard cap | **20 MB** | Same as `MEDIA_PHOTO_MAX_BYTES`. Fail before presign if we are still over. |

Do **not** upload a 1080 master. 1080 is the feed rendition. The master has to be larger so a future reprocess (new thumb size, new format) does not start from an already-soft file.

Do **not** upload 4K “just in case”. Past ~2160 the extra pixels are invisible on the phones we support and dominate upload time.

Height follows width. We scale by **longest edge**, not by width alone, so a 4032×3024 landscape and a 3024×4032 portrait both become 2160 on the long side.

---

## 3. Format and EXIF

| Source | What we do |
|---|---|
| JPEG already ≤ 2160 and smaller than our encode | Keep the original. Re-encoding a small JPEG only adds generation loss. |
| PNG / WebP already ≤ 2160 and smaller than our encode | Keep the original. Screenshots often beat JPEG. The API accepts both. |
| HEIC / HEIF | Always JPEG-encode. Sharp can read HEIC only when libvips was built with it; the worker must not depend on that. |
| Unknown / empty MIME | JPEG-encode. Picker MIME is not a contract. |
| Anything still over 20 MB after encode | Refuse locally (`create.errors.tooLarge`). |

`expo-image-manipulator` applies EXIF orientation while it encodes. We do not send GPS EXIF (`exif: false` on the picker). Strip location; keep dimensions.

Checksum (later): hash **after** mutate, never the camera-roll bytes. `POST /posts/uploads` already accepts `checksum`. A hash of the original would fail verification on a file we no longer PUT.

---

## 4. V1 (what the app does now)

Shipped with MOB-52. One photo. No video. No camera.

```text
Choose photo
  → library, images only. iOS does not ask Photos permission (PHPicker).
    Compatible JPEG, quality 0.85 — not Current + quality 1 (that reads
    PHAsset and iOS kills the process if the usage string is missing, and
    a 48MP HEIC can jetsam the app).
  → show preview immediately (picker URI)
  → after interactions: decode / resize / JPEG only if still over 2160
  → swap preview to the optimized URI when it wins
  → user writes caption in parallel
  → Post waits for the optimize promise if it is still running
  → POST /posts/uploads { contentType, byteSize, width, height }
  → PUT presigned URL
  → POST /posts/:id/complete
  → poll until published
```

`asset.fileSize === 0` is not an error. iOS often omits it. We measure with `fetch` + `blob.size`, never `expo-file-system` `File` on a picker URI (`ph://` can abort the process).

Take a picture stays on screen and stays disabled. Do not hide it — the product spec still has camera; this is a deliberate ship order, not a deleted feature.

Constants live in `apps/mobile/lib/media/photo-targets.ts` so this document and the code cannot drift.

---

## 5. Parallel pipeline (how the next versions are built)

V1 is already overlapping **encode** with **caption**. The rest of the work is more stages, not a different upload. Keep the stages pure and independently awaitable.

```text
            pick (user)
               │
               ├─────────────────────────────┐
               ▼                             ▼
        [A] probe                      preview on screen
        bytes + WxH                    caption field enabled
               │
               ▼
        [B] encode          ─┐
        resize + JPEG        │   same InteractionManager
               │             │   tick, never on press
               ▼             │
        [C] hash master      │
        sha256 of            │
        optimized bytes     ─┘
               │
               ▼
        [D] createUpload    ── needs final byteSize + checksum
               │
               ▼
        [E] PUT bytes       ── only this touches the radio for the file
               │
               ▼
        [F] complete + poll
```

### What may run at the same time

| Together | Why it is safe |
|---|---|
| A in parallel with preview + caption | Probe is IO. UI must not wait. |
| B in parallel with caption | Encode is CPU/GPU. User is typing. |
| C in parallel with caption, starting the moment B finishes | Hash is CPU on a buffer we already have. |
| D after B (and C, once we send checksum) | Presign `Content-Length` is the optimized size. Starting D on the original size, then swapping files, desyncs the signed headers. |
| E is one in-flight PUT per post | One master, one object key. Parallel PUT of the same file is not resume. |
| Later: two photos in a carousel | Concurrency 2 on B+C. Do not decode four 48 MP images at once. D+E stay sequential per post unless we add multi-asset posts. |

### What must not run at the same time

- **D before B.** The signed `Content-Length` and `Content-Type` are the file we PUT. Optimize first.
- **Hash of the original in parallel with encode, then send that hash.** The object will not match.
- **A second encode while the first is still writing.** One job per pick. A new pick cancels the previous promise.
- **Video transcode on JS.** Mux transcodes from the master. The phone may later do a display-size proxy; the master still uploads as recorded, within `MEDIA_VIDEO_MAX_BYTES`.

### Threading

| Work | Where |
|---|---|
| Picker + permissions | Main / UI |
| Preview bind | Main, picker URI first |
| Encode | Native image pipeline (`ImageManipulator` already schedules on a background thread; `renderAsync` is the await point) |
| Kick-off | `InteractionManager.runAfterInteractions` so the picker dismiss animation is not competing with a decode |
| Hash | Later: `expo-file-system` streaming hash or a small native module. Do **not** `readAsStringAsync` a 10 MB file into JS to feed `expo-crypto`. |
| PUT | XHR (`put-presigned.ts`) so progress events exist. React Native `fetch` does not report upload progress. |

### Multi-asset sketch (not V0)

When a post can carry more than one photo:

1. Probe all assets with concurrency 4 (stat is cheap).
2. Encode with concurrency **2**.
3. As each encode finishes, hash it (concurrency 2).
4. One `createUpload` per asset, fired as soon as that asset’s B+C resolve — do not wait for the whole album.
5. PUT with concurrency **2** (cellular) or **3** (Wi-Fi). Surface one progress bar: `sum(loaded) / sum(total)`.
6. `complete` only when every asset has a verified object.

Cancel aborts every in-flight PUT and drops the unused optimize promises. Temp JPEGs in the cache directory are leftover-safe; the OS may delete them.

### Video (MEDIA-06)

Do **not** run a JS encoder. Library **Choose video** only (no in-app camera). Native shrink (~1080p H.264) is fine; refuse after export if over **60s** / **100 MB**. Prefer PUT `video/mp4`.

```
phone → PUT master.mp4 → R2 (ours, forever)
                       → worker tells Mux to ingest the public CDN URL
                       → Mux copies + transcodes + delivers HLS
                       → player ← stream.mux.com/{playbackId}.m3u8
```

R2 is not what the feed plays. Mux is not a CDN in front of R2. Do not Mux Direct Upload from the phone — that skips the master we must keep.

A display-size proxy (720p) can be a later opt-in if cellular uploads dominate support tickets. The original still goes to our bucket (architecture §6.6).

---

## 6. Failure and fallback

| Case | Behaviour |
|---|---|
| Picker `fileSize` is 0 | Measure. Do not show `unreadable`. |
| Measure fails, encode succeeds | Use the encoded file. |
| Encode fails, original is an accepted type with a known size | PUT the original if it is under 20 MB. |
| Encode fails and we have no size | `create.errors.optimize` / `unreadable`. |
| Encoded file still > 20 MB | `create.errors.tooLarge`. No presign. |
| User hits Post during B | Phase `preparing`, await the same promise, then upload. Do not start a second encode. |
| User hits Choose a different photo | Abort upload if any; drop the optimize promise; new pick starts a new job. |
| Presign expired mid-PUT | Existing MOB-21 refresh. The file on disk does not change. |

Never upload the original **and** the derivative. If a smaller (or HEIC-replaced) derivative exists, that is the only PUT.

---

## 7. What this is not

- Not a client-side feed/thumb generator. Those stay on the worker so every client, including old builds, produces the same card.
- Not web upload. Spec forbids it.
- Not camera capture. The button stays visible and disabled until that work is scheduled.
- Not a second image stack (`react-native-compressor`, ffmpeg) until V1 is measurably not enough. `expo-image-manipulator` is already in the Expo SDK we ship.

When we add hashing or a second concurrent encode, add a roadmap row and change this file in the same PR. The numbers in §2 only change here and in `photo-targets.ts`, together.
