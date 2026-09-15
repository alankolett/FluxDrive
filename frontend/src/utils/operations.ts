import type { FileItem } from '../types';

export interface OperationMeta {
  id: string;
  label: string;
  sourceFormat: string;
  targetFormat: string;
  desc: string;
  targetBadge: string;
}

export const OPERATION_DEFINITIONS: Record<string, OperationMeta> = {
  png_to_jpg: {
    id: 'png_to_jpg',
    sourceFormat: 'PNG',
    targetFormat: 'JPG',
    label: 'Convert PNG → JPG',
    desc: 'Flattens transparent alpha channel onto pure white background.',
    targetBadge: 'JPG',
  },
  png_to_webp: {
    id: 'png_to_webp',
    sourceFormat: 'PNG',
    targetFormat: 'WEBP',
    label: 'Convert PNG → WEBP',
    desc: 'Modern web image format with superior compression ratios.',
    targetBadge: 'WEBP',
  },
  image_to_pdf: {
    id: 'image_to_pdf',
    sourceFormat: 'IMAGE',
    targetFormat: 'PDF',
    label: 'Convert Image → PDF',
    desc: 'Encapsulates raster image into standardized, printable vector PDF.',
    targetBadge: 'PDF',
  },
  jpg_to_png: {
    id: 'jpg_to_png',
    sourceFormat: 'JPG',
    targetFormat: 'PNG',
    label: 'Convert JPG → PNG',
    desc: 'Lossless raster reproduction ideal for precision editing.',
    targetBadge: 'PNG',
  },
  jpg_to_webp: {
    id: 'jpg_to_webp',
    sourceFormat: 'JPG',
    targetFormat: 'WEBP',
    label: 'Convert JPG → WEBP',
    desc: 'Modern web format reducing footprint while preserving visual acuity.',
    targetBadge: 'WEBP',
  },
  webp_to_png: {
    id: 'webp_to_png',
    sourceFormat: 'WEBP',
    targetFormat: 'PNG',
    label: 'Convert WEBP → PNG',
    desc: 'Decodes WebP image into standard universal lossless PNG.',
    targetBadge: 'PNG',
  },
  webp_to_jpg: {
    id: 'webp_to_jpg',
    sourceFormat: 'WEBP',
    targetFormat: 'JPG',
    label: 'Convert WEBP → JPG',
    desc: 'Transforms WebP imagery into standard JPEG photographic format.',
    targetBadge: 'JPG',
  },
  pdf_to_png: {
    id: 'pdf_to_png',
    sourceFormat: 'PDF',
    targetFormat: 'PNG',
    label: 'Extract PDF → PNG',
    desc: 'Rasterizes primary document page at 150 DPI resolution.',
    targetBadge: 'PNG',
  },
  pdf_to_jpg: {
    id: 'pdf_to_jpg',
    sourceFormat: 'PDF',
    targetFormat: 'JPG',
    label: 'Extract PDF → JPG',
    desc: 'Rasterizes primary document page into JPEG image format.',
    targetBadge: 'JPG',
  },
  csv_to_json: {
    id: 'csv_to_json',
    sourceFormat: 'CSV',
    targetFormat: 'JSON',
    label: 'Convert CSV → JSON',
    desc: 'Parses tabular CSV rows into structured JSON records.',
    targetBadge: 'JSON',
  },
  json_to_csv: {
    id: 'json_to_csv',
    sourceFormat: 'JSON',
    targetFormat: 'CSV',
    label: 'Convert JSON → CSV',
    desc: 'Flattens structured JSON objects into tabular CSV rows.',
    targetBadge: 'CSV',
  },
  docx_to_pdf: {
    id: 'docx_to_pdf',
    sourceFormat: 'DOCX',
    targetFormat: 'PDF',
    label: 'Convert DOCX → PDF',
    desc: 'Compiles Microsoft Word document into clean vector PDF.',
    targetBadge: 'PDF',
  },
  compress_image: {
    id: 'compress_image',
    sourceFormat: 'IMAGE',
    targetFormat: 'COMPRESS',
    label: 'Optimize File (Lossless)',
    desc: 'Minimizes byte overhead while strictly preserving native resolution.',
    targetBadge: 'OPTIMIZED',
  },
  strip_metadata: {
    id: 'strip_metadata',
    sourceFormat: 'METADATA',
    targetFormat: 'CLEAN',
    label: 'Sanitize Metadata (EXIF)',
    desc: 'Forensically scrubs GPS coordinates, camera model, and owner tags.',
    targetBadge: 'SANITIZED',
  },
};

/**
 * Returns strictly valid, supported operations for a given file item,
 * matching actual detected MIME/extension and avoiding invalid self-conversions.
 */
export function getOperationsForFile(file: FileItem | null | undefined): OperationMeta[] {
  if (!file) return [];

  const mime = (file.mime_type || '').toLowerCase();
  const ext = (file.detected_ext || file.filename?.split('.').pop() || '').toLowerCase();

  let validOpIds: string[] = [];

  if (mime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
    validOpIds = ['jpg_to_png', 'jpg_to_webp', 'image_to_pdf', 'compress_image', 'strip_metadata'];
  } else if (mime === 'image/png' || ext === 'png') {
    validOpIds = ['png_to_jpg', 'png_to_webp', 'image_to_pdf', 'compress_image', 'strip_metadata'];
  } else if (mime === 'image/webp' || ext === 'webp') {
    validOpIds = ['webp_to_png', 'webp_to_jpg', 'image_to_pdf', 'compress_image', 'strip_metadata'];
  } else if (mime === 'application/pdf' || ext === 'pdf') {
    validOpIds = ['pdf_to_png', 'pdf_to_jpg'];
  } else if (mime === 'text/csv' || ext === 'csv') {
    validOpIds = ['csv_to_json'];
  } else if (mime === 'application/json' || ext === 'json') {
    validOpIds = ['json_to_csv'];
  } else if (mime.includes('wordprocessingml') || ext === 'docx') {
    validOpIds = ['docx_to_pdf'];
  } else {
    // If backend provided allowed_operations, use those if they match definitions
    if (Array.isArray(file.allowed_operations) && file.allowed_operations.length > 0) {
      validOpIds = file.allowed_operations;
    }
  }

  // Format custom label if needed based on input extension
  const inputBadge = (ext === 'jpeg' ? 'JPG' : ext).toUpperCase();

  return validOpIds
    .map(opId => {
      const def = OPERATION_DEFINITIONS[opId];
      if (!def) return null;

      // Adjust label dynamically so it accurately shows: Convert <CURRENT_EXT> → <TARGET>
      let cleanLabel = def.label;
      if (opId === 'compress_image') {
        cleanLabel = `Optimize ${inputBadge} (Lossless)`;
      } else if (opId === 'strip_metadata') {
        cleanLabel = `Sanitize ${inputBadge} (Strip EXIF)`;
      } else if (opId.includes('_to_')) {
        const parts = opId.split('_to_');
        const target = parts[1].toUpperCase();
        cleanLabel = `Convert ${inputBadge} → ${target}`;
      }

      return {
        ...def,
        label: cleanLabel,
      };
    })
    .filter((op): op is OperationMeta => op !== null);
}
