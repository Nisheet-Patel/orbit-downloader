/**
 * Format a duration in seconds to HH:MM:SS or MM:SS.
 * Ported exactly from the Python reference.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return 'Unknown';
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validate whether a URL is a YouTube domain we accept.
 * Case-insensitive substring match.
 * @param {string} url
 * @returns {boolean}
 */
function validateYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  const allowed = [
    'youtube.com',
    'youtu.be',
    'www.youtube.com',
    'm.youtube.com'
  ];
  return allowed.some(domain => lower.includes(domain));
}

/**
 * Sanitize a string so it can be used as a filename on Windows and macOS.
 * Strips characters illegal on both platforms and trims trailing dots/spaces.
 *
 * NOTE: yt-dlp also sanitizes filenames when writing output. This sanitiser
 * must stay in sync with whatever yt-dlp actually produces, otherwise the
 * pre-download 'already_exists' check in Task 3 will be unreliable.
 *
 * @param {string} title
 * @returns {string}
 */
function sanitizeFilename(title) {
  if (!title || typeof title !== 'string') return 'unknown';
  return title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\.+$/, '')
    .trim()
    || 'unknown';
}

module.exports = { formatDuration, validateYoutubeUrl, sanitizeFilename };
