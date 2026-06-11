import 'dotenv/config';

// One-time Piston setup: installs the language runtimes the platform supports.
// Usage: npx ts-node scripts/setup-piston.ts

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';
const WANTED = ['python', 'javascript', 'c++', 'java'];

async function main() {
  const runtimesResp = await fetch(`${PISTON_URL}/api/v2/runtimes`);
  if (!runtimesResp.ok) {
    console.error(`Piston not reachable at ${PISTON_URL} — docker compose up -d first.`);
    process.exit(1);
  }
  const installed = (await runtimesResp.json()) as any[];
  const has = (lang: string) =>
    installed.some((r) => r.language === lang || (r.aliases || []).includes(lang));

  const pkgResp = await fetch(`${PISTON_URL}/api/v2/packages`);
  const packages = (await pkgResp.json()) as any[];

  for (const lang of WANTED) {
    if (has(lang)) {
      console.log(`  ${lang}: already installed`);
      continue;
    }
    // pick the newest available package version for the language
    // (the "gcc" package provides c++; the "node" package provides javascript)
    const candidates = packages.filter(
      (p) =>
        p.language === lang ||
        (lang === 'c++' && p.language === 'gcc') ||
        (lang === 'javascript' && p.language === 'node')
    );
    if (candidates.length === 0) {
      console.error(`  ${lang}: no package available in the Piston index`);
      continue;
    }
    const pick = candidates.sort((a, b) =>
      b.language_version.localeCompare(a.language_version, undefined, { numeric: true })
    )[0];
    console.log(`  ${lang}: installing ${pick.language} ${pick.language_version}...`);
    const resp = await fetch(`${PISTON_URL}/api/v2/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: pick.language, version: pick.language_version }),
    });
    if (resp.ok) console.log(`  ${lang}: installed`);
    else console.error(`  ${lang}: install failed — ${await resp.text()}`);
  }

  const finalResp = await fetch(`${PISTON_URL}/api/v2/runtimes`);
  const final = (await finalResp.json()) as any[];
  console.log('\nInstalled runtimes:');
  for (const r of final) console.log(`  ${r.language} ${r.version} (aliases: ${(r.aliases || []).join(', ')})`);
}

main().catch((e) => {
  console.error('setup-piston failed:', e);
  process.exit(1);
});
