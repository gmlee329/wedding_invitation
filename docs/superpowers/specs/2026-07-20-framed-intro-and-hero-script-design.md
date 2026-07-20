# Framed Intro Video and Hero Script Design

## Goal

Refine the existing static mobile invitation without changing its single-file deployment model. The intro must keep the same paper background visible while a bounded video plays, the main document background must use that paper color, and the hero phrase must become an Allura-script “Happily Ever After”.

## Approved visual direction

The supplied screenshot defines a portrait stage above the intro controls. The stage uses a 4:5 aspect ratio and the existing mobile content width. The 16:9 source video is centered inside that stage with `object-fit: contain`, preserving the complete original frame rather than cropping its sides. Any unused part of the stage remains transparent so the intro paper texture continues to show.

Alternatives considered and rejected:

- `object-fit: cover` would fill the 4:5 stage but heavily crop the 1280×720 source.
- A standalone 16:9 strip would preserve the source but would not match the tall red guide area in the supplied screenshot.

## Layout and styling

- Add an `.intro-stage` inside `.intro-content`; it contains both the video and the opening signature heading.
- The stage is 4:5, fills the existing intro content width, and is clipped only at its own boundary.
- Before playback, the centered signature remains unchanged. During playback, the heading fades and hides while the video becomes visible only inside the stage.
- The intro shell, space around the contained video, progress line, and controls retain the paper treatment for the entire sequence.
- `html` and `body` use `var(--paper)` rather than the darker outer gray, while `.invitation-page` and `.intro` keep their shared paper texture.
- Change `WEDDING_CONFIG.messages.hero` to `Happily Ever After` and render the hero title with the same `'Allura', cursive` family as the intro names.

## Behavior and fallback

The existing hold, fade, muted playback, sound, skip, Escape, reduced-motion, focus, ended, and timed media-error fallback behavior remains unchanged. A video error removes `is-video-playing`, so the transparent stage immediately shows the paper fallback.

## Testing

Static regression tests will verify:

- `html` and `body` use the paper color;
- the intro video is scoped to a 4:5 `.intro-stage`, uses `object-fit: contain`, and is no longer viewport-sized;
- the shared paper background remains present during playback with no shade or dimming rules;
- the configured hero phrase is exactly `Happily Ever After` and its title uses Allura with a cursive fallback.

Existing interaction tests must continue to pass.
