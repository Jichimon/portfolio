import { execFileSync } from 'node:child_process';

const PREVIEW_PORT = 4321;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
const READY_TIMEOUT_MS = 120_000;
const READY_POLL_INTERVAL_MS = 250;

// This Astro version starts the preview server as a BACKGROUND daemon and returns,
// reporting "(background)" even when nothing asked it to. Playwright's own webServer
// option manages a FOREGROUND process and treats an exit before the URL answers as a
// failure, so the two disagree about what starting a server means: the parent exits
// every time, and whether the run survives depends on which happens first — the URL
// coming up, or Playwright noticing the exit. That is a race, and it was observed
// both ways within one session. Owning the daemon's lifecycle here removes it.
function runAstro(args: string[]) {
  execFileSync('npx', ['astro', ...args], {
    cwd: new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    stdio: 'inherit',
    shell: true,
  });
}

async function waitUntilPreviewAnswers() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(PREVIEW_URL, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
  throw new Error(`preview server did not answer at ${PREVIEW_URL} within ${READY_TIMEOUT_MS}ms`);
}

export default async function globalSetup() {
  // Stop first, so a daemon left over from an earlier run cannot serve a stale
  // dist/ to this one. That failure is silent and total: the suite passed 18/18
  // with the home page module renamed out of the tree, because it was talking to
  // a build from twenty minutes earlier.
  runAstro(['preview', 'stop']);
  runAstro(['build']);
  runAstro(['preview']);
  await waitUntilPreviewAnswers();

  return async () => {
    runAstro(['preview', 'stop']);
  };
}
