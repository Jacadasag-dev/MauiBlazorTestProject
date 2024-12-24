; *** Place setups in: https://interfacepeopletx.sharepoint.com/:f:/s/IPeople/IPfiles/En4XC_baoLhMuoVQ7K98B1cB2cdy0lugBBFuZgPIcDZaLw?e=Xka4Yb
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!
#define MyAppName "Jac-Dev-Blazor-Test-Project"
#define MyAppVersion "1.0"
#define MyAppPublisher "Jacadasag-Dev"
#define MyAppURL "None"
#define MyAppExeName "JD.MauiBlazorUITestProject.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{5E59525E-2FE9-4CED-A1F8-27F52066E6C8}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\JD\Test\Blazor
DisableDirPage=yes
DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
OutputBaseFilename=mysetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
OutputDir=D:\repos\setups\blazor-test
UsePreviousAppDir=no


[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked



            
[Files]
Source: "D:\repos\MauiBlazorTestProject\bin\Release\net9.0-windows10.0.19041.0\win10-x64\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\repos\MauiBlazorTestProject\bin\Release\net9.0-windows10.0.19041.0\win10-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

;;Source: "C:\repos\prereqs\windowsappruntimeinstall-x64.exe"; DestDir: "{app}\prereqs"
;;Source: "C:\repos\prereqs\VC_redist.x64.exe"; DestDir: "{app}\prereqs"
;Source: "C:\repos\prereqs\VC_redist.x86.exe"; DestDir: "{app}\prereqs"
;Source: "C:\repos\prereqs\windowsdesktop-runtime-8.0.5-win-x86.exe"; DestDir: "{app}\prereqs"
;;Source: "C:\repos\prereqs\windowsdesktop-runtime-8.0.5-win-x64.exe"; DestDir: "{app}\prereqs"
;Source: "C:\repos\prereqs\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; DestDir: "{app}\prereqs"
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
;;gary;;Filename: "{app}\prereqs\windowsappruntimeinstall-x64.exe"; Parameters: "/silent"; StatusMsg: "Installing Windows App SDK..."
;;gary;;Filename: "{app}\prereqs\VC_redist.x64.exe"; Parameters: "/quiet /norestart"; StatusMsg: "Installing Microsoft Visual C++ Redistributable (x64)..."
;Filename: "{app}\prereqs\VC_redist.x86.exe"; Parameters: "/quiet /norestart"; StatusMsg: "Installing Microsoft Visual C++ Redistributable (x86)..."
;Filename: "{app}\prereqs\windowsdesktop-runtime-8.0.5-win-x86.exe"; Parameters: "/silent"; StatusMsg: "Installing Windows Desktop Runtime (x86)..."
;;;;Filename: "{app}\prereqs\windowsdesktop-runtime-8.0.5-win-x64.exe"; Parameters: "/silent"; StatusMsg: "Installing Windows Desktop Runtime (x64)..."
;Filename: "{app}\prereqs\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; Parameters: "/silent"; StatusMsg: "Installing Microsoft Edge WebView2 Runtime..."
;;gary;;Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

; code section added by gary to check and install edge
[Code]
procedure ExitProcess(uExitCode: UINT); external 'ExitProcess@kernel32.dll stdcall';


function IsEdgeInstalled: Boolean;
var
  EdgePath: string;
begin
  // Define the path to the Edge executable
  EdgePath := ExpandConstant('{pf32}\Microsoft\Edge\Application\msedge.exe');
  // Check if the Edge executable exists
  Result := FileExists(EdgePath);
end;

procedure PromptEdgeDownload;
var
  ErrorCode: Integer;
  UserResponse: Integer;
begin
  UserResponse := MsgBox('Microsoft Edge is not installed on this system. Please click OK to download and install Microsoft Edge and then restart the setup once Edge is successfully installed.' ,
                        mbInformation, MB_OKCancel);
  if UserResponse = IDOK then
  begin
    if not ShellExec('', 'https://www.microsoft.com/en-us/edge/download?form=MA13M0', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    begin
      MsgBox('Failed to open the browser. Error code: ' + SysErrorMessage(ErrorCode), mbError, MB_OK);
    end;
  end;
  
    ExitProcess(0); // Exit the installation process silently
  
end;

procedure InitializeWizard;
begin
  // Check if Edge is installed
  if  not IsEdgeInstalled then
  begin
    // If Edge is not installed, prompt the user to download it
    PromptEdgeDownload;
  end;
end;
