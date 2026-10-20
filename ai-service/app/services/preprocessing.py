import warnings
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError


def preprocess_image(raw: bytes) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                if source.width * source.height > 20_000_000:
                    raise ValueError("Image dimensions exceed the 20-megapixel limit.")
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((1024, 1024))
                return image.copy()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise ValueError("The uploaded file is not a valid image.") from error
