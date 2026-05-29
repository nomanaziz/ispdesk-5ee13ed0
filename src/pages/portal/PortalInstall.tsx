import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Share2, Plus, CheckCircle2, Apple } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PortalInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform] = useState(detectPlatform());

  useEffect(() => {
    setInstalled(isInstalled());
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">অ্যাপ ইনস্টল করুন</h1>
        <p className="text-sm text-muted-foreground">
          মোবাইল হোম স্ক্রিনে ISP Desk যোগ করুন — ঠিক একটি অ্যাপের মতই কাজ করবে।
        </p>
      </div>

      {installed ? (
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-semibold">অ্যাপ ইনস্টল হয়ে গেছে</p>
              <p className="text-sm text-muted-foreground">হোম স্ক্রিন থেকে চালু করুন।</p>
            </div>
          </CardContent>
        </Card>
      ) : platform === "android" || platform === "desktop" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> এক ক্লিকে ইনস্টল
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button size="lg" className="w-full" onClick={install} disabled={!deferred}>
              <Download className="h-5 w-5 mr-2" />
              অ্যাপ ইনস্টল করুন
            </Button>
            {!deferred && (
              <p className="text-sm text-muted-foreground">
                ব্রাউজার এখনো install prompt পাঠায়নি। কয়েক সেকেন্ড অপেক্ষা করুন, অথবা
                ব্রাউজার মেনু থেকে <strong>"Install app"</strong> বা
                <strong> "Add to Home screen"</strong> বেছে নিন।
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" /> iPhone-এ ইনস্টল
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Safari ব্রাউজার ব্যবহার করুন (Chrome/Firefox কাজ করবে না):</p>
            <ol className="space-y-3 list-decimal pl-5">
              <li className="flex items-start gap-2">
                <span>নিচের <Share2 className="inline h-4 w-4 mx-1" /> <strong>Share</strong> বাটন চাপুন</span>
              </li>
              <li className="flex items-start gap-2">
                <span><Plus className="inline h-4 w-4 mx-1" /> <strong>Add to Home Screen</strong> বেছে নিন</span>
              </li>
              <li><strong>Add</strong> চাপুন — তারপর হোম স্ক্রিনে আইকন দেখা যাবে</li>
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>সুবিধাসমূহ</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> হোম স্ক্রিন থেকে এক ট্যাপে চালু</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> Full-screen, ব্রাউজার বার নেই</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> দ্রুত লোড হয়</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> App Store লাগে না</div>
        </CardContent>
      </Card>
    </div>
  );
}
