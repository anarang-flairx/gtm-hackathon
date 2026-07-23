import { redirect } from "next/navigation";

export default function ClosedRedirectPage() {
  redirect("/customers");
}
