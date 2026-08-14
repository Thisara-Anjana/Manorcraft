import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND_LOGO_QUERY_KEY, useBrandLogo } from "@/hooks/useBrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Manorcraft Admin" },
      {
        name: "description",
        content: "Upload the Manorcraft company logo and configure workspace branding.",
      },
      { property: "og:title", content: "Settings | Manorcraft Admin" },
      {
        property: "og:description",
        content: "Upload the Manorcraft company logo and configure workspace branding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

const MAX_BYTES = 2 * 1024 * 1024;

function AdminSettings() {
  const logo = useBrandLogo();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const saveLogoPath = async (path: string | null) => {
    const { error } = await supabase
      .from("brand_settings")
      .update({ logo_path: path })
      .eq("id", true);
    if (error) throw new Error(error.message);
    await queryClient.invalidateQueries({ queryKey: BRAND_LOGO_QUERY_KEY });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG or SVG).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo must be smaller than 2 MB.");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("brand_assets")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);

      const previous = logo.data?.path;
      await saveLogoPath(path);
      if (previous && previous !== path) {
        await supabase.storage.from("brand_assets").remove([previous]);
      }
      toast.success("Logo updated", { description: "It now appears across the whole app." });
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    setBusy(true);
    try {
      const path = logo.data?.path;
      await saveLogoPath(null);
      if (path) await supabase.storage.from("brand_assets").remove([path]);
      toast.success("Logo removed", { description: "The wordmark is back in the navigation." });
    } catch (e) {
      toast.error("Could not remove the logo", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Branding and workspace preferences for the Manorcraft network.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Company Logo</CardTitle>
          <CardDescription>
            Upload a PNG, JPG or SVG (max 2 MB). It replaces the Manorcraft wordmark in the main
            navigation across every portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-24 w-48 items-center justify-center rounded-md border border-brass/40 bg-primary p-3">
              {logo.isPending ? (
                <Skeleton className="h-12 w-32" />
              ) : logo.data?.url ? (
                <img
                  src={logo.data.url}
                  alt="Manorcraft company logo"
                  className="max-h-16 max-w-full object-contain"
                />
              ) : (
                <span className="font-display text-xl uppercase tracking-[0.18em] text-primary-foreground">
                  Manorcraft
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <Button variant="brass" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageUp className="mr-2 h-4 w-4" />
                )}
                {logo.data?.url ? "Replace logo" : "Upload logo"}
              </Button>
              {logo.data?.url && (
                <Button variant="ghost" disabled={busy} onClick={() => void removeLogo()}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Service categories, coverage districts and dispatch preferences.
        </CardContent>
      </Card>
    </div>
  );
}
