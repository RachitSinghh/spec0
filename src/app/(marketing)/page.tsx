import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

/**
 * Marketing landing page. Static, zero client JS — the "running" pipeline
 * block animates with a pure-CSS steps() blink. RawBlock: hierarchy via
 * border weight + scale, motion via hard cuts, color only for status.
 */

const AGENTS = [
  { name: "RESEARCH", desc: "Grounds your idea in real market data via live web search." },
  { name: "DRAFT", desc: "Writes the full PRD — features, flows, MVP scope, metrics." },
  { name: "REFINE", desc: "The quality gate. Cuts scope creep, quantifies every metric." },
  { name: "TECHNICAL", desc: "Stack, file structure, database schema, env vars, build order." },
  { name: "SECURITY", desc: "Auth, roles, access rules, error handling, edge cases." },
  { name: "UI/UX", desc: "Design system with hex codes, every screen, every state." },
  { name: "TICKETS", desc: "A build-ready backlog — each ticket usable as an AI coding prompt." },
];

const DOCS = [
  { name: "PRD", desc: "Problem, users, must-have vs nice-to-have, user flow, MVP scope, success metrics." },
  { name: "TECHNICAL ARCHITECTURE", desc: "Opinionated stack, folder structure, full DB schema in plain English." },
  { name: "SECURITY & ACCESS", desc: "Auth method, role permissions, row-level rules, launch-blocking edge cases." },
  { name: "UI/UX SPEC", desc: "Color palette, typography, components, and every key screen with states." },
  { name: "TICKET BACKLOG", desc: "Epics and tickets with acceptance criteria, dependencies, priorities." },
  { name: "ONE ZIP", desc: "The whole package as Markdown files — drop it straight into your repo." },
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Nav ─── */}
      <header className="border-b-thick border-black">
        <nav className="mx-auto flex w-full max-w-app items-center justify-between px-sp-4 py-sp-3">
          <span className="flex items-center gap-sp-3">
            <LogoMark className="h-7 w-7" />
            <span className="font-heading text-2xl uppercase tracking-tight">
              SPEC0
            </span>
          </span>
          <div className="flex items-center gap-sp-3">
            <a
              href="https://github.com/RachitSinghh"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-small uppercase tracking-[1px] text-black underline"
            >
              GitHub
            </a>
            <a
              href="https://x.com/rachiitfr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-small uppercase tracking-[1px] text-black underline"
            >
              X
            </a>
            <Link href="/sign-in">
              <Button variant="secondary">Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Get started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-app px-sp-4">
        {/* ─── Hero ─── */}
        <section className="flex flex-col gap-sp-4 py-sp-7">
          <p className="font-mono text-small uppercase tracking-[2px]">
            Multi-agent spec pipeline
          </p>
          <h1 className="max-w-4xl font-heading text-5xl font-bold uppercase leading-none tracking-tight md:text-h1">
            Idea in.
            <br />
            Full spec package out.
          </h1>
          <p className="max-w-xl text-lg">
            Describe your product idea in a few sentences. Seven specialized AI
            agents research, draft, refine and document it — and hand you a
            complete, build-ready spec package.
          </p>
          <div className="flex flex-wrap gap-sp-3">
            <Link href="/dashboard">
              <Button size="large">Start free — one project</Button>
            </Link>
            <Link href="#how">
              <Button size="large" variant="secondary">
                How it works
              </Button>
            </Link>
          </div>
        </section>

        {/* ─── Live pipeline strip ─── */}
        <section className="border-y-thick border-black py-sp-5">
          <p className="mb-sp-3 font-mono text-small uppercase tracking-[2px]">
            Seven agents. One package.
          </p>
          <div className="flex flex-col gap-[3px] md:flex-row md:gap-0 md:[&>*+*]:ml-[-3px]">
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                className={
                  i < 3
                    ? "flex flex-1 items-center gap-sp-2 border-thick border-success bg-white p-sp-3 font-mono text-small uppercase"
                    : i === 3
                      ? "flex flex-1 items-center gap-sp-2 border-heavy border-black bg-black p-sp-3 font-mono text-small uppercase text-white"
                      : "flex flex-1 items-center gap-sp-2 border-thick border-border-disabled bg-white p-sp-3 font-mono text-small uppercase text-content-tertiary"
                }
              >
                {i < 3 && <span aria-hidden="true">[x]</span>}
                {i === 3 && (
                  <span aria-hidden="true" className="animate-blink">
                    █
                  </span>
                )}
                <span>{a.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-sp-3 font-mono text-small">
            Writing technical documentation…
          </p>
        </section>

        {/* ─── How it works ─── */}
        <section id="how" className="flex flex-col gap-sp-4 py-sp-6">
          <h2 className="font-heading text-h3 uppercase md:text-h2">
            How it works
          </h2>
          <ol className="flex flex-col gap-[3px] md:flex-row md:gap-0 md:[&>*+*]:ml-[-3px]">
            {[
              ["01", "DESCRIBE YOUR IDEA", "A few sentences is enough. Add links or screenshots of designs you like — optional."],
              ["02", "WATCH THE AGENTS WORK", "A live pipeline shows each agent researching, drafting, refining — step by step."],
              ["03", "DOWNLOAD THE PACKAGE", "Review, edit, regenerate any doc. Then download everything as one zip."],
            ].map(([n, title, desc]) => (
              <li
                key={n}
                className="flex flex-1 flex-col gap-sp-2 border-thick border-black p-sp-4"
              >
                <span className="font-mono text-h3">{n}</span>
                <span className="font-heading text-h4 uppercase">{title}</span>
                <span className="text-body">{desc}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── The agents ─── */}
        <section className="flex flex-col gap-sp-4 border-t-thick border-black py-sp-6">
          <h2 className="font-heading text-h3 uppercase md:text-h2">
            The pipeline
          </h2>
          <div className="grid gap-[3px] md:grid-cols-2 lg:grid-cols-3 md:gap-0 md:[&>*]:mt-[-3px] md:[&>*]:ml-[-3px]">
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                className="flex flex-col gap-sp-2 border-thick border-black p-sp-4"
              >
                <span className="font-mono text-small uppercase text-content-tertiary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-heading text-h4 uppercase">{a.name}</span>
                <span className="text-body">{a.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── What you get ─── */}
        <section className="flex flex-col gap-sp-4 border-t-thick border-black py-sp-6">
          <h2 className="font-heading text-h3 uppercase md:text-h2">
            What you get
          </h2>
          <div className="grid gap-[3px] md:grid-cols-2 lg:grid-cols-3 md:gap-0 md:[&>*]:mt-[-3px] md:[&>*]:ml-[-3px]">
            {DOCS.map((d) => (
              <div
                key={d.name}
                className="flex flex-col gap-sp-2 border-thick border-black p-sp-4"
              >
                <span className="font-heading text-h4 uppercase">{d.name}</span>
                <span className="text-body">{d.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="flex flex-col items-start gap-sp-4 border-t-thick border-black py-sp-7">
          <h2 className="max-w-3xl font-heading text-h3 uppercase leading-none md:text-h2">
            Stop staring at a blank doc.
          </h2>
          <p className="max-w-xl text-lg">
            Your first project is free. Idea to full documentation package in
            minutes.
          </p>
          <Link href="/dashboard">
            <Button size="large">Get started</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t-thick border-black">
        <div className="mx-auto flex w-full max-w-app items-center justify-between px-sp-4 py-sp-3">
          <span className="font-mono text-small uppercase">spec0</span>
          <span className="font-mono text-small text-content-tertiary">
            © {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}
