export function getInitials(
  name?: string | null,
  email?: string | null,
): string {
  const source = (name && name.trim()) || email || '';
  const words = source.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
