export function validateYoutubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  const allowed = [
    'youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com'
  ];
  return allowed.some((domain) => lower.includes(domain));
}
export function validateSpotifyUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  const allowed = [
    'open.spotify.com', 'spotify.link', 'spotify.com'
  ];
  return allowed.some((domain) => lower.includes(domain));
}

export function validateUrl(url: string): boolean {
  return validateYoutubeUrl(url) || validateSpotifyUrl(url);
}
