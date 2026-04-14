import { redirect } from "next/navigation";

/** @deprecated Use `/login?register=1` */
export default function RegisterRedirectPage() {
  redirect("/login?register=1");
}
