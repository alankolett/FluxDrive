from typing import List, Dict, Any

SUPPORTED_OPERATIONS: Dict[str, List[Dict[str, str]]] = {
    "image/png": [
        {"id": "png_to_jpg", "label": "Convert to JPG", "target_ext": "jpg", "category": "Format"},
        {"id": "png_to_webp", "label": "Convert to WEBP", "target_ext": "webp", "category": "Format"},
        {"id": "image_to_pdf", "label": "Convert to PDF", "target_ext": "pdf", "category": "Format"},
        {"id": "compress_image", "label": "Compress Image (Reduce Size)", "target_ext": "png", "category": "Optimize"},
        {"id": "strip_metadata", "label": "Strip Metadata / EXIF", "target_ext": "png", "category": "Privacy"},
    ],
    "image/jpeg": [
        {"id": "jpg_to_png", "label": "Convert to PNG", "target_ext": "png", "category": "Format"},
        {"id": "jpg_to_webp", "label": "Convert to WEBP", "target_ext": "webp", "category": "Format"},
        {"id": "image_to_pdf", "label": "Convert to PDF", "target_ext": "pdf", "category": "Format"},
        {"id": "compress_image", "label": "Compress Image (Reduce Size)", "target_ext": "jpg", "category": "Optimize"},
        {"id": "strip_metadata", "label": "Strip Metadata / EXIF", "target_ext": "jpg", "category": "Privacy"},
    ],
    "image/webp": [
        {"id": "webp_to_png", "label": "Convert to PNG", "target_ext": "png", "category": "Format"},
        {"id": "webp_to_jpg", "label": "Convert to JPG", "target_ext": "jpg", "category": "Format"},
        {"id": "image_to_pdf", "label": "Convert to PDF", "target_ext": "pdf", "category": "Format"},
        {"id": "compress_image", "label": "Compress Image (Reduce Size)", "target_ext": "webp", "category": "Optimize"},
        {"id": "strip_metadata", "label": "Strip Metadata / EXIF", "target_ext": "webp", "category": "Privacy"},
    ],
    "application/pdf": [
        {"id": "pdf_to_png", "label": "Extract First Page to PNG", "target_ext": "png", "category": "Extract"},
        {"id": "pdf_to_jpg", "label": "Extract First Page to JPG", "target_ext": "jpg", "category": "Extract"},
    ],
    "text/csv": [
        {"id": "csv_to_json", "label": "Convert Table to JSON", "target_ext": "json", "category": "Data"},
    ],
    "application/json": [
        {"id": "json_to_csv", "label": "Flatten JSON to CSV Table", "target_ext": "csv", "category": "Data"},
    ],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        {"id": "docx_to_pdf", "label": "Convert DOCX to Clean PDF", "target_ext": "pdf", "category": "Document"},
    ]
}

def get_operations_for_mime(mime: str) -> List[Dict[str, str]]:
    return SUPPORTED_OPERATIONS.get(mime, [])

def get_batch_operations(mimes: List[str]) -> List[Dict[str, str]]:
    image_mimes = {"image/png", "image/jpeg", "image/webp"}
    if len(mimes) > 1 and all(m in image_mimes for m in mimes):
        return [
            {
                "id": "batch_to_pdf",
                "label": f"Combine {len(mimes)} Images into Multi-Page PDF",
                "target_ext": "pdf",
                "category": "Batch"
            }
        ]
    return []
