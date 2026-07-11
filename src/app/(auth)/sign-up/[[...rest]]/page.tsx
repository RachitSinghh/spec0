import { redirect } from "next/navigation";

/** Sign-up is folded into the combined /sign-in flow (`withSignUp`). */
export default function SignUpPage() {
  redirect("/sign-in");
}
