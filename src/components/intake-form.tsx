"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createProject } from "@/actions/projects";
import { beginPaidCheckout } from "@/actions/billing";
import type { AddonDocType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FilterChip } from "@/components/ui/chip";

/** Fixed generation order — same as the add-ons screen. */
const DOC_OPTIONS: { key: AddonDocType; label: string }[] = [
  { key: "technical", label: "TECHNICAL" },
  { key: "security", label: "SECURITY" },
  { key: "ui_ux", label: "UI-UX" },
  { key: "tickets", label: "TICKETS" },
];

/**
 * Idea intake form (T-031, FRONTEND-SPEC A6.4). Mono textarea + three optional
 * structured inputs. Submits to the createProject Server Action; routes to the
 * project page (where the pipeline is already running) on success. Shows the
 * grey disabled treatment while the action is in flight.
 */
export function IntakeForm({
  paymentsEnabled = false,
}: {
  paymentsEnabled?: boolean;
}) {
  const router = useRouter();
  const [idea, setIdea] = React.useState("");
  const [problem, setProblem] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [docs, setDocs] = React.useState<Set<AddonDocType>>(
    new Set(DOC_OPTIONS.map((d) => d.key)), // all on by default — one-shot flow
  );
  const [pending, setPending] = React.useState(false);
  const [paywall, setPaywall] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggleDoc = (key: AddonDocType) =>
    setDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Over-quota purchase: create a Dodo checkout session and redirect to it.
  async function onUnlock() {
    setPending(true);
    setError(null);
    try {
      const selectedDocs = DOC_OPTIONS.filter((d) => docs.has(d.key)).map((d) => d.key);
      const { checkoutUrl } = await beginPaidCheckout({
        ideaText: idea,
        ideaMeta: { problem, audience, scope },
        docs: selectedDocs,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPending(false);
    }
  }

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
        docs: DOC_OPTIONS.filter((d) => docs.has(d.key)).map((d) => d.key),
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

      <Field label="Docs to generate after the PRD" htmlFor="docs">
        <div id="docs" className="flex flex-wrap gap-sp-2">
          {DOC_OPTIONS.map((d) => (
            <FilterChip
              key={d.key}
              active={docs.has(d.key)}
              onClick={() => toggleDoc(d.key)}
              disabled={pending}
            >
              {docs.has(d.key) ? "[x] " : "[ ] "}
              {d.label}
            </FilterChip>
          ))}
        </div>
        <p className="mt-sp-1 font-mono text-tiny text-content-tertiary">
          Selected docs generate automatically, one by one, each reading every
          doc before it. Deselect all to review the PRD first.
        </p>
      </Field>

      {error ? <p className="text-tiny text-error">{error}</p> : null}
      {paywall ? (
        <div className="flex flex-col gap-sp-3 border-thick border-warning p-sp-3">
          {paymentsEnabled ? (
            <>
              <p className="font-mono text-small text-warning">
                Free monthly projects used. Unlock this project for a one-time
                payment — same idea, same docs, generated the moment payment lands.
              </p>
              <div>
                <Button type="button" size="large" onClick={onUnlock} disabled={pending}>
                  {pending ? "OPENING CHECKOUT…" : "UNLOCK & GENERATE"}
                </Button>
              </div>
            </>
          ) : (
            <p className="font-mono text-small text-warning">
              Free monthly projects used — your quota resets next month. Paid
              projects are coming soon.
            </p>
          )}
        </div>
      ) : (
        <div>
          <Button type="submit" size="large" disabled={!canSubmit}>
            {pending ? "GENERATING…" : "GENERATE PRD"}
          </Button>
        </div>
      )}
    </form>
  );
}
