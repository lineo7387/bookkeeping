from abc import ABC, abstractmethod


class OcrProvider(ABC):
    """Abstract interface for OCR text extraction from images."""

    @abstractmethod
    async def extract_text(self, image_bytes: bytes, mime_type: str) -> list[str]:
        """Extract text blocks from an image.

        Args:
            image_bytes: Raw image file bytes.
            mime_type: MIME type of the image (image/jpeg, image/png, image/webp).

        Returns:
            List of non-empty text lines extracted from the image.
        """
        ...
