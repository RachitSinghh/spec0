import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getProjectForUser } from "@/db/queries/projects";
import { getLatestRunForProject, getStepsForRun } from "@/db/queries/pipeline";

/**
 * Pipeline status endpoint (T-024, FRONTEND-SPEC B7).
 *
 * The ONLY way the frontend learns pipeline progress — it reads the DB, never
 * Inngest/Mesh. Owner-scoped (404 on someone else's project). Cheap enough to
 * poll every ~2s: at most two indexed reads (latest run by project, steps by
 * run).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Owner check — never leak another user's project.
  const project = await getProjectForUser(projectId, user.id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const run = await getLatestRunForProject(projectId);
  if (!run) {
    return NextResponse.json({
      run: null,
      projectStatus: project.status,
      steps: [],
    });
  }

  const steps = await getStepsForRun(run.id);

  return NextResponse.json({
    run: {
      kind: run.kind,
      status: run.status,
      started_at: (run.startedAt ?? run.createdAt)?.toISOString() ?? null,
    },
    projectStatus: project.status,
    steps: steps.map((s) => ({
      agent: s.agent,
      order_index: s.orderIndex,
      status: s.status,
      model: s.model ?? undefined,
      input_tokens: s.inputTokens ?? undefined,
      output_tokens: s.outputTokens ?? undefined,
      latency_ms: s.latencyMs ?? undefined,
    })),
  });
}
