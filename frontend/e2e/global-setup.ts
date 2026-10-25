import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '../../backend');

  // Safety Guard: Verify that the backend resolved database URL strictly targets localhost
  try {
    const output = execSync(
      '.venv\\Scripts\\python.exe -c "from app.core.config import get_settings; from urllib.parse import urlparse; url = get_settings().database_url; host = (urlparse(url).hostname or \'\').lower(); assert host in (\'localhost\', \'127.0.0.1\', \'::1\'), f\'Remote host forbidden: {host}\'; print(\'SAFE_LOCAL_DB:\' + host)"',
      { cwd: backendDir, encoding: 'utf-8' }
    );
    if (!output.includes('SAFE_LOCAL_DB')) {
      throw new Error(`Unexpected check output: ${output}`);
    }
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || String(err);
    throw new Error(
      `SAFETY ABORT: E2E tests can ONLY run against a local database (localhost/127.0.0.1). ` +
      `Target database resolution failed or pointed to a remote host. Details: ${errorMsg}`
    );
  }

  // Clear existing active request assignments to prevent limit contention
  try {
    execSync('.venv\\Scripts\\python.exe clear_assignments.py', {
      cwd: backendDir,
      stdio: 'inherit',
    });
  } catch (err: unknown) {
    console.warn('Notice: clear_assignments.py execution encountered an issue:', err);
  }
}
