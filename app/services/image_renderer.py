import io
import logging
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
FONTS_DIR = TEMPLATES_DIR / "fonts"


class ImageRenderer:
    def __init__(self, templates_dir: Path | None = None):
        self.templates_dir = templates_dir or TEMPLATES_DIR
        self.fonts_dir = self.templates_dir / "fonts"
        self._font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}

    def render(self, structure: dict, params: dict) -> bytes:
        canvas_spec = structure.get("canvas", {"width": 1200, "height": 628})
        bg_spec = structure.get("background", {"type": "solid", "color": "#1a1a2e"})

        canvas = self._create_canvas(canvas_spec, bg_spec)

        for layer in structure.get("layers", []):
            canvas = self._render_layer(canvas, layer, params)

        return self._export_png(canvas)

    # ── Canvas creation ──

    def _create_canvas(self, canvas_spec: dict, bg_spec: dict) -> Image.Image:
        w, h = canvas_spec["width"], canvas_spec["height"]
        bg_type = bg_spec.get("type", "solid")

        if bg_type == "solid":
            return Image.new("RGBA", (w, h), self._parse_color(bg_spec.get("color", "#FFFFFF")))
        elif bg_type == "gradient":
            return self._create_gradient(w, h, bg_spec)
        elif bg_type == "image":
            path = self.templates_dir / bg_spec["image_path"]
            if path.exists():
                img = Image.open(path).convert("RGBA").resize((w, h), Image.LANCZOS)
                return img
            logger.warning("Background image not found: %s", path)
            return Image.new("RGBA", (w, h), (30, 30, 46, 255))
        else:
            return Image.new("RGBA", (w, h), (255, 255, 255, 255))

    def _create_gradient(self, w: int, h: int, spec: dict) -> Image.Image:
        img = Image.new("RGBA", (w, h))
        draw = ImageDraw.Draw(img)
        c1 = self._parse_color(spec.get("gradient_start", "#000000"))
        c2 = self._parse_color(spec.get("gradient_end", "#FFFFFF"))
        direction = spec.get("gradient_direction", "vertical")

        if direction == "vertical":
            for y in range(h):
                t = y / max(h - 1, 1)
                color = self._lerp_color(c1, c2, t)
                draw.line([(0, y), (w, y)], fill=color)
        elif direction == "horizontal":
            for x in range(w):
                t = x / max(w - 1, 1)
                color = self._lerp_color(c1, c2, t)
                draw.line([(x, 0), (x, h)], fill=color)
        else:  # diagonal
            for y in range(h):
                for x in range(w):
                    t = (x / max(w - 1, 1) + y / max(h - 1, 1)) / 2
                    color = self._lerp_color(c1, c2, t)
                    draw.point((x, y), fill=color)

        return img

    # ── Layer dispatcher ──

    def _render_layer(self, canvas: Image.Image, layer: dict, params: dict) -> Image.Image:
        layer_type = layer.get("type", "")
        if layer_type == "text":
            return self._render_text_layer(canvas, layer, params)
        elif layer_type == "cta_button":
            return self._render_cta_button(canvas, layer, params)
        elif layer_type == "image":
            return self._render_image_layer(canvas, layer, params)
        elif layer_type == "rectangle":
            return self._render_rectangle(canvas, layer)
        elif layer_type == "overlay":
            return self._render_overlay(canvas, layer)
        else:
            logger.warning("Unknown layer type: %s", layer_type)
            return canvas

    # ── Text layer ──

    def _render_text_layer(self, canvas: Image.Image, layer: dict, params: dict) -> Image.Image:
        field = layer.get("field", "")
        text = str(params.get(field, ""))
        if not text:
            return canvas

        # Vietnamese NFC normalization
        text = unicodedata.normalize("NFC", text)

        x, y = layer.get("x", 0), layer.get("y", 0)
        box_w = layer.get("width", 400)
        box_h = layer.get("height", 100)
        max_lines = layer.get("max_lines", 3)
        alignment = layer.get("alignment", "left")
        line_spacing = layer.get("line_spacing", 6)
        auto_shrink = layer.get("auto_shrink", False)
        min_font_size = layer.get("min_font_size", 12)
        font_size = layer.get("font_size", 24)
        font_family = layer.get("font_family", "NotoSans-Regular")
        font_color = self._parse_color(layer.get("font_color", "#FFFFFF"))
        shadow = layer.get("shadow")

        # Auto-shrink loop
        while font_size >= min_font_size:
            font = self._load_font(font_family, font_size)
            lines = self._wrap_text(text, font, box_w)

            if len(lines) > max_lines:
                lines = lines[:max_lines]
                # Add ellipsis to last line
                last = lines[-1]
                while font.getlength(last + "...") > box_w and len(last) > 1:
                    last = last[:-1]
                lines[-1] = last + "..."

            total_h = self._calc_text_block_height(lines, font, line_spacing)
            if total_h <= box_h or not auto_shrink:
                break
            font_size -= 2

        if font_size < min_font_size:
            font_size = min_font_size
            font = self._load_font(font_family, font_size)

        # Draw text
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        y_cursor = y

        for line in lines:
            line_w = font.getlength(line)
            if alignment == "center":
                lx = x + (box_w - line_w) / 2
            elif alignment == "right":
                lx = x + box_w - line_w
            else:
                lx = x

            # Shadow
            if shadow:
                sx, sy = shadow.get("offset", [2, 2])
                shadow_color = self._parse_color(shadow.get("color", "#00000080"))
                draw.text((lx + sx, y_cursor + sy), line, font=font, fill=shadow_color)

            draw.text((lx, y_cursor), line, font=font, fill=font_color)

            bbox = font.getbbox(line)
            line_h = bbox[3] - bbox[1]
            y_cursor += line_h + line_spacing

        return Image.alpha_composite(canvas, overlay)

    def _wrap_text(self, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
        words = text.split()
        if not words:
            return []

        lines = []
        current = words[0]

        for word in words[1:]:
            test = current + " " + word
            if font.getlength(test) <= max_width:
                current = test
            else:
                lines.append(current)
                current = word
                # Break long word by character if needed
                if font.getlength(current) > max_width:
                    chars = list(current)
                    current = chars[0]
                    for ch in chars[1:]:
                        if font.getlength(current + ch) <= max_width:
                            current += ch
                        else:
                            lines.append(current)
                            current = ch

        if current:
            lines.append(current)

        return lines

    def _calc_text_block_height(
        self, lines: list[str], font: ImageFont.FreeTypeFont, spacing: int
    ) -> int:
        if not lines:
            return 0
        total = 0
        for i, line in enumerate(lines):
            bbox = font.getbbox(line)
            total += bbox[3] - bbox[1]
            if i < len(lines) - 1:
                total += spacing
        return total

    # ── CTA Button ──

    def _render_cta_button(self, canvas: Image.Image, layer: dict, params: dict) -> Image.Image:
        field = layer.get("field", "")
        text = str(params.get(field, ""))
        if not text:
            return canvas

        text = unicodedata.normalize("NFC", text)

        x, y = layer.get("x", 0), layer.get("y", 0)
        w, h = layer.get("width", 200), layer.get("height", 50)
        bg_color = self._parse_color(layer.get("bg_color", "#FF6B00"))
        corner_radius = layer.get("corner_radius", 12)
        font_family = layer.get("font_family", "NotoSans-Bold")
        font_size = layer.get("font_size", 20)
        font_color = self._parse_color(layer.get("font_color", "#FFFFFF"))

        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Button background
        draw.rounded_rectangle(
            [x, y, x + w, y + h],
            radius=corner_radius,
            fill=bg_color,
        )

        # Border if specified
        border = layer.get("border")
        if border:
            draw.rounded_rectangle(
                [x, y, x + w, y + h],
                radius=corner_radius,
                outline=self._parse_color(border.get("color", "#FFFFFF")),
                width=border.get("width", 2),
            )

        # Centered text
        font = self._load_font(font_family, font_size)
        bbox = font.getbbox(text)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        tx = x + (w - text_w) / 2
        ty = y + (h - text_h) / 2 - bbox[1]
        draw.text((tx, ty), text, font=font, fill=font_color)

        return Image.alpha_composite(canvas, overlay)

    # ── Image layer ──

    def _render_image_layer(self, canvas: Image.Image, layer: dict, params: dict) -> Image.Image:
        source = layer.get("source", "")
        x, y = layer.get("x", 0), layer.get("y", 0)
        w, h = layer.get("width", 100), layer.get("height", 100)
        opacity = layer.get("opacity", 1.0)
        corner_radius = layer.get("corner_radius", 0)

        # Load image
        img = None
        if source.startswith("asset:"):
            asset_path = self.templates_dir / source[6:]
            if asset_path.exists():
                img = Image.open(asset_path).convert("RGBA")
            else:
                logger.warning("Asset not found: %s", asset_path)
                return canvas
        elif source in params and params[source]:
            # URL from params - skip for now, would need httpx download
            logger.info("URL image source not yet supported: %s", source)
            return canvas
        else:
            logger.warning("Cannot resolve image source: %s", source)
            return canvas

        # Resize
        img = img.resize((w, h), Image.LANCZOS)

        # Apply opacity
        if opacity < 1.0:
            alpha = img.split()[3]
            alpha = alpha.point(lambda p: int(p * opacity))
            img.putalpha(alpha)

        # Apply corner radius
        if corner_radius > 0:
            mask = Image.new("L", (w, h), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle([0, 0, w, h], radius=corner_radius, fill=255)
            # Combine with existing alpha
            existing_alpha = img.split()[3]
            from PIL import ImageChops
            combined_alpha = ImageChops.multiply(existing_alpha, mask)
            img.putalpha(combined_alpha)

        # Paste onto canvas
        canvas.paste(img, (x, y), img)
        return canvas

    # ── Rectangle ──

    def _render_rectangle(self, canvas: Image.Image, layer: dict) -> Image.Image:
        x, y = layer.get("x", 0), layer.get("y", 0)
        w, h = layer.get("width", 100), layer.get("height", 100)
        color = self._parse_color(layer.get("color", "#00000080"))
        corner_radius = layer.get("corner_radius", 0)

        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        if corner_radius > 0:
            draw.rounded_rectangle([x, y, x + w, y + h], radius=corner_radius, fill=color)
        else:
            draw.rectangle([x, y, x + w, y + h], fill=color)

        return Image.alpha_composite(canvas, overlay)

    # ── Overlay ──

    def _render_overlay(self, canvas: Image.Image, layer: dict) -> Image.Image:
        color = self._parse_color(layer.get("color", "#00000040"))
        overlay = Image.new("RGBA", canvas.size, color)
        return Image.alpha_composite(canvas, overlay)

    # ── Font loading ──

    def _load_font(self, family: str, size: int) -> ImageFont.FreeTypeFont:
        key = (family, size)
        if key not in self._font_cache:
            path = self.fonts_dir / f"{family}.ttf"
            if path.exists():
                self._font_cache[key] = ImageFont.truetype(str(path), size)
            else:
                logger.warning("Font not found: %s, using default", path)
                self._font_cache[key] = ImageFont.load_default()
        return self._font_cache[key]

    # ── Color utilities ──

    @staticmethod
    def _parse_color(hex_str: str) -> tuple[int, ...]:
        h = hex_str.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
        elif len(h) == 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
        elif len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
        return (0, 0, 0, 255)

    @staticmethod
    def _lerp_color(c1: tuple, c2: tuple, t: float) -> tuple[int, ...]:
        return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

    @staticmethod
    def _export_png(image: Image.Image) -> bytes:
        # Flatten RGBA onto white background
        bg = Image.new("RGB", image.size, (255, 255, 255))
        bg.paste(image, mask=image.split()[3] if image.mode == "RGBA" else None)
        buf = io.BytesIO()
        bg.save(buf, format="PNG", optimize=True)
        return buf.getvalue()


image_renderer = ImageRenderer()
