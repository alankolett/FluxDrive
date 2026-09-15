/**
 * Utilities for formatting display strings across FluxDrive
 */

export function cleanFilename(filename: string | undefined | null): string {
  if (!filename) return 'document';

  // 1. Check if the filename starts with UUID pattern: "8-4-4-4-12_"
  const uuidPrefixRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.*)$/i;
  const match = filename.match(uuidPrefixRegex);
  if (match && match[1]) {
    const remainder = match[1];
    // If remainder is just an internal operation suffix like "png_to_jpg.jpg" or "jpg_to_png.png"
    if (remainder.includes('_to_') || remainder.startsWith('compress_') || remainder.startsWith('strip_')) {
      const parts = remainder.split('_');
      // If there was a preceding stem before the operation, e.g. "myreport_csv_to_json.json"
      if (parts.length > 2 && !['png', 'jpg', 'jpeg', 'webp', 'pdf', 'csv', 'json', 'compress', 'strip'].includes(parts[0].toLowerCase())) {
        const ext = remainder.split('.').pop() || 'dat';
        return `${parts[0]}.${ext}`;
      }
      const ext = remainder.split('.').pop() || 'jpg';
      return `file.${ext}`;
    }
    return remainder;
  }

  // 2. Check for "out_job_..._file.ext"
  const jobPrefixRegex = /^out_job_[0-9a-f]+_(.*)$/i;
  const jobMatch = filename.match(jobPrefixRegex);
  if (jobMatch && jobMatch[1]) {
    return cleanFilename(jobMatch[1]);
  }

  // 3. If raw UUID or job string like "out_job_8bbbbafede02"
  if (filename.startsWith('out_job_') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(filename)) {
    const ext = filename.split('.').pop();
    if (ext && ext !== filename && ext.length <= 4) {
      return `document.${ext}`;
    }
    return 'document.jpg';
  }

  return filename;
}

export function getDistinctFilename(
  file: { file_id?: string; filename?: string; is_output?: boolean },
  allFiles: { file_id?: string; filename?: string }[] = []
): string {
  const baseName = cleanFilename(file.filename);
  if (!allFiles || allFiles.length <= 1) return baseName;

  // Find all files in the collection that share this cleaned base name
  const matches = allFiles.filter((f) => cleanFilename(f.filename) === baseName);
  if (matches.length <= 1) return baseName;

  // Append sequential index if there are collisions
  const index = matches.findIndex((f) => f.file_id === file.file_id);
  if (index > 0) {
    const dotIdx = baseName.lastIndexOf('.');
    if (dotIdx > 0) {
      return `${baseName.substring(0, dotIdx)} (${index + 1})${baseName.substring(dotIdx)}`;
    }
    return `${baseName} (${index + 1})`;
  }
  return baseName;
}

export function formatOperationName(op: string | undefined | null): string {
  if (!op) return 'TRANSFORM';
  const mapping: Record<string, string> = {
    png_to_jpg: 'PNG → JPG',
    png_to_webp: 'PNG → WEBP',
    image_to_pdf: 'IMG → PDF',
    jpg_to_png: 'JPG → PNG',
    jpg_to_webp: 'JPG → WEBP',
    webp_to_png: 'WEBP → PNG',
    webp_to_jpg: 'WEBP → JPG',
    pdf_to_png: 'PDF → PNG',
    pdf_to_jpg: 'PDF → JPG',
    csv_to_json: 'CSV → JSON',
    json_to_csv: 'JSON → CSV',
    docx_to_pdf: 'DOCX → PDF',
    batch_to_pdf: 'BATCH → PDF',
    compress_image: 'COMPRESS',
    strip_metadata: 'EXIF SANITIZE',
  };
  return mapping[op] || op.replace(/_/g, ' ').toUpperCase();
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatTtl(expiresAt: number, nowMs: number = Date.now()): { timeStr: string; remainingSeconds: number } {
  const remainingSeconds = Math.max(0, Math.floor(expiresAt - nowMs / 1000));
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  return {
    timeStr: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    remainingSeconds,
  };
}
