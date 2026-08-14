import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Manorcraft-branded toasts: deep navy surface, brass hairline and accents.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border group-[.toaster]:border-brass/40 group-[.toaster]:rounded-sm group-[.toaster]:shadow-xl group-[.toaster]:font-sans",
          title: "group-[.toast]:font-display group-[.toast]:text-base group-[.toast]:tracking-wide",
          description: "group-[.toast]:text-primary-foreground/70 group-[.toast]:text-sm",
          icon: "group-[.toast]:text-brass",
          success: "group-[.toaster]:border-brass/70",
          error: "group-[.toaster]:border-destructive/70",
          actionButton:
            "group-[.toast]:bg-brass group-[.toast]:text-primary group-[.toast]:rounded-sm",
          cancelButton:
            "group-[.toast]:bg-primary-foreground/10 group-[.toast]:text-primary-foreground/80",
          closeButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:border-brass/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
