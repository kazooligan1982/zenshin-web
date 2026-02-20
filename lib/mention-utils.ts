/**
 * Parse @mention data-id attributes from TipTap mention HTML.
 * Format: data-id="type:chartId:id"
 */
export function parseMentionsFromHtml(html: string): { type: string; chartId: string; id: string }[] {
  const results: { type: string; chartId: string; id: string }[] = [];
  const regex = /data-id="([^"]+)"/g;
  const seen = new Set<string>();
  let m;
  while ((m = regex.exec(html)) !== null) {
    const parts = m[1].split(":");
    if (parts.length >= 3) {
      const [type, chartId, id] = parts;
      const key = `${type}:${chartId}:${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ type, chartId, id });
      }
    }
  }
  return results;
}
