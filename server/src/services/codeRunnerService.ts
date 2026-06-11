// Piston client — all user code runs inside the Piston sandbox container,
// never in this process. PISTON_URL points at the docker-compose service
// (default http://localhost:2000).
//
// Piston has no built-in expected-output grading, so pass/fail is decided
// here by comparing trimmed stdout against the expected output.

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

// language name + main filename as Piston expects them
export const LANGUAGES: Record<string, { piston: string; file: string }> = {
  python: { piston: 'python', file: 'main.py' },
  javascript: { piston: 'javascript', file: 'main.js' },
  cpp: { piston: 'c++', file: 'main.cpp' },
  java: { piston: 'java', file: 'Main.java' },
};

let runtimeVersions: Record<string, string> | null = null;

export interface RunResult {
  status: string; // "Accepted", "Wrong Answer", "Runtime Error", "Time Limit Exceeded", "Compilation Error"
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  timeSec: number | null;
  memoryKb: number | null;
}

export async function runnerAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${PISTON_URL}/api/v2/runtimes`, {
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// Resolves the installed version for each supported language (cached).
async function getVersion(language: string): Promise<string> {
  if (!runtimeVersions) {
    const resp = await fetch(`${PISTON_URL}/api/v2/runtimes`);
    if (!resp.ok) throw new Error(`Piston runtimes error ${resp.status}`);
    const runtimes = (await resp.json()) as any[];
    runtimeVersions = {};
    for (const [key, cfg] of Object.entries(LANGUAGES)) {
      const rt = runtimes.find(
        (r) => r.language === cfg.piston || (r.aliases || []).includes(cfg.piston)
      );
      if (rt) runtimeVersions[key] = rt.version;
    }
  }
  const v = runtimeVersions[language];
  if (!v) {
    throw new Error(
      `Runtime for "${language}" is not installed in Piston — run scripts/setup-piston.ts`
    );
  }
  return v;
}

export async function runSubmission(opts: {
  source: string;
  language: string;
  stdin: string;
  expectedOutput?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}): Promise<RunResult> {
  const cfg = LANGUAGES[opts.language];
  if (!cfg) throw new Error(`Unsupported language: ${opts.language}`);
  const version = await getVersion(opts.language);

  const resp = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: cfg.piston,
      version,
      files: [{ name: cfg.file, content: opts.source }],
      stdin: opts.stdin,
      run_timeout: opts.timeLimitMs ?? 2000,
      compile_timeout: 10000,
      run_memory_limit: (opts.memoryLimitMb ?? 256) * 1024 * 1024,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!resp.ok) throw new Error(`Piston error ${resp.status}: ${await resp.text()}`);
  const data: any = await resp.json();

  const compile = data.compile;
  const run = data.run;

  if (compile && compile.code !== 0 && compile.code !== null) {
    return {
      status: 'Compilation Error',
      passed: false,
      stdout: null,
      stderr: null,
      compileOutput: compile.output || compile.stderr || null,
      timeSec: null,
      memoryKb: null,
    };
  }

  const stdout: string = run?.stdout ?? '';
  const stderr: string = run?.stderr ?? '';
  let status: string;
  let passed = false;

  if (run?.signal === 'SIGKILL') {
    // Piston kills on timeout or memory blowout
    status = 'Time/Memory Limit Exceeded';
  } else if (run?.code !== 0) {
    status = 'Runtime Error';
  } else if (opts.expectedOutput === undefined) {
    status = 'Executed';
    passed = true;
  } else if (normalize(stdout) === normalize(opts.expectedOutput)) {
    status = 'Accepted';
    passed = true;
  } else {
    status = 'Wrong Answer';
  }

  return {
    status,
    passed,
    stdout: stdout || null,
    stderr: stderr || null,
    compileOutput: compile?.output || null,
    timeSec: run?.wall_time != null ? run.wall_time / 1000 : null,
    memoryKb: run?.memory != null ? Math.round(run.memory / 1024) : null,
  };
}

// trim trailing whitespace per line + trailing newlines, so cosmetic
// whitespace differences don't fail a correct solution
function normalize(s: string): string {
  return s
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
    .trim();
}

export interface CaseResult extends RunResult {
  caseIndex: number;
  isSample: boolean;
  weight: number;
}

// Runs source against test cases sequentially; stops early on compile errors
// since every case would fail identically.
export async function runAgainstCases(
  source: string,
  language: string,
  cases: { input: string; expectedOutput: string; isSample: boolean; weight: number }[],
  limits: { timeLimitMs: number; memoryLimitMb: number }
): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const r = await runSubmission({
      source,
      language,
      stdin: c.input,
      expectedOutput: c.expectedOutput,
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
    });
    results.push({ ...r, caseIndex: i, isSample: c.isSample, weight: c.weight });
    if (r.status === 'Compilation Error') break;
  }
  return results;
}
