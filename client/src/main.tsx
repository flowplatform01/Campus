import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { toast } from "@/hooks/use-toast";

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state !== "installed") return;
            if (!navigator.serviceWorker.controller) return;

            toast({
              title: "Update available",
              description: "A new version is ready. Refresh to update.",
              action: (
                <button
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => {
                    try {
                      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Refresh
                </button>
              ),
            });
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      })
      .catch(() => {
        // ignore
      });
  });
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e as BeforeInstallPromptEvent;

  toast({
    title: "Install Campus",
    description: "Install the app for faster access and offline support.",
    action: (
      <button
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={async () => {
          const promptEvt = deferredInstallPrompt;
          if (!promptEvt) return;
          deferredInstallPrompt = null;
          try {
            await promptEvt.prompt();
            await promptEvt.userChoice.catch(() => null);
          } catch {
            // ignore
          }
        }}
      >
        Install
      </button>
    ),
  });
});
