// The gateway serves the host and its embedded page from the same origin.
import "@fred-oss/design-tokens/tokens.css";
import "@fred-oss/design-tokens/fonts.css";
import "@fred-oss/ui/styles.css";
import "./page.css";
import {
  createFredApplicationClient,
  type FredApplicationClient,
} from "@fred-oss/iframe-sdk";
import { ServiceNotice, ToastProvider } from "@fred-oss/ui";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { APP_ID } from "../../app-id.ts";
import { App } from "./App.tsx";
import { messageOf } from "./format.ts";

type Theme = "light" | "dark";

function Shell({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <main className="fred-ui e2e-shell" data-theme={theme}>
      <ToastProvider dismissLabel="Dismiss">{children}</ToastProvider>
    </main>
  );
}

function Connected({ fred }: { fred: FredApplicationClient }) {
  const [theme, setTheme] = useState<Theme>(fred.context?.theme ?? "light");
  useEffect(
    () => fred.onContext((context) => setTheme(context.theme ?? "light")),
    [fred],
  );
  return (
    <Shell theme={theme}>
      <App fred={fred} />
    </Shell>
  );
}

/** The SDK throws at once outside a frame, and rejects when no host answers. */
async function connect(): Promise<FredApplicationClient> {
  const fred = createFredApplicationClient({
    hostOrigin: window.location.origin,
    applicationId: APP_ID,
  });
  await fred.connect();
  return fred;
}

const root = createRoot(document.getElementById("root") as HTMLElement);
void connect().then(
  (fred) => root.render(<Connected fred={fred} />),
  (error: unknown) =>
    root.render(
      <Shell theme="light">
        <ServiceNotice
          icon="cloud_off"
          title="This page runs inside Fred."
          description={`Open it from your team's applications in Fred. (${messageOf(error)})`}
          centered
        />
      </Shell>,
    ),
);
