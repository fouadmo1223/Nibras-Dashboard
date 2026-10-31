/**
 * Minimal inline Markdown for chat replies: `**bold**` and `[text](url)` only — exactly what the
 * chatbot's system prompt is instructed to produce. Not a general Markdown parser; no dependency
 * needed for two patterns. Links are resolved both outside and inside a bold span, since the
 * model commonly bolds an entire link (`**[Course](/courses/x)**`).
 */
const BOLD = /\*\*(.+?)\*\*/g;
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderLinks(text, keyRef) {
  const nodes = [];
  let last = 0;
  let match;
  LINK.lastIndex = 0;
  while ((match = LINK.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <a key={keyRef.k++} href={match[2]} className="font-medium underline underline-offset-2 hover:no-underline">
        {match[1]}
      </a>,
    );
    last = LINK.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderInlineMarkdown(text) {
  const nodes = [];
  const keyRef = { k: 0 };
  let last = 0;
  let match;
  BOLD.lastIndex = 0;
  while ((match = BOLD.exec(text))) {
    if (match.index > last) nodes.push(...renderLinks(text.slice(last, match.index), keyRef));
    nodes.push(
      <strong key={keyRef.k++} className="font-semibold">
        {renderLinks(match[1], keyRef)}
      </strong>,
    );
    last = BOLD.lastIndex;
  }
  if (last < text.length) nodes.push(...renderLinks(text.slice(last), keyRef));
  return nodes;
}
