import { z } from "zod";

/**
 * Structured-output schemas (T-021). The Research agent returns a validated
 * brief; the Tickets agent returns a validated backlog. Both are rendered to
 * Markdown for storage in documents.content.
 */

export const researchBriefSchema = z.object({
  problemStatement: z.string(),
  targetUsers: z.array(z.string()),
  competitors: z.array(
    z.object({
      name: z.string(),
      note: z.string(),
    }),
  ),
  marketNotes: z.array(z.string()),
  risks: z.array(z.string()),
});
export type ResearchBrief = z.infer<typeof researchBriefSchema>;

export const ticketSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.enum(["MUST-HAVE", "SHOULD-HAVE", "NICE-TO-HAVE"]),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  dependencies: z.array(z.string()),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const ticketListSchema = z.object({
  epics: z.array(
    z.object({
      name: z.string(),
      tickets: z.array(ticketSchema),
    }),
  ),
});
export type TicketList = z.infer<typeof ticketListSchema>;
