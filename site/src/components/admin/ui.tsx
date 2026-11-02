import type { ReactNode } from "react";
import { ORDER_STATUS, STATUS_STYLE, type OrderStatus } from "@/lib/admin-labels";
import { cn } from "@/lib/utils";

export const adminCard = "rounded-2xl border bg-card p-5 shadow-soft lg:p-6";
export const adminInput =
  "h-12 w-full rounded-xl border border-input bg-card px-4 outline-none focus:border-gold aria-invalid:border-destructive";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-bold",
        STATUS_STYLE[status],
      )}
    >
      {ORDER_STATUS[status]}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold leading-tight lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function FieldError({ message }: { message?: string | undefined }) {
  return message ? (
    <span className="mt-1 block text-sm font-medium text-destructive">{message}</span>
  ) : null;
}

export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        tone === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-whatsapp-soft font-semibold text-whatsapp",
      )}
    >
      {children}
    </p>
  );
}
