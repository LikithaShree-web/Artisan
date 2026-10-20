import argparse
import json
import os
from pathlib import Path

import joblib
import numpy as np
import torch
from PIL import Image, ImageOps
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from transformers import CLIPModel, CLIPProcessor


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MODEL_ID = os.getenv("AI_MODEL_ID", "openai/clip-vit-base-patch32")


def main():
    parser = argparse.ArgumentParser(description="Train a linear classifier on pretrained CLIP image embeddings.")
    parser.add_argument("--data-dir", required=True, help="Images in one directory per category label.")
    parser.add_argument("--artifact-dir", default=".models")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    classes = sorted(path for path in data_dir.iterdir() if path.is_dir())
    image_paths = [(image, category.name) for category in classes for image in category.iterdir() if image.suffix.lower() in IMAGE_EXTENSIONS]
    labels = sorted({label for _, label in image_paths})
    counts = {label: sum(item_label == label for _, item_label in image_paths) for label in labels}
    if len(labels) < 2 or min(counts.values(), default=0) < 5:
        raise SystemExit("Stratified 80/20 evaluation needs at least two categories and five valid images per category.")

    processor = CLIPProcessor.from_pretrained(MODEL_ID)
    model = CLIPModel.from_pretrained(MODEL_ID).eval()
    features = []
    targets = []
    for path, label in image_paths:
        with Image.open(path) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
        inputs = processor(images=image, return_tensors="pt")
        with torch.inference_mode():
            features.append(model.get_image_features(**inputs).squeeze(0).cpu().numpy())
        targets.append(label)

    x_train, x_test, y_train, y_test = train_test_split(
        np.asarray(features), np.asarray(targets), test_size=0.2, random_state=42, stratify=targets
    )
    classifier = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)
    classifier.fit(x_train, y_train)
    predictions = classifier.predict(x_test)
    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)

    artifact_dir = Path(args.artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, artifact_dir / "classifier.joblib")
    metadata = {
        "model_id": MODEL_ID,
        "labels": classifier.classes_.tolist(),
        "training_status": "trained",
        "sample_counts": counts,
        "split": {"train": len(y_train), "test": len(y_test), "random_state": 42},
        "metrics": {
            "accuracy": accuracy_score(y_test, predictions),
            "macro_precision": report["macro avg"]["precision"],
            "macro_recall": report["macro avg"]["recall"],
            "macro_f1": report["macro avg"]["f1-score"],
            "per_class": {label: report[label] for label in classifier.classes_},
        },
    }
    (artifact_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
