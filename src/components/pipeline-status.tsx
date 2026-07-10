"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Pipeline Stepper (T-032, FRONTEND-SPEC A5.5) — the app's signature surface.
 *
 * Polls GET /api/projects/[id]/status every ~2s and renders per-agent status
 * with border + fill only (no color except status). Motion (not color) signals
 * activity on the running step, honoring prefers-reduced-motion. Stops polling
 * once the run is complete/failed and refreshes the server component so the
 * finished document renders.
 */

type StepStatus = "pending" | "running" | "complete" | "failed" | "skipped";

interface Step {
  agent: string;
  order_index: number;
  status: StepStatus;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
}

interface StatusResponse {
  run: { kind: string; status: "queued" | "running" | "complete" | "failed" } | null;
  projectStatus: string;
  steps: Step[];
}

const AGENT_LABEL: Record<string, string> = {
  research: "RESEARCH",
  draft: "DRAFT",
  refine: "REFINE",
  technical: "TECHNICAL",
  security: "SECURITY",
  ui_ux: "UI/UX",
  tickets: "TICKETS",
};

const RUNNING_SUBLINE: Record<string, string> = {
  research: "Researching your market…",
  draft: "Drafting your PRD…",
  refine: "Refining…",
  technical: "Writing technical documentation…",
  security: "Reviewing security best-practices…",
  ui_ux: "Designing the UI/UX spec…",
  tickets: "Breaking the work into tickets…",
};

const SPINNER_FRAMES = ["|", "/", "—", "\\"];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function Spinner() {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 200);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <span className="font-mono" aria-hidden="true">
      {reduced ? "[ ... ]" : SPINNER_FRAMES[frame]}
    </span>
  );
}

function StepBlock({ step }: { step: Step }) {
  const label = AGENT_LABEL[step.agent] ?? step.agent.toUpperCase();
  const base =
    "flex flex-1 items-center gap-sp-2 p-sp-3 font-mono text-small uppercase";
  const byStatus: Record<StepStatus, string> = {
    pending: "border-thick border-border-disabled bg-white text-content-tertiary",
    running: "border-heavy border-black bg-black text-white",
    complete: "border-thick border-success bg-white text-black",
    failed: "border-thick border-error bg-white text-error",
    skipped: "border-thin border-border-disabled bg-white text-content-tertiary line-through",
  };
  return (
    <div className={cn(base, byStatus[step.status])}>
      {step.status === "running" && <Spinner />}
      {step.status === "complete" && <span aria-hidden="true">[x]</span>}
      {step.status === "failed" && <span aria-hidden="true">[!]</span>}
      <span>{label}</span>
    </div>
  );
}

export function PipelineStatus({
  projectId,
  initialData,
}: {
  projectId: string;
  initialData?: StatusResponse;
}) {
  const router = useRouter();
  const [data, setData] = React.useState<StatusResponse | null>(initialData ?? null);
  const refreshedRef = React.useRef(false);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return schedule();
        const json = (await res.json()) as StatusResponse;
        if (!active) return;
        setData(json);
        const done = json.run?.status === "complete" || json.run?.status === "failed";
        if (done) {
          // Reload the server component once so the finished doc renders.
          if (!refreshedRef.current) {
            refreshedRef.current = true;
            router.refresh();
          }
          return;
        }
      } catch {
        // transient — keep polling
      }
      schedule();
    }
    function schedule() {
      if (active) timer = setTimeout(poll, 2000);
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [projectId, router]);

  const steps = data?.steps ?? [];
  const runningStep = steps.find((s) => s.status === "running");

  return (
    <div className="flex flex-col gap-sp-3">
      <div className="flex flex-col gap-[3px] md:flex-row md:gap-0 md:[&>*+*]:ml-[-3px]">
        {steps.length === 0 ? (
          <div className="p-sp-3 font-mono text-small uppercase text-content-tertiary">
            Queuing pipeline…
          </div>
        ) : (
          steps.map((s) => <StepBlock key={s.agent} step={s} />)
        )}
      </div>
      <p className="font-mono text-small text-content-primary">
        {runningStep
          ? RUNNING_SUBLINE[runningStep.agent] ?? "Working…"
          : data?.run?.status === "failed"
            ? "Pipeline failed."
            : data?.run?.status === "complete"
              ? "Done."
              : "Starting…"}
      </p>
    </div>
  );
}
