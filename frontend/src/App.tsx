import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ConversionPanel } from './components/ConversionPanel';
import { SmartConvertModal } from './components/SmartConvertModal';
import { SecurityPassportModal } from './components/SecurityPassportModal';
import { VaultView } from './components/VaultView';
import { ActivityView } from './components/ActivityView';
import { PrivacyScannerView } from './components/PrivacyScannerView';
import { CopilotView } from './components/CopilotView';
import { PrivacyCenterView } from './components/PrivacyCenterView';
import { SettingsModal } from './components/SettingsModal';
import type { FileItem, JobItem, PrivacyPreset, SecurityPassportData } from './types';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [preset, setPreset] = useState<PrivacyPreset>('standard');
  const [aiMode, setAiMode] = useState<'local' | 'privacy_filtered'>('privacy_filtered');

  // File and Job State
  const [stagedFiles, setStagedFiles] = useState<FileItem[]>([]);
  const [vaultFiles, setVaultFiles] = useState<FileItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobItem[]>([]);
  const [activeFileForInspection, setActiveFileForInspection] = useState<FileItem | null>(null);

  // Modals
  const [showSmartConvert, setShowSmartConvert] = useState(false);
  const [passportData, setPassportData] = useState<SecurityPassportData | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Status & Telemetry
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Load Vault and Health Data
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [files, jobs, health] = await Promise.all([
        api.listVaultFiles().catch(() => []),
        api.listJobs().catch(() => []),
        api.checkHealth().catch(() => null),
      ]);
      setVaultFiles(files);
      setRecentJobs(jobs);
      setSystemHealth(health);
      setBackendHealthy(health !== null);
    } catch (err) {
      console.error(err);
      setBackendHealthy(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 6000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Handle File Uploads (Supports single and multiple for batch-to-pdf)
  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    const uploadedList: FileItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Uploading ${i + 1} of ${files.length}: ${files[i].name}...`);
        const item = await api.uploadFile(files[i], preset);
        uploadedList.push(item);
      }

      setStagedFiles(uploadedList);
      setActiveFileForInspection(uploadedList[0]);
      setCurrentView('converter');
      refreshAll();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Open Security Passport
  const handleOpenPassport = async (id: string) => {
    try {
      const p = await api.getSecurityPassport(id);
      setPassportData(p);
    } catch (err: any) {
      alert(`Could not load Security Passport: ${err.message}`);
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'converter': return 'Converter';
      case 'vault': return 'Vault';
      case 'activity': return 'Activity';
      case 'copilot': return 'AI Copilot';
      case 'scanner': return 'Privacy Scanner';
      case 'passport': return 'Security Passport';
      case 'privacy_center': return 'Privacy Center';
      case 'settings': return 'Settings';
      default: return 'FluxDrive';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F7F7F5] text-[#141413] overflow-hidden font-sans select-text">
      {/* Persistent Collapsible Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          if (v === 'settings') {
            setShowSettings(true);
          } else {
            setCurrentView(v);
          }
        }}
        vaultCount={vaultFiles.length}
        backendHealthy={backendHealthy}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getHeaderTitle()}
          subtitle={stagedFiles.length > 0 ? `${stagedFiles.length} staged` : undefined}
          preset={preset}
          onSelectPreset={setPreset}
          vaultCount={vaultFiles.length}
          onRefresh={refreshAll}
          isRefreshing={isRefreshing}
        />

        {/* Scrollable Workstation Main Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* VIEW: Dashboard (§Dashboard directive) */}
            {currentView === 'dashboard' && (
              <DashboardView
                onFilesSelected={handleFilesSelected}
                isUploading={isUploading}
                uploadProgress={uploadProgressText}
                preset={preset}
                vaultFiles={vaultFiles}
                recentJobs={recentJobs}
                onNavigate={setCurrentView}
                onOpenPassport={handleOpenPassport}
              />
            )}

            {/* VIEW: Converter (§Converter directive) */}
            {currentView === 'converter' && (
              <ConversionPanel
                files={stagedFiles.length > 0 ? stagedFiles : (vaultFiles.length > 0 ? [vaultFiles[0]] : [])}
                preset={preset}
                onJobCompleted={() => {
                  refreshAll();
                  setCurrentView('vault');
                }}
                onOpenPassport={handleOpenPassport}
                onOpenSmartConvert={() => setShowSmartConvert(true)}
                onReset={() => {
                  setStagedFiles([]);
                  setCurrentView('dashboard');
                }}
              />
            )}

            {/* VIEW: Vault (§Vault directive) */}
            {currentView === 'vault' && (
              <VaultView
                files={vaultFiles}
                onRefresh={refreshAll}
                onOpenPassport={handleOpenPassport}
              />
            )}

            {/* VIEW: Activity (§Activity directive) */}
            {currentView === 'activity' && (
              <ActivityView
                jobs={recentJobs}
                onOpenPassport={handleOpenPassport}
              />
            )}

            {/* VIEW: Privacy Scanner (§Privacy Scanner directive) */}
            {currentView === 'scanner' && (
              <PrivacyScannerView
                files={vaultFiles}
                activeFile={activeFileForInspection}
                onSelectFile={setActiveFileForInspection}
                onRefresh={refreshAll}
              />
            )}

            {/* VIEW: AI Copilot (§Copilot directive) */}
            {currentView === 'copilot' && (
              <CopilotView
                files={vaultFiles}
                activeFile={activeFileForInspection}
                onSelectFile={setActiveFileForInspection}
              />
            )}

            {/* VIEW: Security Passport Explorer */}
            {currentView === 'passport' && (
              <div className="space-y-6">
                <div className="border-b border-[#E3E3DE] pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#141413] tracking-tight uppercase font-mono">
                      Security Passport Registry
                    </h2>
                    <p className="text-xs text-[#5C5C56]">
                      Select any active or converted document to inspect its digital verification certificate.
                    </p>
                  </div>
                </div>

                {vaultFiles.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-[#E3E3DE] rounded bg-white text-xs text-[#878780]">
                    No files currently in Vault.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vaultFiles.map((file) => (
                      <div
                        key={file.file_id}
                        className="p-4 rounded border border-[#E3E3DE] bg-white hover:border-[#C8C8C1] transition-colors flex flex-col justify-between space-y-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-[#141413] truncate">{file.filename}</div>
                          <div className="text-[10px] font-mono text-[#878780]">
                            {file.mime_type} · {file.detected_ext?.toUpperCase()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenPassport(file.file_id)}
                          className="w-full py-1.5 rounded border border-[#E3E3DE] bg-[#F7F7F5] hover:bg-[#F0F0EB] text-xs font-mono uppercase text-[#141413] font-semibold transition-colors"
                        >
                          View Certificate
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: Privacy Center (§Privacy Center directive) */}
            {currentView === 'privacy_center' && (
              <PrivacyCenterView
                currentPreset={preset}
                onSelectPreset={setPreset}
              />
            )}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {/* Smart Convert Modal */}
      {showSmartConvert && (stagedFiles.length > 0 || vaultFiles.length > 0) && (
        <SmartConvertModal
          file={stagedFiles.length > 0 ? stagedFiles[0] : vaultFiles[0]}
          onClose={() => setShowSmartConvert(false)}
          onSelectAction={() => {
            setShowSmartConvert(false);
            setCurrentView('converter');
          }}
          onOpenCopilot={() => {
            setShowSmartConvert(false);
            setCurrentView('copilot');
          }}
        />
      )}

      {/* Security Passport Certificate Modal */}
      {passportData && (
        <SecurityPassportModal
          data={passportData}
          onClose={() => setPassportData(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          aiMode={aiMode}
          onSelectAiMode={setAiMode}
          systemHealth={systemHealth}
        />
      )}
    </div>
  );
}

export default App;
