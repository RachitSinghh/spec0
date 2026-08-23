import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { limits } from "@/lib/env";
import { listProjectsForUser } from "@/db/queries/projects";
import { getTokenTotalsForUser } from "@/db/queries/pipeline";
import { getProjectsCreated, currentPeriod } from "@/db/queries/usage";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { List, ListItem } from "@/components/ui/list";
import { QuotaChip } from "@/components/quota-chip";
import { projectChip, canDownload } from "@/lib/project-status";

/**
 * Dashboard (T-030, FRONTEND-SPEC A6.3). Server Component reading the user's
 * projects (newest first). Empty state shows the exact mono placeholder line.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const [projects, used, tokenTotals] = await Promise.all([
    listProjectsForUser(user.id),
    getProjectsCreated(user.id, currentPeriod()),
    getTokenTotalsForUser(user.id),
  ]);

  return (
    <div className="flex flex-col gap-sp-5">
      <div className="flex flex-col items-start justify-between gap-sp-4 md:flex-row md:items-center">
        <h2 className="text-h2 uppercase">YOUR PROJECTS</h2>
        <div className="flex items-center gap-sp-4">
          <QuotaChip used={used} limit={limits.freeProjectsPerMonth} />
          <Button asChild size="large">
            <Link href="/projects/new" className="no-underline">
              NEW PROJECT
            </Link>
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="font-mono text-mono text-content-primary">
          &gt; no projects yet. describe an idea to begin.
        </p>
      ) : (
        <List>
          {projects.map((p) => {
            const chip = projectChip(p.status);
            return (
              <ListItem key={p.id} interactive={false}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex-1 text-black no-underline hover:underline"
                >
                  {p.title ?? "Untitled project"}
                </Link>
                <div className="flex items-center gap-sp-3">
                  {tokenTotals[p.id] ? (
                    <span className="font-mono text-mono text-content-primary opacity-60">
                      {tokenTotals[p.id].toLocaleString()} tok
                    </span>
                  ) : null}
                  <StatusChip status={chip.status}>{chip.label}</StatusChip>
                  {canDownload(p.status) ? (
                    <a
                      href={`/api/projects/${p.id}/download`}
                      className="text-blue underline"
                    >
                      download
                    </a>
                  ) : null}
                </div>
              </ListItem>
            );
          })}
        </List>
      )}
    </div>
  );
}
