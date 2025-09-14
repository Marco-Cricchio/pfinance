import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * System authentication result
 */
export interface SystemAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Authenticate user with system password on MacOS using AppleScript
 */
async function authenticateMacOS(password: string): Promise<SystemAuthResult> {
  try {
    // Create a simple AppleScript that requires admin privileges
    const script = `
      do shell script "whoami" with administrator privileges password "${password.replace(/"/g, '\\"')}"
    `;
    
    // Use osascript to run the AppleScript
    await execAsync(`osascript -e '${script}'`);
    
    return { success: true };
  } catch (error: any) {
    // AppleScript returns error code 128 for wrong password
    if (error.code === 128 || error.stderr?.includes('User canceled')) {
      return { success: false, error: 'Password non valida o operazione annullata' };
    }
    
    return { success: false, error: 'Errore durante l\'autenticazione di sistema' };
  }
}

/**
 * Authenticate user with system password on Windows using PowerShell
 */
async function authenticateWindows(password: string): Promise<SystemAuthResult> {
  try {
    const username = process.env.USERNAME || process.env.USER || 'user';
    
    // Use PowerShell to verify credentials
    const script = `
      $username = "${username}";
      $password = ConvertTo-SecureString "${password.replace(/"/g, '""')}" -AsPlainText -Force;
      $credential = New-Object System.Management.Automation.PSCredential ($username, $password);
      
      # Try to run a simple command with the credentials
      Start-Process -FilePath "cmd" -ArgumentList "/c", "echo test" -Credential $credential -WindowStyle Hidden -Wait;
      Write-Output "Success";
    `;
    
    const { stdout, stderr } = await execAsync(`powershell -Command "${script}"`);
    
    if (stdout.includes('Success')) {
      return { success: true };
    }
    
    return { success: false, error: 'Password non valida' };
  } catch (error: any) {
    if (error.stderr?.includes('password') || error.stderr?.includes('credential')) {
      return { success: false, error: 'Password non valida' };
    }
    
    return { success: false, error: 'Errore durante l\'autenticazione di sistema' };
  }
}

/**
 * Authenticate user with system password on Linux using sudo
 */
async function authenticateLinux(password: string): Promise<SystemAuthResult> {
  try {
    // Use sudo with password input
    const { stdout, stderr } = await execAsync(`echo "${password}" | sudo -S whoami`, {
      timeout: 5000
    });
    
    if (stdout.includes('root') || stdout.includes(process.env.USER || 'user')) {
      return { success: true };
    }
    
    return { success: false, error: 'Password non valida' };
  } catch (error: any) {
    if (error.stderr?.includes('password') || error.stderr?.includes('Sorry')) {
      return { success: false, error: 'Password non valida' };
    }
    
    return { success: false, error: 'Errore durante l\'autenticazione di sistema' };
  }
}

/**
 * Cross-platform system authentication
 */
export async function authenticateSystemPassword(password: string): Promise<SystemAuthResult> {
  if (!password || password.trim().length === 0) {
    return { success: false, error: 'Password richiesta' };
  }
  
  const platform = os.platform();
  
  try {
    switch (platform) {
      case 'darwin': // macOS
        return await authenticateMacOS(password);
      
      case 'win32': // Windows
        return await authenticateWindows(password);
      
      case 'linux': // Linux
        return await authenticateLinux(password);
      
      default:
        return { success: false, error: `Sistema operativo non supportato: ${platform}` };
    }
  } catch (error: any) {
    console.error('System authentication error:', error);
    return { success: false, error: 'Errore durante l\'autenticazione di sistema' };
  }
}

/**
 * Get the current system platform for UI display
 */
export function getSystemPlatform(): { name: string; requiresPassword: boolean } {
  const platform = os.platform();
  
  switch (platform) {
    case 'darwin':
      return { name: 'macOS', requiresPassword: true };
    case 'win32':
      return { name: 'Windows', requiresPassword: true };
    case 'linux':
      return { name: 'Linux', requiresPassword: true };
    default:
      return { name: platform, requiresPassword: false };
  }
}