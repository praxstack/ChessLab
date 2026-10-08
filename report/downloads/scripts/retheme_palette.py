"""Map the stylesheet's inherited warm-gray and green colours onto the original ink and teal palette.

Usage: python3 scripts/retheme_palette.py web/src/styles.css [--check]

Each neutral colour becomes an ink neutral and each green becomes teal at the same relative
luminance, so every text/background contrast ratio in the stylesheet is preserved. Board,
highlight and button colours are set explicitly in OVERRIDES. Reds, ambers, blues and purples
(errors, annotations, focus) are left unchanged. Running the script on its own output is a no-op.
"""
import colorsys
import re
import sys

INK_HUE, TEAL_HUE = 218 / 360, 168 / 360

# Explicit choices: board squares, move highlights, the primary button and the board themes.
OVERRIDES = {
    # Default "slate" board: warm sand light squares, cool slate dark squares, ink coordinates.
    '#eeeed2': '#ebdfc8', '#58723f': '#4a5b70', '#769656': '#7a8ea3', '#f0f0d8': '#1a2230',
    '#f6f669': '#f3d58c', '#baca44': '#c2ad6c', '#f6f66980': '#3fbfa266', '#e9e94255': '#f0c75e55',
    # "Walnut" replaces the former brown theme.
    '#f0d9b5': '#f1e7d0', '#866040': '#7a5a40', '#b58863': '#845c3f', '#fff5e4': '#f7ecd6',
    # Primary action and its pressed edge.
    '#81b64c': '#3fbfa2', '#92c25c': '#5fd0b6', '#547b30': '#21806b',
}
CHOSEN = set(OVERRIDES.values())


def parse(value):
    digits = value[1:]
    if len(digits) in (3, 4):
        digits = ''.join(c * 2 for c in digits)
    rgb = tuple(int(digits[i:i + 2], 16) / 255 for i in (0, 2, 4))
    alpha = digits[6:8] if len(digits) == 8 else ''
    return rgb, alpha


def luminance(rgb):
    def channel(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def with_luminance(hue, saturation, target):
    low, high = 0.0, 1.0
    for _ in range(40):
        mid = (low + high) / 2
        if luminance(colorsys.hls_to_rgb(hue, mid, saturation)) < target:
            low = mid
        else:
            high = mid
    return colorsys.hls_to_rgb(hue, (low + high) / 2, saturation)


def hex_of(rgb, alpha=''):
    return '#' + ''.join(f'{round(c * 255):02x}' for c in rgb) + alpha


def remap(value):
    key = value.lower()
    if key in OVERRIDES:
        return OVERRIDES[key]
    if key in CHOSEN:
        return value
    rgb, alpha = parse(key)
    hue, light, sat = colorsys.rgb_to_hls(*rgb)
    degrees = hue * 360
    if sat < 0.02 or light > 0.985 or light < 0.02:
        return value  # pure greys, white and black (including translucent overlays)
    target = luminance(rgb)
    if 65 <= degrees <= 150:
        # Greens become teal; strongly saturated greens keep their strength, tints stay tints.
        return hex_of(with_luminance(TEAL_HUE, min(0.62, sat * 1.05), target), alpha)
    if 20 <= degrees < 65 and sat < 0.45:
        # Warm greys and beiges become ink neutrals: richer when dark, softer when light.
        saturation = 0.24 if light < 0.35 else 0.12 if light < 0.75 else 0.2
        return hex_of(with_luminance(INK_HUE, saturation, target), alpha)
    return value


def retheme(css):
    return re.sub(r'#[0-9a-fA-F]{3,8}\b', lambda m: remap(m.group(0)) if len(m.group(0)) in (4, 5, 7, 9) else m.group(0), css)


if __name__ == '__main__':
    path = sys.argv[1]
    source = open(path).read()
    result = retheme(source)
    if '--check' in sys.argv:
        sys.exit(0 if result == source else 'Stylesheet contains colours outside the palette; run the retheme script.')
    open(path, 'w').write(result)
