import "server-only";
import type { z } from "zod";

import * as mesh from "@/lib/mesh";
import type { LlmCallOptions, LlmResult, MeshDeps } from "@/agents/types";

/**
 * Builds the MeshDeps injected into the agents runner.
 *
 * Normally this is the real `lib/mesh` client. When MESH_MOCK=true it returns a
 * deterministic stub so the full pipeline (steps, memoization, status writes,
 * document overwrite) can be exercised end-to-end locally without a real Mesh
 * key. The mock is inert in production unless the flag is explicitly set.
 */

function mockResult<T>(content: T, model: string): LlmResult<T> {
  return {
    content,
    usage: { input_tokens: 128, output_tokens: 256 },
    model,
    latency_ms: 5,
  };
}

function titleFrom(o: LlmCallOptions): string {
  const idea = o.prompt?.match(/# Idea\n(.+)/)?.[1]?.slice(0, 60) ?? "Project";
  return idea.trim();
}

/** Test hook: throw when the system prompt matches MESH_MOCK_FAIL (fault injection). */
function maybeFail(o: LlmCallOptions) {
  const marker = process.env.MESH_MOCK_FAIL;
  if (marker && o.system?.includes(marker)) {
    throw new Error(`injected mock failure for: ${marker}`);
  }
}

const mockDeps: MeshDeps = {
  async generate(o) {
    maybeFail(o);
    const md = `# ${titleFrom(o)}\n\n_(MESH_MOCK output)_\n\nThis is placeholder Markdown generated with model \`${o.model}\` for local end-to-end verification. Replace MESH_MOCK with a real MESH_API_KEY for real content.\n\n## Section\n- point one\n- point two\n`;
    return mockResult(md, o.model);
  },
  async generateStructured<T>(o: LlmCallOptions, schema: z.ZodType<T>) {
    maybeFail(o);
    const research = {
      problemStatement: `Mock problem framing for: ${titleFrom(o)}`,
      targetUsers: ["solo builders", "small teams"],
      competitors: [{ name: "Existing Tool", note: "adjacent solution" }],
      marketNotes: ["mock market note"],
      risks: ["mock risk"],
    };
    const tickets = {
      epics: [
        {
          name: "E0 — Foundation",
          tickets: [
            {
              id: "T-001",
              title: "Scaffold project",
              priority: "MUST-HAVE",
              description: "Set up the base app.",
              acceptanceCriteria: ["boots cleanly"],
              dependencies: [],
            },
          ],
        },
      ],
    };
    const chosen = schema.safeParse(research).success ? research : tickets;
    return mockResult(schema.parse(chosen), o.model);
  },
  async generateWithSearch(o) {
    return this.generate(o);
  },
  async vectorSearch() {
    return [];
  },
};

const realDeps: MeshDeps = {
  generate: mesh.generate,
  generateStructured: mesh.generateStructured,
  generateWithSearch: mesh.generateWithSearch,
  vectorSearch: mesh.vectorSearch,
};

export function getMeshDeps(): MeshDeps {
  return process.env.MESH_MOCK === "true" ? mockDeps : realDeps;
}
