import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { z } from "zod";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Loader2,
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
import { formatLKR, formatTime } from "@/lib/booking-status";
import { createBooking } from "@/lib/portal.functions";
import { listCities, listDistricts } from "@/lib/locations.functions";
import { listServices } from "@/lib/services.functions";

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

const TIME_SLOTS = ["08:00", "10:00", "13:00", "15:00", "17:00"];

const steps = [
  { title: "Service Details", icon: Wrench },
  { title: "Location", icon: MapPin },
  { title: "Scheduling", icon: Clock },
];

const stepSchemas = [
  z.object({
    serviceId: z.string().uuid("Please select a service."),
    issue: z
      .string()
      .trim()
      .min(10, "Please describe the issue in at least 10 characters.")
      .max(1000, "Description must be under 1000 characters."),
  }),
  z.object({
    districtId: z.string().uuid("Please select your district."),
    cityId: z.string().uuid("Please select your city."),
    address: z
      .string()
      .trim()
      .min(8, "Please enter your full address.")
      .max(300, "Address must be under 300 characters."),
  }),
  z.object({
    date: z.date({ message: "Please choose a preferred date." }),
    slot: z.string().min(1, "Please select a time slot."),
  }),
];

type FormState = {
  serviceId: string;
  issue: string;
  districtId: string;
  cityId: string;
  address: string;
  date: Date | undefined;
  slot: string;
};

const initialState: FormState = {
  serviceId: "",
  issue: "",
  districtId: "",
  cityId: "",
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
      <Label
        htmlFor={htmlFor}
        className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
      >
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
  const [confirmed, setConfirmed] = useState<{ bookingNumber: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useServerFn(listServices);
  const fetchDistricts = useServerFn(listDistricts);
  const fetchCities = useServerFn(listCities);
  const submit = useServerFn(createBooking);

  const services = useQuery({ queryKey: ["services"], queryFn: () => fetchServices({}) });
  const districts = useQuery({ queryKey: ["districts"], queryFn: () => fetchDistricts({}) });
  const cities = useQuery({
    queryKey: ["cities", form.districtId],
    queryFn: () => fetchCities({ data: { districtId: form.districtId } }),
    enabled: !!form.districtId,
  });

  const selectedService = (services.data ?? []).find((s) => s.service_id === form.serviceId);
  const selectedDistrict = (districts.data ?? []).find((d) => d.id === form.districtId);

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

  const handleConfirm = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const result = await submit({
        data: {
          serviceId: form.serviceId,
          districtId: form.districtId,
          cityId: form.cityId,
          address: form.address.trim(),
          problemDescription: form.issue.trim(),
          scheduledDate: form.date ? format(form.date, "yyyy-MM-dd") : "",
          scheduledTime: form.slot,
        },
      });
      setConfirmed({ bookingNumber: result.bookingNumber });
      toast.success("Booking confirmed", {
        description: "A Manorcraft coordinator will confirm your visit shortly.",
      });
    } catch (error) {
      toast.error("Could not create your booking", { description: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
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
              {selectedService?.name} in {selectedDistrict?.name} on{" "}
              {form.date ? format(form.date, "PPP") : ""} · {formatTime(form.slot)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-brass">
              {confirmed.bookingNumber}
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                variant="brass"
                size="xl"
                onClick={() => {
                  setForm(initialState);
                  setStep(0);
                  setConfirmed(null);
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
                  <Field label="Service" error={errors["serviceId"]}>
                    <Select value={form.serviceId} onValueChange={(v) => set("serviceId", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={services.isPending ? "Loading services…" : "Select a service"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(services.data ?? []).map((s) => (
                          <SelectItem key={s.service_id} value={s.service_id}>
                            {s.name} · from {formatLKR(s.starting_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {selectedService && (
                    <p className="rounded-sm bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
                      Typical visit {selectedService.estimated_duration_minutes} min · hourly rate{" "}
                      {formatLKR(selectedService.hourly_rate)}
                    </p>
                  )}

                  <Field label="Describe the issue" error={errors["issue"]} htmlFor="issue">
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
                  <Field label="District" error={errors["districtId"]}>
                    <Select
                      value={form.districtId}
                      onValueChange={(v) => {
                        set("districtId", v);
                        set("cityId", "");
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={
                            districts.isPending ? "Loading districts…" : "Select your district"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(districts.data ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="City / town" error={errors["cityId"]}>
                    <Select
                      value={form.cityId}
                      onValueChange={(v) => set("cityId", v)}
                      disabled={!form.districtId}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={
                            !form.districtId
                              ? "Choose a district first"
                              : cities.isPending
                                ? "Loading cities…"
                                : "Select your city"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(cities.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Full address" error={errors["address"]} htmlFor="address">
                    <Input
                      id="address"
                      maxLength={300}
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
                  <Field label="Preferred date" error={errors["date"]}>
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

                  <Field label="Preferred arrival time" error={errors["slot"]}>
                    <Select value={form.slot} onValueChange={(v) => set("slot", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatTime(t)}
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
                <Button variant="brass" size="xl" onClick={handleConfirm} disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />} Confirm Booking
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
