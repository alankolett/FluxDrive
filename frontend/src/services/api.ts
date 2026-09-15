import type {
  FileItem,
  JobItem,
  SecurityPassportData,
  PrivacyScanData,
  ExifData,
  ExifStripResult,
  SanitizedPreviewData,
  CopilotResponseData,
  PrivacyPreset
} from '../types';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('fluxdrive_api_url');
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim().replace(/\/$/, '');
    }
  }
  return '';
};

export const getApiBase = (): string => {
  const base = getBaseUrl();
  return base ? `${base}/api` : '/api';
};

export const getFullDownloadUrl = (url: string | undefined): string => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getBaseUrl();
  return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
};

export const api = {
  async uploadFile(file: File, preset: PrivacyPreset = 'standard'): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('privacy_preset', preset);

    const res = await fetch(`${getApiBase()}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'File upload failed' }));
      throw new Error(err.detail || 'File upload failed');
    }
    return res.json();
  },

  async listVaultFiles(): Promise<FileItem[]> {
    const res = await fetch(`${getApiBase()}/files`);
    if (!res.ok) throw new Error('Failed to load Vault files');
    return res.json();
  },

  async getFile(fileId: string): Promise<FileItem> {
    const res = await fetch(`${getApiBase()}/files/${fileId}`);
    if (!res.ok) throw new Error('File not found');
    return res.json();
  },

  async destroyFile(fileId: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/files/${fileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to destroy file');
  },

  async createJob(
    fileIds: string[],
    operation: string,
    preset: PrivacyPreset = 'standard',
    options: Record<string, any> = {}
  ): Promise<JobItem> {
    const res = await fetch(`${getApiBase()}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_ids: fileIds,
        operation,
        privacy_preset: preset,
        options,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create conversion job' }));
      throw new Error(err.detail || 'Conversion job rejected');
    }
    return res.json();
  },

  async getJob(jobId: string): Promise<JobItem> {
    const res = await fetch(`${getApiBase()}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Job not found');
    return res.json();
  },

  async listJobs(): Promise<JobItem[]> {
    const res = await fetch(`${getApiBase()}/jobs`);
    if (!res.ok) throw new Error('Failed to load activity jobs');
    return res.json();
  },

  async getSecurityPassport(id: string): Promise<SecurityPassportData> {
    const res = await fetch(`${getApiBase()}/passport/${id}`);
    if (!res.ok) throw new Error('Security Passport not found');
    return res.json();
  },

  async getPrivacyScan(fileId: string): Promise<PrivacyScanData> {
    const res = await fetch(`${getApiBase()}/privacy/scan/${fileId}`);
    if (!res.ok) throw new Error('Privacy scan failed');
    return res.json();
  },

  async getExifData(fileId: string): Promise<ExifData> {
    const res = await fetch(`${getApiBase()}/privacy/exif/${fileId}`);
    if (!res.ok) throw new Error('Failed to extract EXIF data');
    return res.json();
  },

  async stripExif(fileId: string): Promise<ExifStripResult> {
    const res = await fetch(`${getApiBase()}/privacy/strip-exif/${fileId}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to strip metadata');
    return res.json();
  },

  async previewSanitized(fileId: string): Promise<SanitizedPreviewData> {
    const res = await fetch(`${getApiBase()}/copilot/preview-sanitized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!res.ok) throw new Error('Failed to generate sanitized preview');
    return res.json();
  },

  async queryCopilot(
    fileId: string,
    userConsented: boolean,
    question?: string,
    grokApiKey?: string,
    model?: string
  ): Promise<CopilotResponseData> {
    const res = await fetch(`${getApiBase()}/copilot/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        user_consented: userConsented,
        question: question || 'Summarize this document and recommend next steps',
        grok_api_key: grokApiKey || undefined,
        model: model || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Copilot query failed' }));
      throw new Error(err.detail || 'Copilot query failed');
    }
    return res.json();
  },

  async routeIntent(fileId: string, intent: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/copilot/intent-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, intent }),
    });
    if (!res.ok) throw new Error('Failed to route intent');
    return res.json();
  },

  async checkHealth(): Promise<any> {
    const res = await fetch(`${getApiBase()}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },
};
