"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

/**
 * Idea intake form (T-031, FRONTEND-SPEC A6.4). Mono textarea + three optional
 * structured inputs. Submits to the createProject Server Action; routes to the
 * project page (where the pipeline is already running) on success. Shows the
 * grey disabled treatment while the action is in flight.
 */
export function IntakeForm() {
  const router = useRouter();
  const [idea, setIdea] = React.useState("");
  const [problem, setProblem] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [paywall, setPaywall] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = idea.trim().length > 0 && !pending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const res = await createProject({
        ideaText: idea,
        ideaMeta: { problem, audience, scope },
      });
      if ("paymentRequired" in res) {
        // Paywall modal is wired in T-053; surface it inline for now.
        setPaywall(true);
        setPending(false);
        return;
      }
      router.push(`/projects/${res.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-reading flex-col gap-sp-4">
      <Field label="Your idea" htmlFor="idea">
        <Textarea
          id="idea"
          rows={8}
          required
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the product idea you want a spec for…"
          disabled={pending}
        />
      </Field>

      <div className="grid gap-sp-4 md:grid-cols-3">
        <Field label="Problem" htmlFor="problem">
          <Input
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="optional"
            disabled={pending}
          />
        </Field>
        <Field label="Audience" htmlFor="audience">
          <Input
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="optional"
            disabled={pending}
          />
        </Field>
        <Field label="Rough scope" htmlFor="scope">
          <Input
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="optional"
            disabled={pending}
          />
        </Field>
      </div>

      {error ? <p className="text-tiny text-error">{error}</p> : null}
      {paywall ? (
        <p className="border-thick border-warning p-sp-3 font-mono text-small text-warning">
          Free monthly project used. Payment required (checkout wired in T-053).
        </p>
      ) : null}

      <div>
        <Button type="submit" size="large" disabled={!canSubmit}>
          {pending ? "GENERATING…" : "GENERATE PRD"}
        </Button>
      </div>
    </form>
  );
}
