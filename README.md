# CERTUS Elite: Pesticide Label Investigation Simulator

A browser-based 3D field simulation for the CERTUS Elite Technician Certification. The learner stands at the back of a service truck at a commercial account. They handle two fictional pesticide products, read the labels, check the work order, and talk the job through with Alex, their field supervisor, until they reach a decision they can defend.

**Primary delivery:** Articulate Rise 360 on an iPhone 13 in portrait. Desktop is secondary.
**Target duration:** 5–7 minutes. **Learning objective:** read several sections of two pesticide labels and apply that evidence to a realistic treatment decision.

> Every product, ingredient, label, and registration identifier in this activity is a fictional training example. The labels say so on every panel. None of them are real EPA registrations.

---

## What's in the box

| Path | What it is |
|---|---|
| `release/certus-label-investigation-webobject.zip` | **Packaged production build.** Upload this to Storyline, Rise, or an LMS. |
| `dist/` | The same build, unzipped (`index.html` plus `assets/`). |
| `src/content/labelCopy.ts` | Label wording for both products. The single source for the 3D texture and the readable label. |
| `src/content/labels.ts` | Draws the 3D label textures from that wording. |
| `src/ui/LabelView.tsx` | Stage 2: the flat, zoomable HTML label reader. |
| `src/dialogue/engine.ts` | Alex's deterministic, evidence-aware conversation. |
| `src/three/` | 3D scene: truck, site, products, touch and mouse handling. |
| `src/ui/` | Chat sheet, work order, field notes, debrief. |
| `src/quality.ts` | Phone and desktop rendering quality settings. |
| `test/rise-harness.html` | A mock Rise lesson page for testing in a narrow iframe (dev only, not in the build). |

There are no image, model, font, or audio files. Textures, label artwork, and ambient sound are all generated in the browser, so the build makes no network requests at runtime and needs no live AI service.

## Build instructions

Requires Node.js 18 or newer.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run package
```

`npm run package` type-checks, builds to `dist/`, and zips the build to `release/certus-label-investigation-webobject.zip`.

## Hosting on GitHub Pages

`.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on every push to `main`.

1. Create an empty repository on github.com (no README or .gitignore, so the first push is clean).
2. From this folder, push the code:

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "Initial commit: CERTUS label investigation simulator"
```

```bash
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
```

```bash
git push -u origin main
```

3. On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to finish (about a minute). Re-run it if it ran before step 3.
5. The site is at `https://YOUR-ACCOUNT.github.io/YOUR-REPO/`. Paths are relative, so it works from that subfolder as-is.

Every later push to `main` redeploys. **Visibility:** a GitHub Pages site is public to anyone with the link, even if the repository is private. Private Pages sites need GitHub Enterprise Cloud.

## Putting it in Articulate Storyline (web object)

1. Unzip `certus-label-investigation-webobject.zip` into its own folder. `index.html` should be at the top level of that folder.
2. In Storyline, go to **Insert → Web Object** and choose that folder.
3. Set **Display in slide**.
4. Publish.

**Optional completion hand-off.** Create two Storyline project variables:

- `LabelSimComplete` (True/False, default False)
- `LabelSimDecision` (Text)

When the learner finishes, the simulation sets `LabelSimComplete` to True and `LabelSimDecision` to `confirm-before-choosing`. If the simulation isn't running inside Storyline, it skips this step without errors. It also posts `{ type: 'certus-label-sim:complete' }` to the parent window for other hosts.

## Putting it in Rise 360

Either:
- Embed the Storyline block that contains the web object (recommended, so the completion variables work), or
- Host `dist/` on a server you control and point a Rise **Multimedia → Embed** block or code block at it in an iframe.

**Height.** Rise doesn't resize embeds by itself. The app fills whatever height the iframe gets and lays itself out to fit, so a fixed height works. Recommended iframe heights:

| Where | Height |
|---|---|
| Phone portrait | 780 px (works down to about 560 px) |
| Desktop | 640–760 px |

If your host page can listen for it, the app posts `{ type: 'certus-label-sim:height', height }` to its parent with a preferred height for the current width. `test/rise-harness.html` shows a listener. Nothing depends on this message.

**Scrolling.** Swiping on the truck scene scrolls the Rise page normally. Only while a product is in hand does the scene take over one-finger and two-finger gestures, so learners can rotate and pinch without the page moving. The label reader, chat history, and work order scroll internally and don't drag the page along.

**Inside the iframe.** Full-screen views (label reader, work order, field notes) fill the iframe, not the phone, and nothing opens new windows. Restarting uses an in-app confirmation, because some LMS iframes block browser dialogs.

## How the experience works

**Stage 1: handle the product (3D).**
- Pick a product up from the tray (tap it, use the tray buttons, or press `1`/`2`).
- One-finger drag or mouse drag turns it freely in any direction, including upside down to see the bottle's base.
- Pinch, or the mouse wheel, zooms. Double-tap or double-click turns that spot to face you and moves in close. On desktop, right-drag or Shift-drag slides the product.
- A chip near the bottom names the label section under the center dot ("Tap to read · Restrictions").
- On phones the toolbar has **Reset**, **Read label**, **Switch** (swap to the other product), and **Put back**. Desktop adds quarter turns, Back panel, and zoom buttons.

**Stage 2: read the label (flat HTML).**
- Tapping a label section on the 3D product zooms into a flat reader opened at that section.
- The whole label is laid out panel by panel (Front, Right side, Back, Left side) as real HTML and SVG text. Zooming changes the text size rather than scaling a picture, so it stays sharp at every level from 70% to 400%.
- Pinch, ctrl/⌘ + scroll, or the − / + buttons zoom. Swipe, scroll, or mouse-drag pans.
- Only the section the learner chose is highlighted. Tapping any other section examines it too, and examined sections get a small check mark.
- **Back to bottle/carton** returns to the product in exactly the orientation it was left in.

**Evidence tracking.** Each section the learner opens or taps in the reader is recorded with a timestamp. Work order rows are noted once the order has been open long enough to read, and things Alex tells the learner are noted too. The **Field notes** journal lists what was found, grouped by source, without saying what's right. Selecting a note reopens that evidence: the product is picked up and the reader opens at that section.

**Alex** reacts to what the learner has actually examined:
- After the learner reads PerimeterGuard's indoor restriction, Alex asks unprompted: "So, does that product work for this job?" Identifying the restriction gets "Right. What about the second product?"
- After the learner reads InteriorGuard's application sites, Alex asks: "Looks promising. Anything we still need to verify?"
- When the learner points out that the work order doesn't give a location, Alex says "That's the missing piece. What would you ask the customer?" The learner then chooses the questions they'd ask.
- Options appear only after the matching evidence has been found. Alex never asks for something already found and doesn't give the answer early.
- An unsuitable product choice sends the learner back to the specific label evidence. Either product can be revisited at any point before the final call.
- **Final decision:** Alex says the site manager will ask what's going down today, and the learner chooses how to explain the recommendation. Rushed or off-label explanations get pushback and another try.
- On phones the conversation is a bottom sheet. Collapsed, it's a peek bar showing Alex's latest line and an unread count. Expanded, it shows recent history (earlier messages are one tap away) and large reply buttons. Picking up a product collapses it automatically so the product gets the screen.

**Debrief:** a field decision record showing how the learner's thinking changed, how many label sections they examined, the key evidence found or missed, what they said they'd confirm, and an expert walkthrough. It isn't scored.

**Accessibility:** every 3D action has a button or keyboard equivalent (`Enter` reads the section in the center, arrows turn, `+`/`−` zoom, `R` resets, `Esc` puts the product back). The label reader is semantic HTML that VoiceOver can read, and each section is a focusable button. The chat is an ARIA live region. Body text is at least 16 px on phones, and main touch targets are at least 44×44 px. Focus styles are visible, nothing requires hover, and reduced motion is respected.

## Mobile performance

Phones are detected by a coarse pointer or narrow screen (`src/quality.ts`). On phones:
- 3D label textures are rendered at half resolution, because reading happens in the HTML reader.
- The shadow map drops to 1024 px, the contact-shadow pass is turned off, environment lighting is lower resolution, and geometry segment counts are lower.
- Pixel ratio adapts: drei's `PerformanceMonitor` lowers it when frame rate drops and raises it again when there's headroom.
- Rendering stops entirely when the simulator scrolls out of view, when the page is hidden, and while the label reader covers the 3D view.

## Testing

What was tested, in Chromium device emulation (touch emulation on for the phone sizes):

| Viewport | Checked |
|---|---|
| iPhone 13 portrait, 390×844 | Layout, bottom sheet, touch rotate, pinch zoom, tap to read, reader pinch zoom, full conversation to debrief |
| iPhone SE, 375×667 | Layout with sheet open and closed, no clipping |
| iPhone 13 landscape, 844×390 | Side-by-side layout, 44 px targets, no overflow |
| Desktop, 1440×900 | Reader centering, 3D labels, chat panel |
| Simulated Rise iframe, 390 px wide, auto height and fixed 560 px | No horizontal overflow, page scroll outside the held product, height message received |

**Not verified on a physical iPhone in Safari.** Emulation doesn't reproduce Safari's real touch pipeline, its toolbar resizing the viewport, notch insets, or GPU memory limits. Test on a device before release. To run the harness locally, start `npm run dev` and open `/test/rise-harness.html` (add `?h=560` for a fixed-height block).

## Editing content

- **Label wording:** `src/content/labelCopy.ts` is the single source for both the 3D texture and the HTML reader. Keep all units U.S. customary.
- **Alex's lines:** `src/dialogue/engine.ts`. Each choice has a `when` condition that reads evidence and flags, and a `run` function that returns Alex's lines and the next node. `proactive()` holds the lines Alex says unprompted.
- **Work order fields:** `src/content/workOrder.ts`.
