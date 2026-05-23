import io
import logging

import pytesseract
from PIL import Image

from app.providers.ocr_provider import OcrProvider

logger = logging.getLogger(__name__)


class TesseractProvider(OcrProvider):
    """OCR provider using local Tesseract engine."""

    def __init__(self, lang: str = "chi_sim+eng") -> None:
        self.lang = lang

    async def extract_text(self, image_bytes: bytes, mime_type: str) -> list[str]:
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception:
            logger.warning("Failed to open image, mime_type=%s", mime_type)
            return []

        try:
            raw_text: str = pytesseract.image_to_string(image, lang=self.lang)
        except Exception:
            logger.exception("Tesseract OCR failed")
            return []

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        return lines
