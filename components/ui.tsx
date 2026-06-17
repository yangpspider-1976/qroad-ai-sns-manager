import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const panelClass = "rounded-lg bg-panel p-[22px] shadow-paper-edge";
export const tableWrapClass = "overflow-hidden rounded-lg bg-panel shadow-paper-edge";
export const tableScrollClass = "overflow-auto";
export const tableClass = "min-w-[900px] w-full border-collapse text-sm";
export const thClass = "border-b border-line bg-[#f8fafc] px-4 py-3.5 text-left text-[13px] font-bold text-muted";
export const tdClass = "border-b border-line px-4 py-3.5 align-top";
export const sectionHeadingClass = "mb-4 flex items-start justify-between gap-4";
export const fieldNoteClass = "text-[13px] leading-[1.35] text-muted";
export const actionsClass = "flex flex-wrap items-center gap-2";
export const formGridClass = "grid grid-cols-1 gap-3.5 min-[921px]:grid-cols-2";
export const formActionsClass = "mt-4 flex flex-wrap items-center justify-end gap-2";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function buttonClass(variant: ButtonProps["variant"] = "primary") {
  const base =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 font-medium leading-[1.2] no-underline disabled:cursor-not-allowed disabled:opacity-70";
  if (variant === "secondary") return `${base} border-line bg-white text-ink hover:border-slate-300 hover:bg-[#f8fafc]`;
  if (variant === "danger") return `${base} border-red-300 bg-white text-danger hover:border-[#991b1b] hover:bg-red-50`;
  return `${base} border-accent bg-accent text-white hover:bg-accent-dark`;
}

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${panelClass} ${className}`}>{children}</section>;
}

export function Notice({
  children,
  tone = "info",
  className = ""
}: {
  children: ReactNode;
  tone?: "info" | "warning";
  className?: string;
}) {
  const toneClass =
    tone === "warning"
      ? "border-[#f6c56f] bg-[#fff8eb] text-warn"
      : "border-blue-200 bg-blue-50 text-blue-800";
  return <div className={`rounded-lg border px-[13px] py-3 leading-[1.45] ${toneClass} ${className}`}>{children}</div>;
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid min-h-[132px] content-between gap-3.5 rounded-lg bg-panel p-[22px] shadow-paper-edge">
      <span className="text-[13px] text-muted">{label}</span>
      <strong className="text-4xl font-medium leading-none">{value}</strong>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className={tableWrapClass}>
      <div className={tableScrollClass}>{children}</div>
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(16,35,31,0.42)] p-6">
      <div className="w-[min(500px,100%)] overflow-hidden rounded-lg bg-white shadow-[0_18px_60px_rgba(16,35,31,0.22),0_0_0_1px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4 px-6 py-6">
          <div>
            <h2 className="m-0 text-[20px] font-medium leading-tight text-ink">{title}</h2>
            {subtitle ? <p className="mt-3 leading-[1.45] text-[#536275]">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Close modal"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-[#f8fafc]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        {children ? <div className="px-6 pb-6 leading-[1.55] text-ink">{children}</div> : null}
        <div className="flex items-center justify-end gap-3 border-t border-line bg-[#f8fafc] px-6 py-3">{footer}</div>
      </div>
    </div>
  );
}

export function ConfirmationModal({
  title,
  subtitle,
  body,
  confirmLabel,
  confirmVariant = "danger",
  onCancel,
  onConfirm
}: {
  title: string;
  subtitle?: string;
  body: ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      footer={
        <>
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} type="button" variant={confirmVariant}>
            {confirmLabel}
          </Button>
        </>
      }
      onClose={onCancel}
      subtitle={subtitle}
      title={title}
    >
      {body}
    </Modal>
  );
}
