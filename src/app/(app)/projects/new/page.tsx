import { IntakeForm } from "@/components/intake-form";

/** Idea intake screen (T-031, FRONTEND-SPEC A6.4). */
export default function NewProjectPage() {
  return (
    <div className="flex flex-col gap-sp-5">
      <h2 className="text-h2 uppercase">DESCRIBE YOUR IDEA</h2>
      <IntakeForm />
    </div>
  );
}
