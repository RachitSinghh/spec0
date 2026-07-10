import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { limits } from "@/lib/env";
import { getProjectForUser } from "@/db/queries/projects";
import { AddonSelector } from "@/components/addon-selector";

/** Add-on selection screen (T-040, FRONTEND-SPEC A6.6). */
export default async function AddonsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProjectForUser(projectId, user.id);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-sp-5">
      <h2 className="text-h2 uppercase">CHOOSE YOUR DOCS</h2>
      <AddonSelector
        projectId={projectId}
        maxReferences={limits.maxReferenceUploads}
        maxUploadMb={limits.maxUploadMb}
      />
    </div>
  );
}
