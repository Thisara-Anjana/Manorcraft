import { DEMO_ACCOUNTS, demoAccountsEnabled, type DemoRole } from "@/lib/demo-accounts";
import { Button } from "@/components/ui/button";

/**
 * Subtle "Demo Access" block. Clicking a card fills the credentials into the
 * sign-in form — it never submits on the user's behalf.
 */
export function DemoAccess({
  roles,
  onPick,
}: {
  roles: DemoRole[];
  onPick: (email: string, password: string) => void;
}) {
  if (!demoAccountsEnabled) return null;

  return (
    <div className="mt-8 rounded-sm border border-border/80 bg-secondary/30 p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Demo Access</p>
      <div className="mt-3 grid gap-2">
        {roles.map((role) => {
          const account = DEMO_ACCOUNTS[role];
          return (
            <Button
              key={role}
              type="button"
              variant="outline"
              className="h-auto w-full justify-between px-3 py-2.5 text-left font-normal"
              onClick={() => onPick(account.email, account.password)}
            >
              <span className="text-xs font-medium uppercase tracking-[0.14em]">
                {account.label}
              </span>
              <span className="truncate text-[0.7rem] text-muted-foreground">{account.email}</span>
            </Button>
          );
        })}
      </div>
      <p className="mt-3 text-[0.68rem] leading-relaxed text-muted-foreground/80">
        Demo accounts are for presentation/testing only.
      </p>
    </div>
  );
}
