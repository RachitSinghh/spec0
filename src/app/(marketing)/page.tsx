import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingHome() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 p-10">
      <p className="font-mono text-sm">spec0</p>
      <h1 className="text-5xl font-bold uppercase leading-none tracking-tight">
        Idea in. Full spec package out.
      </h1>
      <p className="max-w-xl text-lg">
        Describe an idea and spec0 runs a multi-agent pipeline to produce a PRD
        and a full documentation package you can download.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard">
          <Button size="large">Get started</Button>
        </Link>
        <Link href="/sign-in">
          <Button size="large" variant="secondary">
            Sign in
          </Button>
        </Link>
      </div>
    </main>
  );
}
