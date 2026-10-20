import os
from pathlib import Path
from typing import Any, Dict

import torch
from transformers import CLIPModel, CLIPProcessor
from PIL import Image


LABELS = [
    "pottery and ceramics",
    "handmade jewellery",
    "textiles and clothing",
    "bamboo and cane crafts",
    "woodwork",
    "paintings and artwork",
    "home decor",
    "other handmade crafts",
]
PROMPTS = [f"a clear product photo of {label} made by an artisan" for label in LABELS]
_model = None
_processor = None


def _load_model():
    global _model, _processor
    if _model is not None and _processor is not None:
        return _model, _processor
    model_id = os.getenv("AI_MODEL_ID", "openai/clip-vit-base-patch32")
    try:
        _processor = CLIPProcessor.from_pretrained(model_id)
        _model = CLIPModel.from_pretrained(model_id)
        _model.eval()
    except (OSError, ValueError) as error:
        _model = None
        _processor = None
        raise RuntimeError(
            "The pretrained image model is unavailable. Check network access or the local model cache."
        ) from error
    return _model, _processor


def predict_category(image: Image.Image) -> Dict[str, Any]:
    model, processor = _load_model()
    artifact_dir = Path(os.getenv("AI_ARTIFACT_DIR", ".models"))
    trained_path = artifact_dir / "classifier.joblib"
    metadata_path = artifact_dir / "metadata.json"

    if trained_path.exists() and metadata_path.exists():
        return _predict_custom(model, processor, image, trained_path, metadata_path)

    inputs = processor(text=PROMPTS, images=image, return_tensors="pt", padding=True)
    with torch.inference_mode():
        outputs = model(**inputs)
        scores = outputs.logits_per_image[0].softmax(dim=0)
    best = scores.topk(min(3, len(LABELS)))
    return {
        "category": LABELS[int(best.indices[0])],
        "confidence": round(float(best.values[0]), 4),
        "alternatives": [
            {"category": LABELS[int(index)], "score": round(float(score), 4)}
            for score, index in zip(best.values[1:], best.indices[1:])
        ],
        "method": "zero_shot_pretrained",
        "training_status": "No project-specific training data was found; using pretrained CLIP zero-shot labels.",
    }


def _predict_custom(
    model: Any,
    processor: Any,
    image: Image.Image,
    classifier_path: Path,
    metadata_path: Path,
) -> Dict[str, Any]:
    import json
    import joblib

    with metadata_path.open(encoding="utf-8") as handle:
        metadata = json.load(handle)
    classifier = joblib.load(classifier_path)
    inputs = processor(images=image, return_tensors="pt")
    with torch.inference_mode():
        embeddings = model.get_image_features(**inputs).cpu().numpy()
    probabilities = classifier.predict_proba(embeddings)[0]
    order = probabilities.argsort()[::-1][:3]
    labels = metadata["labels"]
    return {
        "category": labels[int(order[0])],
        "confidence": round(float(probabilities[order[0]]), 4),
        "alternatives": [
            {"category": labels[int(index)], "score": round(float(probabilities[index]), 4)}
            for index in order[1:]
        ],
        "method": "fine_tuned_linear_probe",
        "training_status": metadata.get("training_status", "trained"),
    }
