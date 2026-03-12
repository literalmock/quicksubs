import { subtitlesToSrt } from './subtitles';

/**
 * Converts captions to SRT format and triggers a download.
 * @param {Array<{ id, start, end, text, style }>} subtitles - Caption array
 * @param {string} filename - Output filename (default: subtitles.srt)
 */
export const downloadSRT = (subtitles, filename = 'subtitles.srt') => {
  if (!subtitles || subtitles.length === 0) {
    throw new Error('No subtitles to export');
  }

  try {
    // Convert subtitles to SRT format
    const srtContent = subtitlesToSrt(subtitles);

    // Create a Blob from the SRT content
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });

    // Create a temporary download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Append to DOM, click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Free up the object URL
    URL.revokeObjectURL(url);

    console.log(`✅ SRT exported: ${filename} (${subtitles.length} captions)`);
  } catch (err) {
    console.error('Failed to export SRT:', err);
    throw err;
  }
};

/**
 * Alternative: Copy SRT content to clipboard instead of downloading
 * @param {Array<{ id, start, end, text, style }>} subtitles - Caption array
 */
export const copySRTToClipboard = async (subtitles) => {
  if (!subtitles || subtitles.length === 0) {
    throw new Error('No subtitles to copy');
  }

  try {
    const srtContent = subtitlesToSrt(subtitles);
    await navigator.clipboard.writeText(srtContent);
    console.log('✅ SRT copied to clipboard');
  } catch (err) {
    console.error('Failed to copy SRT to clipboard:', err);
    throw err;
  }
};

/**
 * Get SRT content as string without downloading
 * @param {Array<{ id, start, end, text, style }>} subtitles - Caption array
 * @returns {string} SRT formatted content
 */
export const getSRTContent = (subtitles) => {
  if (!subtitles || subtitles.length === 0) {
    throw new Error('No subtitles to export');
  }
  return subtitlesToSrt(subtitles);
};
