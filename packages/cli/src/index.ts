import {
  LATTICE_CLI_SCHEMA_VERSION,
  buildReuseContext,
  rankReuseCandidates,
  resolveComponent,
  stableStringify,
  type ComponentResolution,
  type ReuseIndex,
  type UiComponent,
} from "@latticeos/core";
import {
  LATTICE_CONFIG_PATH,
  RepositoryRoot,
  analyzeProject,
  writeReuseIndex,
} from "@latticeos/analyzer";

export const CLI_VERSION = "0.0.0";
export const DEFAULT_CONTEXT_MAX_ITEMS = 8;
export const DEFAULT_CONTEXT_MAX_CHARACTERS = 6_000;

export interface CliIo {
  readonly cwd: string;
  readonly writeStdout: (value: string) => void;
  readonly writeStderr: (value: string) => void;
}

export interface CliRunResult {
  readonly exitCode: number;
}

interface ParsedCommand {
  readonly command: "search" | "inspect" | "context" | "init" | undefined;
  readonly terms: readonly string[];
  readonly rootPath: string;
  readonly json: boolean;
  readonly showHelp: boolean;
  readonly showVersion: boolean;
  readonly initWrite: boolean;
  readonly initDryRun: boolean;
  readonly initForce: boolean;
}

interface InspectResult {
  readonly resolution: ComponentResolution;
  readonly imports: readonly ReuseIndex["imports"][number][];
  readonly usages: readonly ReuseIndex["usages"][number][];
  readonly evidence: readonly ReuseIndex["evidence"][number][];
  readonly diagnostics: readonly ReuseIndex["diagnostics"][number][];
}

interface InitResult {
  readonly action: "create" | "skip";
  readonly mode: "dry-run" | "write";
  readonly path: typeof LATTICE_CONFIG_PATH;
}

const helpText = `LatticeOS Reuse CLI

Usage:
  lattice search <query> [--root <path>] [--json]
  lattice inspect <component-id-or-name> [--root <path>] [--json]
  lattice context <task> [--root <path>] [--json]
  lattice init [--write] [--force] [--dry-run] [--root <path>] [--json]

Global options:
  --root <path>  Analyze this repository instead of the current directory.
  --json         Emit a deterministic versioned JSON envelope.
  --help, -h     Show this help.
  --version, -v  Show the CLI version.

Each analysis is fresh and safely refreshes .lattice/cache/reuse-index.json.
Init plans a committed .lattice/config.json write by default. Use --write to create it.
`;

function defaultIo(): CliIo {
  return {
    cwd: process.cwd(),
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

function parseArguments(argv: readonly string[], cwd: string): ParsedCommand | string {
  let rootPath = cwd;
  let json = false;
  let showHelp = false;
  let showVersion = false;
  let initWrite = false;
  let initDryRun = false;
  let initForce = false;
  let command: ParsedCommand["command"];
  const terms: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index] ?? "";
    if (value === "--help" || value === "-h") {
      showHelp = true;
      continue;
    }
    if (value === "--version" || value === "-v") {
      showVersion = true;
      continue;
    }
    if (value === "--json") {
      json = true;
      continue;
    }
    if (value === "--write") {
      initWrite = true;
      continue;
    }
    if (value === "--dry-run") {
      initDryRun = true;
      continue;
    }
    if (value === "--force") {
      initForce = true;
      continue;
    }
    if (value === "--root") {
      const next = argv[index + 1];
      if (!next || next.startsWith("-")) return "--root requires a path.";
      rootPath = next;
      index += 1;
      continue;
    }
    if (value.startsWith("--root=")) {
      const next = value.slice("--root=".length);
      if (next.length === 0) return "--root requires a path.";
      rootPath = next;
      continue;
    }
    if (value.startsWith("-")) return `Unknown option: ${value}`;
    if (!command) {
      if (value === "search" || value === "inspect" || value === "context" || value === "init") {
        command = value;
      } else {
        return `Unknown command: ${value}`;
      }
      continue;
    }
    terms.push(value);
  }
  if ((initWrite || initDryRun || initForce) && command !== "init") {
    return "--write, --dry-run, and --force are only available with lattice init.";
  }
  if (initWrite && initDryRun) return "lattice init cannot use --write and --dry-run together.";
  if (initForce && !initWrite) return "lattice init requires --write when using --force.";
  return { command, terms, rootPath, json, showHelp, showVersion, initWrite, initDryRun, initForce };
}

function relatedEvidence(index: ReuseIndex, component: UiComponent, imports: InspectResult["imports"], usages: InspectResult["usages"]): InspectResult["evidence"] {
  const ids = new Set<string>([
    ...component.evidenceIds,
    ...component.props.flatMap((prop) => prop.evidenceIds),
    ...imports.flatMap((item) => item.evidenceIds),
    ...usages.flatMap((item) => item.evidenceIds),
  ]);
  return index.evidence.filter((item) => ids.has(item.id));
}

function inspect(index: ReuseIndex, target: string): InspectResult {
  const resolution = resolveComponent(index, target);
  if (resolution.status !== "found") return { resolution, imports: [], usages: [], evidence: [], diagnostics: index.diagnostics };
  const imports = index.imports.filter(
    (item) => item.resolvedComponentId === resolution.component.id || item.importerPath === resolution.component.sourcePath,
  );
  const usages = index.usages.filter((item) => item.componentId === resolution.component.id);
  return {
    resolution,
    imports,
    usages,
    evidence: relatedEvidence(index, resolution.component, imports, usages),
    diagnostics: index.diagnostics,
  };
}

function renderSearch(result: ReturnType<typeof rankReuseCandidates>): string {
  if (result.length === 0) return "No reusable components matched the query.\n";
  return `${result
    .map((item) => `${item.displayName} (${item.sourcePath}) score ${item.score}\n${item.reasons.map((reason) => `  ${reason.message}`).join("\n")}`)
    .join("\n\n")}\n`;
}

function renderInspect(result: InspectResult): string {
  if (result.resolution.status === "not-found") return "No component matched the requested ID or name.\n";
  if (result.resolution.status === "ambiguous") {
    return `Component name is ambiguous:\n${result.resolution.candidates.map((item) => `  ${item.id}`).join("\n")}\n`;
  }
  const component = result.resolution.component;
  return [
    `${component.displayName} (${component.id})`,
    `Source: ${component.sourcePath}`,
    `Props: ${component.props.length === 0 ? "none" : component.props.map((prop) => prop.name).join(", ")}`,
    `Imports: ${result.imports.length}`,
    `Usages: ${result.usages.length}`,
    `Evidence: ${result.evidence.map((item) => item.id).join(", ") || "none"}`,
  ].join("\n") + "\n";
}

function renderInit(result: InitResult): string {
  if (result.mode === "dry-run") {
    if (result.action === "create") {
      return `Would create ${result.path}. Run lattice init --write to create it.\n`;
    }
    return `${result.path} already exists. It would be left unchanged.\n`;
  }
  if (result.action === "create") return `Created ${result.path}.\n`;
  return `${result.path} already exists. Left unchanged.\n`;
}

function emit(io: CliIo, json: boolean, command: string, result: unknown, truncated: boolean): void {
  if (json) {
    io.writeStdout(stableStringify({ schemaVersion: LATTICE_CLI_SCHEMA_VERSION, command, result, truncated }));
    return;
  }
  if (command === "search") io.writeStdout(renderSearch(result as ReturnType<typeof rankReuseCandidates>));
  else if (command === "inspect") io.writeStdout(renderInspect(result as InspectResult));
  else if (command === "context") io.writeStdout((result as ReturnType<typeof buildReuseContext>).text + "\n");
  else io.writeStdout(renderInit(result as InitResult));
}

export async function runCli(argv: readonly string[], suppliedIo: CliIo = defaultIo()): Promise<CliRunResult> {
  const parsed = parseArguments(argv, suppliedIo.cwd);
  if (typeof parsed === "string") {
    suppliedIo.writeStderr(`${parsed}\nRun lattice --help for usage.\n`);
    return { exitCode: 2 };
  }
  if (parsed.showVersion) {
    suppliedIo.writeStdout(`${CLI_VERSION}\n`);
    return { exitCode: 0 };
  }
  if (parsed.showHelp || !parsed.command) {
    suppliedIo.writeStdout(helpText);
    return { exitCode: 0 };
  }
  if (parsed.command === "init") {
    if (parsed.terms.length > 0) {
      suppliedIo.writeStderr("lattice init does not accept positional arguments.\n");
      return { exitCode: 2 };
    }
    try {
      const root = await RepositoryRoot.open(parsed.rootPath);
      const current = await root.inspectLatticeConfig();
      const write = parsed.initWrite;
      const outcome = write ? await root.writeInitialLatticeConfig(parsed.initForce) : undefined;
      const result: InitResult = {
        action: outcome?.status === "created" || (!outcome && current === "missing") ? "create" : "skip",
        mode: write ? "write" : "dry-run",
        path: LATTICE_CONFIG_PATH,
      };
      emit(suppliedIo, parsed.json, "init", result, false);
      return { exitCode: 0 };
    } catch (error) {
      suppliedIo.writeStderr(`${error instanceof Error ? error.message : "LatticeOS initialization failed."}\n`);
      return { exitCode: 1 };
    }
  }
  if (parsed.terms.length === 0) {
    suppliedIo.writeStderr(`lattice ${parsed.command} requires a query.\n`);
    return { exitCode: 2 };
  }
  try {
    const root = await RepositoryRoot.open(parsed.rootPath);
    const analysis = await analyzeProject(root, { generatorVersion: CLI_VERSION });
    await writeReuseIndex(root, analysis.index);
    const terms = parsed.terms.join(" ");
    if (parsed.command === "search") {
      emit(suppliedIo, parsed.json, "search", rankReuseCandidates(analysis.index, terms), analysis.truncated);
    } else if (parsed.command === "inspect") {
      emit(suppliedIo, parsed.json, "inspect", inspect(analysis.index, terms), analysis.truncated);
    } else {
      const context = buildReuseContext(analysis.index, terms, {
        maxItems: DEFAULT_CONTEXT_MAX_ITEMS,
        maxCharacters: DEFAULT_CONTEXT_MAX_CHARACTERS,
      });
      emit(suppliedIo, parsed.json, "context", context, analysis.truncated || context.truncated);
    }
    return { exitCode: 0 };
  } catch (error) {
    suppliedIo.writeStderr(`${error instanceof Error ? error.message : "LatticeOS analysis failed."}\n`);
    return { exitCode: 1 };
  }
}
