import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import Shell from "@/components/Shell";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/login");
  return <DataProvider><Shell>{children}</Shell></DataProvider>;
}
