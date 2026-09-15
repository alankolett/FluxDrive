import os
import re
from typing import Dict, Any, Optional
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from ..db import get_db
from ..config import GEMINI_API_KEY, GROK_API_KEY, DEFAULT_GROK_MODEL
from ..services.scanner import extract_text_from_file, scan_text_for_pii, sanitize_text
from ..services.matrix import get_operations_for_mime
import requests

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

class SmartConvertIntentRequest(BaseModel):
    file_id: str
    intent: str  # "make_smaller", "create_pdf", "change_format", "protect_file", "extract_data", "analyze_file"

class CopilotPreviewRequest(BaseModel):
    file_id: str

class CopilotQueryRequest(BaseModel):
    file_id: str
    user_consented: bool = False
    question: Optional[str] = "Summarize this document and recommend next steps"
    grok_api_key: Optional[str] = None
    model: Optional[str] = None

@router.post("/intent-route")
async def route_smart_convert_intent(req: SmartConvertIntentRequest):
    """
    Deterministic intent router for Smart Convert without AI dependencies.
    Resolves user intent directly into valid executable pipeline actions.
    """
    db = get_db()
    f = db.files.find_one({"file_id": req.file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    mime = f.get("mime_type", "")
    intent = req.intent.lower().replace(" ", "_")
    
    # Deterministic mapping table
    if intent == "make_smaller":
        if mime.startswith("image/"):
            return {
                "intent": "make_smaller",
                "recommended_operation": "compress_image",
                "label": "Compress Image (Real Disk Size Reduction)",
                "options": {"quality": 65},
                "explanation": "Applies lossy/lossless stream optimization to reduce file footprint without perceptual fidelity loss."
            }
        else:
            return {
                "intent": "make_smaller",
                "recommended_operation": None,
                "label": "Direct compression not supported for this format",
                "explanation": f"Format {mime} does not have a dedicated compression pipeline in the §3 matrix."
            }

    elif intent == "create_pdf":
        if mime.startswith("image/"):
            return {
                "intent": "create_pdf",
                "recommended_operation": "image_to_pdf",
                "label": "Convert Image to Standard PDF",
                "options": {},
                "explanation": "Wraps high-fidelity raster data into a standardized PDF container."
            }
        elif mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return {
                "intent": "create_pdf",
                "recommended_operation": "docx_to_pdf",
                "label": "Render DOCX to Clean PDF",
                "options": {},
                "explanation": "Parses document typography and tables to construct a standalone PDF."
            }
        else:
            return {
                "intent": "create_pdf",
                "recommended_operation": None,
                "label": "Format already PDF or incompatible",
                "explanation": "File is either already PDF or cannot be rendered into a PDF document."
            }

    elif intent == "change_format":
        ops = get_operations_for_mime(mime)
        format_ops = [op for op in ops if op["category"] == "Format"]
        return {
            "intent": "change_format",
            "available_options": format_ops,
            "explanation": f"Detected {len(format_ops)} validated conversion paths for {f.get('filename')}."
        }

    elif intent == "protect_file":
        if mime.startswith("image/"):
            return {
                "intent": "protect_file",
                "recommended_operation": "strip_metadata",
                "label": "Strip Metadata / EXIF Sanitization",
                "options": {},
                "preset": "maximum",
                "explanation": "Purges GPS tags, device identifiers, and embedded hardware signatures."
            }
        else:
            return {
                "intent": "protect_file",
                "preset": "maximum",
                "label": "Apply Maximum Privacy Preset",
                "explanation": "Enforces shortest TTL, disables all AI routing, and runs automated PII masking."
            }

    elif intent == "extract_data":
        if mime == "text/csv":
            return {
                "intent": "extract_data",
                "recommended_operation": "csv_to_json",
                "label": "Convert CSV Table to Structured JSON",
                "options": {},
                "explanation": "Serializes tabular records into portable JSON key-value array."
            }
        elif mime == "application/json":
            return {
                "intent": "extract_data",
                "recommended_operation": "json_to_csv",
                "label": "Flatten JSON to Relational CSV",
                "options": {},
                "explanation": "Normalizes nested JSON structures into standard comma-separated columns."
            }
        elif mime == "application/pdf":
            return {
                "intent": "extract_data",
                "recommended_operation": "pdf_to_png",
                "label": "Extract First Page Visual",
                "options": {},
                "explanation": "Renders visual vector layers into raster image representation."
            }

    # Fallback / Analyze file
    return {
        "intent": "analyze_file",
        "recommended_operation": None,
        "filename": f.get("filename"),
        "pii_findings": f.get("pii_count", 0),
        "has_exif": f.get("has_exif", False),
        "explanation": f"File analysis completed: {f.get('size_bytes')} bytes, format {mime}."
    }

@router.post("/preview-sanitized")
async def preview_sanitized_payload(req: CopilotPreviewRequest):
    """
    AI Privacy Firewall preview endpoint.
    Extracts text, strips all PII and sensitive identifiers, and displays the exact payload
    that would be transmitted to an external LLM.
    """
    db = get_db()
    f = db.files.find_one({"file_id": req.file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    stored_path = Path(f["stored_path"])
    raw_text = extract_text_from_file(stored_path, f.get("mime_type", ""))
    
    sanitized_content, masked_count = sanitize_text(raw_text)
    
    # Truncate preview if very long
    preview_snippet = sanitized_content[:4000]

    return {
        "raw_file_excluded": True,
        "exif_excluded": True,
        "detected_pii_masked": True,
        "internal_file_identifiers_excluded": True,
        "masked_field_count": masked_count,
        "sanitized_payload_preview": preview_snippet,
        "total_characters": len(sanitized_content),
        "filename": f.get("filename")
    }

@router.post("/query")
async def copilot_query(req: CopilotQueryRequest):
    """
    AI Copilot query endpoint.
    Strictly checks user opt-in consent. If consent is missing, rejects.
    If GEMINI_API_KEY is available and configured, calls the model with sanitized text only.
    Otherwise, returns honest, deterministic rule-based output.
    """
    db = get_db()
    f = db.files.find_one({"file_id": req.file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    # Strict server-enforced consent gate
    if not req.user_consented:
        raise HTTPException(
            status_code=403,
            detail="AI Privacy Firewall violation: Explicit user consent is required before processing."
        )

    stored_path = Path(f["stored_path"])
    raw_text = extract_text_from_file(stored_path, f.get("mime_type", ""))
    sanitized_text, masked_count = sanitize_text(raw_text)

    # 1. Deterministic Rule-Based Fallback data
    rule_based_analysis = {
        "source": "Rule-based suggestion — AI disabled.",
        "file_purpose": f"Document of type '{f.get('mime_type')}' with {f.get('size_bytes')} bytes.",
        "pii_summary": f"{masked_count} sensitive fields identified and masked by Privacy Scanner.",
        "recommended_action": "Review Security Passport before exporting or sharing.",
        "text_summary": f"Extracted {len(sanitized_text.split())} words. " + (sanitized_text[:280] + "..." if len(sanitized_text) > 280 else sanitized_text)
    }

    # 2. Try xAI Grok API (Primary)
    effective_grok_key = (req.grok_api_key or "").strip() or GROK_API_KEY
    if effective_grok_key:
        target_model = req.model or DEFAULT_GROK_MODEL or "grok-2-latest"
        try:
            grok_headers = {
                "Authorization": f"Bearer {effective_grok_key}",
                "Content-Type": "application/json"
            }
            grok_payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are FluxDrive AI Copilot, a privacy-first intelligent document workstation assistant. "
                            "You analyze documents whose sensitive data has already been scrubbed by the AI Privacy Firewall. "
                            "Provide crisp, high-level analysis, key findings, and actionable recommendations for conversion or privacy."
                        )
                    },
                    {
                        "role": "user",
                        "content": (
                            f"File: {f.get('filename')}\n"
                            f"Type: {f.get('mime_type')}\n"
                            f"Size: {f.get('size_bytes')} bytes\n\n"
                            f"Sanitized Document Content:\n{sanitized_text[:7000] if sanitized_text else '(No text content extracted from file)'}\n\n"
                            f"User Request: {req.question}"
                        )
                    }
                ],
                "model": target_model,
                "temperature": 0.3,
                "stream": False
            }

            resp = requests.post(
                "https://api.x.ai/v1/chat/completions",
                headers=grok_headers,
                json=grok_payload,
                timeout=35
            )

            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    content = choices[0]["message"].get("content", "")
                    return {
                        "source": f"xAI Grok ({target_model}) · Privacy-Filtered",
                        "copilot_response": content,
                        "masked_fields_count": masked_count
                    }
            elif resp.status_code in [401, 403]:
                return {
                    "source": "xAI Grok Authentication",
                    "copilot_response": "⚠️ Invalid xAI Grok API Key. Please verify your API key in Settings (⚙️) or pass a valid key starting with 'xai-'.",
                    "masked_fields_count": masked_count
                }
            else:
                err_detail = resp.text[:200]
                # If model grok-2-latest failed, try fallback to grok-beta
                if target_model != "grok-beta":
                    grok_payload["model"] = "grok-beta"
                    fallback_resp = requests.post(
                        "https://api.x.ai/v1/chat/completions",
                        headers=grok_headers,
                        json=grok_payload,
                        timeout=35
                    )
                    if fallback_resp.status_code == 200:
                        fb_data = fallback_resp.json()
                        choices = fb_data.get("choices", [])
                        if choices and "message" in choices[0]:
                            content = choices[0]["message"].get("content", "")
                            return {
                                "source": "xAI Grok (grok-beta) · Privacy-Filtered",
                                "copilot_response": content,
                                "masked_fields_count": masked_count
                            }
                return {
                    "source": f"xAI Grok API ({resp.status_code})",
                    "copilot_response": f"Grok API returned error status {resp.status_code}: {err_detail}",
                    "masked_fields_count": masked_count
                }
        except requests.exceptions.Timeout:
            return {
                "source": "xAI Grok Timeout",
                "copilot_response": "Request to xAI Grok API timed out after 35s. Please retry your question.",
                "masked_fields_count": masked_count
            }
        except Exception as e:
            # Fall back to Gemini or Rule-based
            pass

    # 3. Try Gemini API if key is present
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = (
                f"You are FluxDrive AI Copilot. Analyze this sanitized document text:\n\n"
                f"{sanitized_text[:3000]}\n\n"
                f"User question: {req.question}\n"
                f"Provide:\n"
                f"1. Likely file purpose\n"
                f"2. Plain language explanation\n"
                f"3. Recommended conversion or privacy action\n"
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response and response.text:
                return {
                    "source": "Gemini 2.5 Flash (Privacy-Filtered)",
                    "copilot_response": response.text,
                    "masked_fields_count": masked_count
                }
        except Exception as e:
            pass

    return {
        "source": "Local Rule Engine (xAI Grok Not Configured)",
        "copilot_response": (
            f"**File Assessment:** {rule_based_analysis['file_purpose']}\n\n"
            f"**Privacy Overview:** {rule_based_analysis['pii_summary']}\n\n"
            f"**Content Snippet:**\n> {rule_based_analysis['text_summary']}\n\n"
            f"**Recommendation:** {rule_based_analysis['recommended_action']}\n\n"
            f"💡 *To activate live Grok intelligence, enter your xAI Grok API key in Settings (⚙️) or in the key input above.*"
        ),
        "masked_fields_count": masked_count
    }
