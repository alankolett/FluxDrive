from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image, ExifTags
import piexif

def extract_exif(image_path: Path) -> Dict[str, Any]:
    """
    Parses EXIF and metadata from an image file using Pillow and piexif.
    Surfaces GPS coordinates, camera/device make + model, timestamps, software, and raw tags.
    """
    metadata: Dict[str, Any] = {
        "has_exif": False,
        "device_make": None,
        "device_model": None,
        "date_time": None,
        "software": None,
        "gps": None,
        "raw_fields": {}
    }
    
    try:
        with Image.open(image_path) as img:
            raw_exif = img.getexif()
            if not raw_exif:
                return metadata
                
            metadata["has_exif"] = True
            
            for tag_id, value in raw_exif.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                
                # Make & Model
                if tag_name == "Make":
                    metadata["device_make"] = str(value).strip()
                elif tag_name == "Model":
                    metadata["device_model"] = str(value).strip()
                elif tag_name in ["DateTime", "DateTimeOriginal"]:
                    metadata["date_time"] = str(value).strip()
                elif tag_name == "Software":
                    metadata["software"] = str(value).strip()
                    
                # Format value for display
                display_val = str(value)
                if len(display_val) > 60:
                    display_val = display_val[:57] + "..."
                metadata["raw_fields"][tag_name] = display_val
                
            # Check GPS IFD if available
            try:
                gps_ifd = raw_exif.get_ifd(ExifTags.IFD.GPSInfo)
                if gps_ifd:
                    gps_data = {}
                    for g_tag, g_val in gps_ifd.items():
                        g_name = ExifTags.GPSTAGS.get(g_tag, str(g_tag))
                        gps_data[g_name] = str(g_val)
                    if gps_data:
                        metadata["gps"] = gps_data
                        metadata["raw_fields"]["GPSInfo"] = f"{len(gps_data)} GPS coordinate attributes"
            except Exception:
                pass
    except Exception:
        pass
        
    return metadata

def strip_exif_to_file(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """
    Strips EXIF, ICC profiles, and comments, writing a truly sanitized output file.
    Returns the diff of removed fields.
    """
    before_meta = extract_exif(input_path)
    
    with Image.open(input_path) as img:
        # Create a new pristine image without any EXIF or metadata info dict
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)
        
        # Save according to target format
        fmt = img.format if img.format else "PNG"
        if fmt.upper() in ["JPG", "JPEG"]:
            clean_img = clean_img.convert("RGB")
            clean_img.save(output_path, "JPEG", quality=95)
        else:
            clean_img.save(output_path, format=fmt)
            
    after_meta = extract_exif(output_path)
    
    removed_fields = [k for k in before_meta["raw_fields"].keys() if k not in after_meta["raw_fields"]]
    
    return {
        "fields_removed_count": len(removed_fields),
        "removed_fields": removed_fields,
        "had_gps_removed": before_meta["gps"] is not None,
        "had_device_removed": (before_meta["device_make"] is not None or before_meta["device_model"] is not None),
        "before_metadata": before_meta,
        "after_metadata": after_meta
    }
