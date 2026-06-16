import { SidebarNav } from "./sidebar-nav";
import { actionsClass } from "./ui";
import type { Workspace } from "@/lib/types";

type ShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  initialWorkspaces?: Workspace[];
  initialSelectedWorkspaceId?: string;
};

export function Shell({ title, subtitle, children, actions, initialWorkspaces, initialSelectedWorkspaceId }: ShellProps) {
  return (
    <div className="min-h-screen">
      <SidebarNav initialSelectedWorkspaceId={initialSelectedWorkspaceId} initialWorkspaces={initialWorkspaces} />
      <main className="min-w-0 px-6 py-8 min-[921px]:ml-[264px]">
        <header className="mb-[18px] flex items-center justify-between gap-[18px]">
          <div>
            <h1 className="m-0 text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-[#536275]">{subtitle}</p>
          </div>
          {actions ? <div className={actionsClass}>{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
