import fs from 'fs';

/**
 * Removes temporary files, ignoring errors for already-deleted paths.
 */
export const cleanup = (...files) => {
  files.forEach((f) => {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
  });
};
