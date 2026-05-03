; Sentinel Pulse - Inno Setup Script
; Build: iscc setup.iss
; Requires Inno Setup 6.0+

#define MyAppName "Sentinel Pulse"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Tetradim / SignalForge Lab"
#define MyAppURL "https://github.com/Tetradim/Set-Trader"
#define MyAppExeName "SentinelPulse.exe"
#define MyAppAssocName "Sentinel Pulse Config"
#define MyAppAssocExt ".sentinel"

[Setup]
AppId={{8A3E4B2C-1D5F-6E7A-9B8C-0D1E2F3A4B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=SentinelPulse-Setup-{#MyAppVersion}
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
MinVersion=10.0.18362
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "launchapp"; Description: "Launch Sentinel Pulse after install"; GroupDescription: "Startup"; Flags: checkedonce

[Files]
Source: "backend\dist\SentinelPulse\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Setup-And-Launch.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\Setup-And-Launch.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Registry]
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocExt}\OpenWithProgids"; ValueType: string; ValueName: "{#MyAppAssocName}"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocName}"; ValueType: string; ValueName: ""; ValueData: "Sentinel Pulse Configuration"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\{#MyAppAssocName}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
Root: HKCU; Subkey: "Software\{#MyAppPublisher}\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey

[Run]
; Launch Sentinel Pulse if task selected
Filename: "{app}\Setup-And-Launch.bat"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent shellexec; Tasks: launchapp; WorkingDir: "{app}"

[Code]
// Create necessary directories
procedure CurStepChanged(CurStep: TSetupStep);
var
  DataPath, LogPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    DataPath := ExpandConstant('{app}\data\db');
    LogPath := ExpandConstant('{app}\logs');
    
    if not DirExists(DataPath) then
      CreateDir(DataPath);
    if not DirExists(LogPath) then
      CreateDir(LogPath);
  end;
end;