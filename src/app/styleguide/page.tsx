"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { StatusChip, FilterChip } from "@/components/ui/chip";
import { List, ListItem } from "@/components/ui/list";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioItem } from "@/components/ui/radio";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-sp-4 border-t-thick border-black pt-sp-4">
      <h3 className="text-h3">{title}</h3>
      <div className="flex flex-col gap-sp-4">{children}</div>
    </section>
  );
}

const VARIANTS = ["primary", "secondary", "ghost", "destructive"] as const;
const SIZES = ["small", "medium", "large"] as const;

export default function StyleguidePage() {
  const [filterActive, setFilterActive] = React.useState(false);
  const [checked, setChecked] = React.useState(true);

  return (
    <TooltipProvider delayDuration={100}>
      <main className="mx-auto flex w-full max-w-app flex-col gap-sp-6 p-sp-6">
        <header className="flex flex-col gap-sp-2">
          <p className="font-mono text-mono">/styleguide</p>
          <h1 className="text-h2">RAWBLOCK COMPONENTS</h1>
          <p className="max-w-reading">
            Every component + documented state for visual QA. Hard rules: 0px
            radius everywhere (except the radio inner dot), never a shadow.
          </p>
        </header>

        <Section title="Buttons">
          {VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-sp-3">
              {SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {variant} {size}
                </Button>
              ))}
              <Button variant={variant} disabled>
                disabled
              </Button>
            </div>
          ))}
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-reading gap-sp-4 md:grid-cols-2">
            <Field label="Default" htmlFor="in-default" helper="Helper text.">
              <Input id="in-default" placeholder="type here" />
            </Field>
            <Field label="Error" htmlFor="in-error" error="This field is required.">
              <Input id="in-error" error defaultValue="bad value" />
            </Field>
            <Field label="Disabled" htmlFor="in-disabled">
              <Input id="in-disabled" disabled placeholder="disabled" />
            </Field>
            <Field label="Focus me (5px border)" htmlFor="in-focus">
              <Input id="in-focus" placeholder="click to focus" />
            </Field>
          </div>
          <Field label="Textarea" htmlFor="ta">
            <Textarea id="ta" rows={4} placeholder="multi-line mono input" />
          </Field>
        </Section>

        <Section title="Cards">
          <div className="grid gap-sp-4 md:grid-cols-2">
            <Card>
              <h4 className="text-h4">Default card</h4>
              <p>3px black border.</p>
            </Card>
            <Card variant="elevated">
              <h4 className="text-h4">Elevated card</h4>
              <p>5px black border = more importance.</p>
            </Card>
          </div>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap items-center gap-sp-3">
            <StatusChip status="default">PRD ONLY</StatusChip>
            <StatusChip status="success">FULL PACKAGE</StatusChip>
            <StatusChip status="warning">PAYMENT PENDING</StatusChip>
            <StatusChip status="error">FAILED</StatusChip>
          </div>
          <div className="flex flex-wrap items-center gap-sp-3">
            <FilterChip
              active={filterActive}
              onClick={() => setFilterActive((v) => !v)}
            >
              Toggle filter
            </FilterChip>
            <FilterChip>Static</FilterChip>
          </div>
        </Section>

        <Section title="List">
          <List className="max-w-reading">
            <ListItem>
              <span>my saas idea</span>
              <StatusChip status="success">FULL PACKAGE</StatusChip>
            </ListItem>
            <ListItem active>
              <span>active / inverted row</span>
              <span className="font-mono text-small">selected</span>
            </ListItem>
            <ListItem>
              <span>another project</span>
              <StatusChip status="error">FAILED</StatusChip>
            </ListItem>
          </List>
        </Section>

        <Section title="Checkbox & Radio">
          <div className="flex items-center gap-sp-3">
            <Checkbox
              id="cb1"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor="cb1" className="mb-0 normal-case">
              Checked (toggle)
            </Label>
            <Checkbox id="cb2" />
            <Label htmlFor="cb2" className="mb-0 normal-case">
              Unchecked
            </Label>
            <Checkbox id="cb3" disabled />
            <Label htmlFor="cb3" className="mb-0 normal-case">
              Disabled
            </Label>
          </div>
          <RadioGroup defaultValue="each" className="flex flex-col gap-sp-2">
            <label className="flex items-center gap-sp-3">
              <RadioItem value="each" id="r1" />
              <span>Review each doc as it completes</span>
            </label>
            <label className="flex items-center gap-sp-3">
              <RadioItem value="all" id="r2" />
              <span>Generate all, review at end</span>
            </label>
          </RadioGroup>
        </Section>

        <Section title="Tooltip">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Hover for tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>
              In v1 this is best-practice guidance, not a security audit.
            </TooltipContent>
          </Tooltip>
        </Section>

        <Section title="Links & type">
          <p className="max-w-reading">
            A genuine <a href="#">hyperlink is blue</a> — the only place blue
            appears. Body copy is Work Sans;{" "}
            <span className="font-mono">mono is Space Mono</span>; headings are
            Archivo Black.
          </p>
        </Section>
      </main>
    </TooltipProvider>
  );
}
