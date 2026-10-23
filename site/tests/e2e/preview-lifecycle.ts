import { execFileSync } from 'node:child_process';

const PREVIEW_PORT = 4321;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
const READY_TIMEOUT_MS = 120_000;
const READY_POLL_INTERVAL_MS = 250;
const PREVIEW_START_ATTEMPTS = 3;

// `--background` is NOT decoration. Astro's preview command decides between a
// foreground server and a detached daemon by asking whether an AI coding agent is
// running it:
//
//     const agentDetected = !process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent();
//     if (flags.background || agentDetected) { await background(...); return; }
//
// `isRunByAgent()` reads the environment for the variables agent CLIs set. So this
// file's original comment — "this Astro version starts the preview server as a
// background daemon and returns" — described a machine, not a version: it returned
// because an agent happened to be running the suite. On a CI runner the same command
// blocks in the foreground forever, execFileSync never returns, globalSetup never
// finishes, and the job dies at its timeout having run zero tests and printed nothing.
// That cost three cancelled CI runs, and was read as "the suite is slow" twice before
// it was read as a hang.
//
// Reproduced locally before being fixed, by unsetting the one variable that decides it:
//
//     env -u CLAUDECODE node <playwright cli> test
//
// Asking for the daemon explicitly makes the behaviour independent of who is running
// the command, which is the property this suite actually needs. Owning the daemon's
// lifecycle here — rather than through Playwright's `webServer` option — is still right
// for the original reason: `webServer` manages a FOREGROUND process and reads the
// parent's exit as a failure, which races with the URL coming up.
function runAstro(args: string[]) {
  execFileSync('npx', ['astro', ...args], {
    cwd: new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    stdio: 'inherit',
    shell: true,
  });
}

// `astro preview --background` waits for its own daemon and gives up on a 30s deadline
// hardcoded in astro's CLI (dist/cli/server.js, `const timeout = 3e4`) — not
// configurable, and not enough on a dev machine that is busy: a parallel typecheck
// build on the same box pushes the daemon's first answer past the deadline, the
// start exits 1, and globalSetup dies having run zero tests. Observed twice on
// 2026-10-22, both times under load and both times healthy on the immediate retry.
// So: retry. The failed attempt leaves the daemon's lock file behind; `preview
// stop` clears it before each attempt, the same cleanup the global teardown runs.
function startPreviewDaemon() {
  for (let attempt = 1; attempt <= PREVIEW_START_ATTEMPTS; attempt += 1) {
    try {
      runAstro(['preview', '--background']);
      return;
    } catch (error) {
      if (attempt === PREVIEW_START_ATTEMPTS) throw error;
      runAstro(['preview', 'stop']);
    }
  }
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
  startPreviewDaemon();
  await waitUntilPreviewAnswers();

  return async () => {
    runAstro(['preview', 'stop']);
  };
}
