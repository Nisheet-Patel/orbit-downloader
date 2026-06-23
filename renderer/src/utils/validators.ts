export function validateYoutubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  const allowed = ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'];
  return allowed.some((domain) => lower.includes(domain));
}
