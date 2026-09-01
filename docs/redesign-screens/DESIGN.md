---
name: Aura Social
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9ccaf'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#84967c'
  outline-variant: '#3b4b35'
  surface-tint: '#02e600'
  primary: '#eaffde'
  on-primary: '#013a00'
  primary-container: '#00ff00'
  on-primary-container: '#027100'
  inverse-primary: '#026e00'
  secondary: '#ffb4a8'
  on-secondary: '#690100'
  secondary-container: '#ff5540'
  on-secondary-container: '#5c0000'
  tertiary: '#f8f9f9'
  on-tertiary: '#2f3131'
  tertiary-container: '#dcdcdc'
  on-tertiary-container: '#5f6161'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#77ff61'
  primary-fixed-dim: '#02e600'
  on-primary-fixed: '#002200'
  on-primary-fixed-variant: '#015300'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#930100'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 80px
    fontWeight: '900'
    lineHeight: 72px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
  stroke-thin: 1px
  stroke-thick: 2px
---

## Brand & Style

The design system is rooted in **Neo-Brutalism** and **Digital Utilitarianism**. It rejects the soft, approachable aesthetics of modern social media in favor of a raw, information-dense interface that feels like a high-performance terminal. 

The personality is aggressive, transparent, and unapologetically technical. It prioritizes data over decoration, using stark contrasts and rigid structural lines to organize information. The target audience values speed, efficiency, and a "no-nonsense" digital environment. Visual hierarchy is established through extreme scale shifts in typography and heavy-weight borders rather than depth or color.

## Colors

This design system utilizes a strictly restricted, high-contrast palette. 

- **Backgrounds:** Pure Black (#000000) is the foundation for all surfaces to ensure maximum contrast and OLED efficiency.
- **Surface Tiers:** Stark Dark Gray (#121212) is used for secondary containers or to differentiate sections without losing the "void" aesthetic.
- **Accents:** Neon Green (#00FF00) is reserved exclusively for positive actions, gains, or "online" status indicators. Pure Red (#FF0000) is used for losses, errors, or destructive actions.
- **Content:** White (#FFFFFF) is the primary color for text and icons to maintain legibility.
- **Borders:** Mid-gray (#333333) or White (#FFFFFF) are used for structural lines depending on the required intensity.

## Typography

Typography is the primary driver of the UI. It utilizes **Inter** for its systematic, neutral qualities, pushed to its extremes in weight and case. **JetBrains Mono** is introduced for metadata and labels to reinforce the utilitarian, technical feel.

- **Scale:** Large display titles should use tight leading and negative letter spacing to feel "heavy."
- **Case:** All headers, buttons, and labels must be in **Uppercase**. Only body copy and user-generated content retain sentence casing.
- **Emphasis:** Boldness is preferred over color for emphasis.

## Layout & Spacing

The layout is built on a rigid 4px baseline grid. Elements are separated by heavy strokes rather than whitespace alone.

- **Grid:** A 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Dividers:** Use `stroke-thin` for internal content separation and `stroke-thick` for major section breaks or top-level navigation.
- **Alignment:** All content must be hard-aligned to the grid. Avoid centering elements; prefer top-left alignment for a structured, documentation-like feel.
- **Padding:** Use generous but mathematical spacing (multiples of 8px) within containers to maintain legibility against the heavy borders.

## Elevation & Depth

This design system is strictly **Flat**. There are no shadows, blurs, or gradients.

- **Z-Axis:** Depth is communicated through "stacking" via outlines and contrast. A modal or pop-over is simply a container with a `stroke-thick` white border and a pure black background, placed directly over the content.
- **Interaction:** Hover states are indicated by inverting colors (e.g., background becomes white, text becomes black) or by adding a Neon Green border. 
- **Layers:** Use the secondary background (#121212) to suggest a lower layer, but do not use shadows to lift elements above it.

## Shapes

The shape language is defined by **Sharp Edges**. All corners are 0px. 

- **Containers:** Every card, button, and input field must be a perfect rectangle or square.
- **Icons:** Use thick-stroke, geometric icons. Avoid rounded terminals on icon paths; prefer squared-off ends.
- **Avatars:** User avatars should be square. If a distinction is needed, use a 45-degree clipped corner (dog-ear) rather than a radius.

## Components

### Buttons
Buttons are rectangular with a `stroke-thick` white border. 
- **Primary:** Black background, White text, Uppercase Bold. On hover, invert to White background, Black text.
- **Success:** Neon Green background, Black text.
- **Danger:** Red background, White text.

### Inputs
Input fields are defined by a bottom-border only or a full thin border. Background must remain #000000. Use JetBrains Mono for placeholder text to signal "input mode."

### Chips/Tags
Small, sharp-edged boxes with `label-mono` text. Use Neon Green for active filters and White/Gray for inactive ones.

### Cards
Cards are simple containers with a `stroke-thin` border. No padding on the outer container if it holds an image; the image should be flush with the borders.

### Lists
List items are separated by a 1px horizontal rule. Use an "arrow" character (→) or a chevron with a 90-degree angle for navigation cues.

### Progress Bars
Solid blocks of color (Neon Green). No rounded ends. The background of the bar should be the secondary gray (#121212).