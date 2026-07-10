import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  pipelineRuns,
  pipelineSteps,
  type NewPipelineRun,
  type PipelineRun,
  type PipelineStep,
} from "@/db/schema";

type AgentName = PipelineStep["agent"];
type StepStatus = PipelineStep["status"];
type RunStatus = PipelineRun["status"];

/** Create a pipeline run (a PRD run, an add-ons run, or a regenerate). */
export async function createPipelineRun(
  input: Pick<NewPipelineRun, "projectId" | "kind"> &
    Partial<Pick<NewPipelineRun, "requestedDocs" | "notes">>,
): Promise<PipelineRun> {
  const rows = await db.insert(pipelineRuns).values(input).returning();
  return rows[0];
}

/** Seed a run's steps as `pending` (or `skipped`) in fixed order. */
export async function seedPipelineSteps(
  runId: string,
  steps: { agent: AgentName; orderIndex: number; status?: StepStatus }[],
): Promise<void> {
  if (steps.length === 0) return;
  await db.insert(pipelineSteps).values(
    steps.map((s) => ({
      runId,
      agent: s.agent,
      orderIndex: s.orderIndex,
      status: s.status ?? "pending",
    })),
  );
}

/**
 * The most recent run for a project (the one the status board reflects).
 * Optionally filtered by kind so a pipeline targets its own run.
 */
export async function getLatestRunForProject(
  projectId: string,
  kind?: PipelineRun["kind"],
): Promise<PipelineRun | null> {
  const rows = await db
    .select()
    .from(pipelineRuns)
    .where(
      kind
        ? and(eq(pipelineRuns.projectId, projectId), eq(pipelineRuns.kind, kind))
        : eq(pipelineRuns.projectId, projectId),
    )
    .orderBy(desc(pipelineRuns.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRunById(runId: string): Promise<PipelineRun | null> {
  const rows = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.id, runId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRunStatus(
  runId: string,
  patch: Partial<Pick<PipelineRun, "status" | "startedAt" | "completedAt" | "inngestRunId">>,
): Promise<void> {
  await db.update(pipelineRuns).set(patch).where(eq(pipelineRuns.id, runId));
}

/** Steps for a run, ordered for rendering the stepper. */
export async function getStepsForRun(runId: string): Promise<PipelineStep[]> {
  return db
    .select()
    .from(pipelineSteps)
    .where(eq(pipelineSteps.runId, runId))
    .orderBy(pipelineSteps.orderIndex);
}

/** Update a specific agent step within a run. */
export async function updateStepByAgent(
  runId: string,
  agent: AgentName,
  patch: Partial<
    Pick<
      PipelineStep,
      | "status"
      | "model"
      | "inputTokens"
      | "outputTokens"
      | "latencyMs"
      | "error"
      | "startedAt"
      | "completedAt"
    >
  >,
): Promise<void> {
  await db
    .update(pipelineSteps)
    .set(patch)
    .where(
      and(eq(pipelineSteps.runId, runId), eq(pipelineSteps.agent, agent)),
    );
}

/** Reset selected steps to `pending` for a regenerate (T-035). */
export async function resetStepsForRerun(
  runId: string,
  agents: AgentName[],
): Promise<void> {
  for (const agent of agents) {
    await updateStepByAgent(runId, agent, {
      status: "pending",
      model: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      error: null,
      startedAt: null,
      completedAt: null,
    });
  }
}

export type { AgentName, StepStatus, RunStatus };
