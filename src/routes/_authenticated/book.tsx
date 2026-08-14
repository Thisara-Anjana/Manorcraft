import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { z } from "zod";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  MapPin,
  Wrench,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/book")({
  head: () => ({
    meta: [
      { title: "Book a Service | Manorcraft" },
      {
        name: "description",
        content:
          "Book a verified Manorcraft technician in three steps — choose your service, confirm your district, and pick a time that suits you.",
      },
      { property: "og:title", content: "Book a Service | Manorcraft" },
      {
        property: "og:description",
        content: "Schedule premium plumbing, electrical, masonry or AC repair across Sri Lanka.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

const SERVICES = ["Plumbing", "Electrical", "Masonry", "AC Repair"];
const DISTRICTS = ["Colombo", "Kandy", "Anuradhapura"];
const TIME_SLOTS = [
  "08:00 – 10:00",
  "10:00 – 12:00",
  "13:00 – 15:00",
  "15:00 – 17:00",
  "17:00 – 19:00",
];

const steps = [
  { title: "Service Details", icon: Wrench },
  { title: "Location", icon: MapPin },
  { title: "Scheduling", icon: Clock },
];

const stepSchemas = [
  z.object({
    service: z.string().min(1, "Please select a service category."),
    issue: z
      .string()
      .trim()
      .min(10, "Please describe the issue in at least 10 characters.")
      .max(1000, "Description must be under 1000 characters."),
  }),
  z.object({
    district: z.string().min(1, "Please select your district."),
    address: z
      .string()
      .trim()
      .min(8, "Please enter your full address.")
      .max(200, "Address must be under 200 characters."),
  }),
  z.object({
    date: z.date({ required_error: "Please choose a preferred date." }),
    slot: z.string().min(1, "Please select a time slot."),
  }),
];

type FormState = {
  service: string;
  issue: string;
  district: string;
  address: string;
  date: Date | undefined;
  slot: string;
};

const initialState: FormState = {
  service: "",
  issue: "",
  district: "",
  address: "",
  date: undefined,
  slot: "",
};

function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
  htmlFor?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function BookPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validateStep = () => {
    const schema = stepSchemas[step]!;
    const result = schema.safeParse(form as never);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      next[String(issue.path[0])] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleConfirm = () => {
    if (!validateStep()) return;
    setConfirmed(true);
    toast.success("Booking confirmed", {
      description: `A Manorcraft technician will contact you shortly.`,
    });
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <SiteNav solid />

      <main className="mx-auto max-w-3xl px-6 pt-14 pb-24">
        <div className="text-center">
          <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
            Booking
          </span>
          <h1 className="mt-4 text-4xl font-light text-foreground sm:text-5xl">
            Reserve your craftsman
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Three short steps. Every technician is background-checked, insured and rated by
            Manorcraft households.
          </p>
        </div>

        {confirmed ? (
          <section className="mt-12 rounded-sm border border-border bg-card p-10 text-center shadow-[var(--shadow-luxe)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-sm border border-brass/60 text-brass">
              <PartyPopper />
            </span>
            <h2 className="mt-6 text-3xl font-medium text-foreground">Booking confirmed</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {form.service} in {form.district} on{" "}
              {form.date ? format(form.date, "PPP") : ""} · {form.slot}
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                variant="brass"
                size="xl"
                onClick={() => {
                  setForm(initialState);
                  setStep(0);
                  setConfirmed(false);
                }}
              >
                Book another service
              </Button>
            </div>
          </section>
        ) : (
          <section className="mt-12 overflow-hidden rounded-sm border border-border bg-card shadow-[var(--shadow-luxe)]">
            <ol className="grid grid-cols-3 border-b border-border">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <li
                    key={s.title}
                    className={cn(
                      "flex items-center justify-center gap-3 px-4 py-5 text-center",
                      active && "bg-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-xs",
                        done && "border-brass bg-brass text-accent-foreground",
                        active && "border-brass text-brass",
                        !done && !active && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span
                      className={cn(
                        "hidden text-xs uppercase tracking-[0.14em] sm:block",
                        active || done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.title}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-6 p-8 sm:p-10">
              {step === 0 && (
                <>
                  <Field label="Service category" error={errors['service']}>
                    <Select value={form.service} onValueChange={(v) => set("service", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Describe the issue" error={errors['issue']} htmlFor="issue">
                    <Textarea
                      id="issue"
                      rows={5}
                      maxLength={1000}
                      value={form.issue}
                      onChange={(e) => set("issue", e.target.value)}
                      placeholder="e.g. Persistent leak under the kitchen sink, water pooling since Tuesday."
                    />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="District" error={errors['district']}>
                    <Select value={form.district} onValueChange={(v) => set("district", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your district" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Full address" error={errors['address']} htmlFor="address">
                    <Input
                      id="address"
                      maxLength={200}
                      className="h-11"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="No. 24, Barnes Place, Colombo 07"
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Preferred date" error={errors['date']}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-start text-left font-normal",
                            !form.date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon />
                          {form.date ? format(form.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.date}
                          onSelect={(d) => set("date", d)}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Field label="Preferred time slot" error={errors['slot']}>
                    <Select value={form.slot} onValueChange={(v) => set("slot", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border bg-secondary/60 px-8 py-6 sm:px-10">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
              >
                <ChevronLeft /> Back
              </Button>

              {step < steps.length - 1 ? (
                <Button variant="brass" size="xl" onClick={handleNext}>
                  Next <ChevronRight />
                </Button>
              ) : (
                <Button variant="brass" size="xl" onClick={handleConfirm}>
                  Confirm Booking
                </Button>
              )}
            </div>
          </section>
        )}

        <p className="mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <ShieldCheck className="size-4 text-brass" /> Insured · Vetted · No hidden charges
        </p>
      </main>
    </div>
  );
}
