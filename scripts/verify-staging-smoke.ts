/**
 * Post-deploy smoke probe for the stable staging URL.
 *
 * Does not authenticate or print secrets. Confirms HTTPS reachability,
 * redirect-to-sign-in for the root path, and that static responses are healthy.
 *
 * Usage:
 *   npm run verify:staging
 *   npm run verify:staging -- --url https://jella-home-staging.netlify.app
 */

const DEFAULT_URL = "https://jella-home-staging.netlify.app";

function parseArgs(argv: string[]): { url: string } {
  let url = DEFAULT_URL;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--url" && argv[i + 1]) {
      url = argv[i + 1];
      i += 1;
    }
  }
  return { url: url.replace(/\/$/, "") };
}

async function fetchStatus(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; location: string | null; finalUrl: string }> {
  const response = await fetch(url, {
    redirect: "manual",
    ...init,
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    finalUrl: response.url,
  };
}

async function main(): Promise<void> {
  const { url } = parseArgs(process.argv.slice(2));
  const failures: string[] = [];

  if (!url.startsWith("https://")) {
    failures.push(`URL must be https: ${url}`);
  }

  try {
    const root = await fetchStatus(`${url}/`);
    if (root.status !== 307 && root.status !== 302 && root.status !== 303) {
      failures.push(
        `Expected redirect from / to sign-in, got HTTP ${root.status}`,
      );
    } else {
      const location = root.location ?? "";
      if (!location.includes("/sign-in")) {
        failures.push(
          `Root redirect did not target /sign-in (got ${location})`,
        );
      }
    }

    const signIn = await fetchStatus(`${url}/sign-in`);
    if (signIn.status !== 200) {
      // Follow one hop if Netlify returns a redirect to trailing slash, etc.
      if (
        (signIn.status === 301 ||
          signIn.status === 302 ||
          signIn.status === 307 ||
          signIn.status === 308) &&
        signIn.location
      ) {
        const nextUrl = new URL(signIn.location, url).toString();
        const followed = await fetch(nextUrl, { redirect: "follow" });
        if (!followed.ok) {
          failures.push(
            `/sign-in followed redirect but returned HTTP ${followed.status}`,
          );
        }
      } else {
        failures.push(`/sign-in returned HTTP ${signIn.status}`);
      }
    }

    const budget = await fetchStatus(`${url}/budget`);
    if (
      budget.status !== 307 &&
      budget.status !== 302 &&
      budget.status !== 303
    ) {
      failures.push(
        `Protected /budget should redirect unauthenticated visitors, got HTTP ${budget.status}`,
      );
    } else if (!(budget.location ?? "").includes("/sign-in")) {
      failures.push(
        `Protected /budget redirect did not target /sign-in (got ${budget.location})`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`Request failed: ${message}`);
  }

  if (failures.length > 0) {
    console.error("Staging smoke verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Staging smoke verification passed for ${url}`);
  console.log("Checked: HTTPS root redirect, /sign-in, protected /budget");
}

void main();
