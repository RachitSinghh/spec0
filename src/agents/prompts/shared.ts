/**
 * Shared output-discipline directives for the doc-generating agents.
 *
 * Why this exists: every add-on stage re-reads all prior docs IN FULL
 * (run-agent.ts buildUserPrompt), so a verbose doc is paid again as input at
 * each downstream stage — the PRD ~4x, the technical doc ~3x. Denser docs cut
 * output tokens now AND input tokens downstream, with no loss of substance.
 * This is the main token lever on the OpenAI-compatible Mesh path, where
 * Anthropic prompt caching (cache_control) isn't reachable.
 */
export const OUTPUT_DISCIPLINE = `Output discipline (downstream agents re-read this document in full, so keep it lean):
- Be information-dense: every line carries a decision or a concrete fact. Cut filler, restated section headings, and "in this section we will…" scaffolding.
- Do NOT restate the PRD or any earlier document. Name the specific decision and move on.
- Prefer tight tables and bullet lists over prose paragraphs.
- No closing summary or recap.`;

export const TICKET_OUTPUT_DISCIPLINE = `Output discipline: keep each description and acceptance criterion to the essential, concrete detail — no filler, no restating the PRD/technical/UI text. Reference the specific decision instead of re-explaining it.`;
