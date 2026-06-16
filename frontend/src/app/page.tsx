import { redirect } from "next/navigation";
import { pages } from "@/lib/navigation/routes";

export default function RootRedirect() {
  redirect(pages.home);
}
