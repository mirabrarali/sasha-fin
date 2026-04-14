/** Parse executive-style summary blocks starting with "## Title" lines. */

export type SummarySection = { title: string; body: string };

export function splitSummarySections(summary: string): SummarySection[] {
  const trimmed = summary.trim();
  if (!trimmed) return [{ title: 'Summary', body: '' }];

  const lines = trimmed.split('\n');
  const sections: SummarySection[] = [];
  let pendingTitle: string | null = null;
  const body: string[] = [];

  const flush = () => {
    const text = body.join('\n').trim();
    if (pendingTitle !== null || text.length > 0) {
      sections.push({
        title: pendingTitle?.trim() || 'Executive overview',
        body: text,
      });
    }
    body.length = 0;
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      pendingTitle = line.slice(3).trim() || 'Section';
    } else {
      body.push(line);
    }
  }
  flush();

  if (sections.length === 0) {
    return [{ title: 'Summary', body: trimmed }];
  }
  return sections;
}

export type ParsedFlaw = {
  severity?: 'high' | 'medium' | 'low';
  headline?: string;
  body: string;
};

/** Expected: "High — Liquidity: detail..." (em dash, en dash, or hyphen). */
export function parseStructuredFlaw(text: string): ParsedFlaw {
  const t = text.trim();
  const m = t.match(/^(High|Medium|Low)\s*[-–—]\s*([^:]+):\s*(.*)$/i);
  if (!m) {
    return { body: t };
  }
  const sev = m[1]!.toLowerCase() as 'high' | 'medium' | 'low';
  return {
    severity: sev,
    headline: m[2]!.trim(),
    body: (m[3] ?? '').trim() || t,
  };
}
