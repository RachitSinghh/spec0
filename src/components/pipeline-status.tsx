"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

/**
 * Pipeline Timeline (T-032, FRONTEND-SPEC A5.5) — the app's signature surface.
 *
 * Polls GET /api/projects/[id]/status every ~2s and renders a vertical
 * per-agent timeline plus a stats rail (elapsed, tokens) and a system log
 * derived client-side from step transitions. Border + fill only (no color
 * except status); motion honors prefers-reduced-motion. Stops polling once
 * the run is complete/failed and refreshes the server component so the
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
  run: {
    kind: string;
    status: "queued" | "running" | "complete" | "failed";
    started_at?: string | null;
  } | null;
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

const AGENT_DESC: Record<string, string> = {
  research: "Grounding your idea in real market data",
  draft: "Writing the full PRD",
  refine: "Quality gate — tightening scope and metrics",
  technical: "Stack, schema, and build order",
  security: "Auth, roles, and edge cases",
  ui_ux: "Design system and key screens",
  tickets: "Breaking the work into a backlog",
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
      {reduced ? "…" : SPINNER_FRAMES[frame]}
    </span>
  );
}

function fmtTokens(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stepTokens(s: Step): number {
  return (s.input_tokens ?? 0) + (s.output_tokens ?? 0);
}

const CHIP_STATUS: Record<StepStatus, "default" | "success" | "warning" | "error"> = {
  pending: "default",
  running: "default",
  complete: "success",
  failed: "error",
  skipped: "default",
};

function TimelineStep({
  step,
  isLast,
  runLive,
}: {
  step: Step;
  isLast: boolean;
  runLive: boolean;
}) {
  const label = AGENT_LABEL[step.agent] ?? step.agent.toUpperCase();
  const running = step.status === "running";
  const dimmed = step.status === "pending" || step.status === "skipped";
  // A failed step inside a still-live run gets auto-retried by Inngest —
  // show RETRYING (warning), not FAILED, until the run itself settles.
  const retrying = step.status === "failed" && runLive;
  const failed = step.status === "failed" && !runLive;

  return (
    <li className="flex gap-sp-3">
      {/* Marker + connector column */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex h-[28px] w-[28px] shrink-0 items-center justify-center border-thick font-mono text-small",
            step.status === "complete" && "border-success text-success",
            failed && "border-error text-error",
            retrying && "border-warning text-warning",
            running && "border-black bg-black text-white",
            dimmed && "border-border-disabled text-content-tertiary",
          )}
          aria-hidden="true"
        >
          {step.status === "complete" ? (
            "x"
          ) : running ? (
            <Spinner />
          ) : retrying ? (
            <Spinner />
          ) : failed ? (
            "!"
          ) : (
            "·"
          )}
        </span>
        {!isLast && (
          <span
            className={cn(
              "w-[3px] flex-1",
              step.status === "complete" ? "bg-success" : "bg-border-disabled",
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Step card */}
      <div
        className={cn(
          "mb-sp-3 flex flex-1 flex-col gap-sp-1 border-thick p-sp-3",
          running && "border-heavy border-black bg-black text-white",
          step.status === "complete" && "border-success",
          failed && "border-error",
          retrying && "border-warning",
          dimmed && "border-border-disabled text-content-tertiary",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-sp-2">
          <span
            className={cn(
              "font-mono text-small uppercase tracking-[1px]",
              step.status === "skipped" && "line-through",
            )}
          >
            {label}
          </span>
          {running ? (
            <span className="border-2 border-white px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-[1px]">
              RUNNING
            </span>
          ) : retrying ? (
            <StatusChip status="warning">RETRYING</StatusChip>
          ) : (
            <StatusChip status={CHIP_STATUS[step.status]}>{step.status}</StatusChip>
          )}
        </div>
        <p className={cn("text-small", dimmed && "text-content-tertiary")}>
          {AGENT_DESC[step.agent] ?? ""}
        </p>
        {step.status === "complete" && (
          <p className="font-mono text-tiny text-content-tertiary">
            {step.latency_ms != null && `${(step.latency_ms / 1000).toFixed(1)}s`}
            {stepTokens(step) > 0 && ` · ${fmtTokens(stepTokens(step))} tok`}
            {step.model && ` · ${step.model}`}
          </p>
        )}
      </div>
    </li>
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
  const [log, setLog] = React.useState<string[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  const refreshedRef = React.useRef(false);
  const prevStatusRef = React.useRef<Record<string, StepStatus>>({});
  const logEndRef = React.useRef<HTMLDivElement>(null);

  // Append system-log lines for every step transition seen between polls.
  const appendTransitions = React.useCallback((json: StatusResponse) => {
    const stamp = new Date().toTimeString().slice(0, 8);
    const lines: string[] = [];
    for (const s of json.steps) {
      const prev = prevStatusRef.current[s.agent];
      if (prev === s.status) continue;
      const label = AGENT_LABEL[s.agent] ?? s.agent.toUpperCase();
      if (s.status === "running") lines.push(`[${stamp}] ${label}: started`);
      if (s.status === "complete") {
        const meta = [
          s.latency_ms != null ? `${(s.latency_ms / 1000).toFixed(1)}s` : null,
          stepTokens(s) > 0 ? `${fmtTokens(stepTokens(s))} tok` : null,
        ].filter(Boolean);
        lines.push(
          `[${stamp}] ${label}: complete${meta.length ? ` (${meta.join(", ")})` : ""}`,
        );
      }
      if (s.status === "failed") {
        const live = json.run?.status === "queued" || json.run?.status === "running";
        lines.push(`[${stamp}] ${label}: ${live ? "failed — auto-retrying…" : "FAILED"}`);
      }
      prevStatusRef.current[s.agent] = s.status;
    }
    if (lines.length) setLog((l) => [...l, ...lines].slice(-100));
  }, []);

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
        appendTransitions(json);
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
  }, [projectId, router, appendTransitions]);

  // Elapsed ticker — only while the run is live.
  const runLive =
    !data || data.run?.status === "queued" || data.run?.status === "running";
  React.useEffect(() => {
    if (!runLive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [runLive]);

  // Keep the log scrolled to the latest line.
  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  const steps = data?.steps ?? [];
  const runningStep = steps.find((s) => s.status === "running");
  const totalTokens = steps.reduce((sum, s) => sum + stepTokens(s), 0);
  const startedAt = data?.run?.started_at ? Date.parse(data.run.started_at) : null;
  const elapsed = startedAt != null ? (runLive ? now : Date.now()) - startedAt : null;

  const retryingStep = runLive && steps.find((s) => s.status === "failed");
  const headline = runningStep
    ? `${AGENT_DESC[runningStep.agent] ?? "Working"}…`
    : retryingStep
      ? "A step hiccuped — retrying automatically…"
      : data?.run?.status === "failed"
        ? "Pipeline failed."
        : data?.run?.status === "complete"
          ? "Done."
          : "Starting…";

  return (
    <div className="grid gap-sp-4 lg:grid-cols-[1fr_280px]">
      {/* ─── Timeline ─── */}
      <div className="flex flex-col gap-sp-3">
        <p className="font-mono text-small uppercase tracking-[1px]" aria-live="polite">
          {headline}
        </p>
        {steps.length === 0 ? (
          <div className="flex items-center gap-sp-2 border-thick border-border-disabled p-sp-3 font-mono text-small uppercase text-content-tertiary">
            <Spinner /> Queuing pipeline…
          </div>
        ) : (
          <ol className="flex flex-col">
            {steps.map((s, i) => (
              <TimelineStep
                key={s.agent}
                step={s}
                isLast={i === steps.length - 1}
                runLive={runLive}
              />
            ))}
          </ol>
        )}
        {!runLive && data?.run && (
          <div className="flex flex-wrap gap-sp-3">
            <Button onClick={() => router.refresh()}>
              {data.run.status === "complete" ? "View result" : "Refresh"}
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary">Go to dashboard</Button>
            </Link>
          </div>
        )}
      </div>

      {/* ─── Stats rail + system log ─── */}
      <div className="flex flex-col gap-sp-3">
        <div className="flex gap-sp-3 lg:flex-col">
          <div className="flex flex-1 flex-col gap-sp-1 border-thick border-black p-sp-3">
            <span className="font-mono text-tiny uppercase tracking-[1px] text-content-tertiary">
              Elapsed
            </span>
            <span className="font-mono text-h4">
              {elapsed != null ? fmtElapsed(elapsed) : "--:--"}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-sp-1 border-thick border-black p-sp-3">
            <span className="font-mono text-tiny uppercase tracking-[1px] text-content-tertiary">
              Tokens used
            </span>
            <span className="font-mono text-h4">{fmtTokens(totalTokens)}</span>
          </div>
        </div>

        <div className="flex min-h-[120px] flex-col border-thick border-black">
          <span className="border-b-thick border-black p-sp-2 font-mono text-tiny uppercase tracking-[1px]">
            System log
          </span>
          <div className="max-h-[240px] flex-1 overflow-y-auto p-sp-2">
            {log.length === 0 ? (
              <p className="font-mono text-tiny text-content-tertiary">
                Waiting for pipeline…
              </p>
            ) : (
              log.map((line, i) => (
                <p key={i} className="font-mono text-tiny leading-relaxed">
                  {line}
                </p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
