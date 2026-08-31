import { prepareTrialPair } from "../src/prepare.mjs";

const usage = `Usage:
  pnpm benchmark:prepare --task <task-id> --pair <pair-id> --agent-label <label> --agent-version <version> --agent-config-hash <sha256>
`;

function parseArguments(argv) {
  const values = {};
  const names = new Set(["--task", "--pair", "--agent-label", "--agent-version", "--agent-config-hash"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (name === "--help" || name === "-h") return { help: true };
    if (!names.has(name)) return { error: `Unknown option: ${name}` };
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) return { error: `${name} requires a value.` };
    if (values[name]) return { error: `${name} may be provided once.` };
    values[name] = value;
    index += 1;
  }
  const missing = [...names].filter((name) => !values[name]);
  if (missing.length > 0) return { error: `Missing required option: ${missing[0]}` };
  return {
    options: {
      taskId: values["--task"],
      pairId: values["--pair"],
      agentLabel: values["--agent-label"],
      agentVersion: values["--agent-version"],
      agentConfigurationHash: values["--agent-config-hash"],
    },
  };
}

const parsed = parseArguments(process.argv.slice(2));
if (parsed.help) {
  process.stdout.write(usage);
} else if (parsed.error) {
  process.stderr.write(`${parsed.error}\n${usage}`);
  process.exitCode = 2;
} else {
  try {
    const prepared = await prepareTrialPair(parsed.options);
    const orderedRuns = [...prepared.plan.runs].sort((left, right) => left.order - right.order);
    process.stdout.write(`Prepared reuse-v1 pair ${prepared.plan.pairId} at ${prepared.trialRoot}\n`);
    for (const run of orderedRuns) {
      process.stdout.write(`${run.order}. ${run.condition}: ${prepared.trialRoot}/${run.condition}/AGENT_PROMPT.txt\n`);
    }
    process.stdout.write("Read the prepared README before running either prompt. This is not a benchmark result.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "reuse-v1 preparation failed."}\n`);
    process.exitCode = 1;
  }
}
