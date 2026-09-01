import { createComponentId } from "./component-id.js";
import { REUSE_INDEX_SCHEMA_VERSION, type EvidenceRecord, type ReuseIndex, type UiComponent } from "./types.js";

function evidence(
  id: string,
  path: string,
  line: number,
  kind: EvidenceRecord["kind"],
  classification: EvidenceRecord["classification"] = "exact",
): EvidenceRecord {
  return {
    id,
    kind,
    location: { path, line, column: 1 },
    method: kind === "token" || kind === "class-bundle" ? "css" : "ast",
    classification,
    fingerprint: `sha256:${id}`,
    limitations: [],
  };
}

function component(
  packageKey: string,
  sourcePath: string,
  exportKey: string,
  displayName: string,
  evidenceId: string,
  visibility: UiComponent["visibility"] = "public",
): UiComponent {
  return {
    id: createComponentId({ packageKey, sourcePath, exportKey }),
    packageKey,
    sourcePath,
    exportKey,
    displayName,
    visibility,
    props: [],
    composedComponentIds: [],
    usageIds: [],
    evidenceIds: [evidenceId],
  };
}

export function createTestReuseIndex(): ReuseIndex {
  const settingsId = createComponentId({
    packageKey: "root",
    sourcePath: "src/settings-section.tsx",
    exportKey: "SettingsSection",
  });
  const records = [
    evidence("e.project", "package.json", 1, "project"),
    evidence("e.package.ui", "packages/ui/package.json", 1, "package"),
    evidence("e.component.settings", "src/settings-section.tsx", 3, "export"),
    evidence("e.prop.title", "src/settings-section.tsx", 5, "prop"),
    evidence("e.usage.team", "src/routes/team-settings.tsx", 12, "usage", "corroborating"),
    evidence("e.component.card", "src/settings-card.tsx", 3, "export"),
    evidence("e.component.private", "src/private-shell.tsx", 3, "export"),
    evidence("e.component.button.root", "src/button.tsx", 3, "export"),
    evidence("e.component.button.ui", "packages/ui/src/button.tsx", 3, "export"),
  ];
  const settings = component(
    "root",
    "src/settings-section.tsx",
    "SettingsSection",
    "SettingsSection",
    "e.component.settings",
  );

  return {
    schemaVersion: REUSE_INDEX_SCHEMA_VERSION,
    generator: { name: "lattice", version: "0.0.0-test" },
    project: {
      rootPath: ".",
      packageManager: "pnpm",
      tools: {
        react: { status: "present", evidenceIds: ["e.project"] },
        nextjs: { status: "present", evidenceIds: ["e.project"] },
        typescript: { status: "present", evidenceIds: ["e.project"] },
        tailwind: { status: "absent", evidenceIds: [] },
        shadcn: { status: "absent", evidenceIds: [] },
        storybook: { status: "absent", evidenceIds: [] },
      },
    },
    packages: [
      { key: "root", rootPath: ".", manifestPath: "package.json", evidenceIds: ["e.project"] },
      {
        key: "@acme/ui",
        name: "@acme/ui",
        rootPath: "packages/ui",
        manifestPath: "packages/ui/package.json",
        evidenceIds: ["e.package.ui"],
      },
    ],
    components: [
      {
        ...settings,
        props: [
          {
            name: "title",
            type: "string",
            required: true,
            defaulted: false,
            variants: [],
            evidenceIds: ["e.prop.title"],
          },
        ],
        usageIds: ["u.team-settings"],
      },
      component("root", "src/settings-card.tsx", "SettingsCard", "SettingsCard", "e.component.card"),
      component("root", "src/private-shell.tsx", "local:PrivateShell", "PrivateShell", "e.component.private", "local"),
      component("root", "src/button.tsx", "Button", "Button", "e.component.button.root"),
      component("@acme/ui", "packages/ui/src/button.tsx", "Button", "Button", "e.component.button.ui"),
    ],
    imports: [],
    usages: [
      {
        id: "u.team-settings",
        componentId: settingsId,
        kind: "jsx",
        sourcePath: "src/routes/team-settings.tsx",
        location: { path: "src/routes/team-settings.tsx", line: 12, column: 3 },
        propNames: ["title"],
        evidenceIds: ["e.usage.team"],
      },
    ],
    tailwind: { tokens: [], repeatedClassBundles: [] },
    evidence: records,
    diagnostics: [],
  };
}
