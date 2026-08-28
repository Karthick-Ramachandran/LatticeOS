import { isComponentId } from "./component-id.js";
import { compareStrings } from "./stable.js";
import type { ComponentResolution, ReuseIndex, UiComponent } from "./types.js";

function sorted(components: readonly UiComponent[]): UiComponent[] {
  return [...components].sort((left, right) => compareStrings(left.id, right.id));
}

export function resolveComponent(index: ReuseIndex, idOrName: string): ComponentResolution {
  if (isComponentId(idOrName)) {
    const component = index.components.find((candidate) => candidate.id === idOrName);
    return component ? { status: "found", component } : { status: "not-found" };
  }

  const exact = sorted(
    index.components.filter(
      (component) => component.displayName === idOrName || component.exportKey === idOrName,
    ),
  );
  if (exact.length === 1) return { status: "found", component: exact[0] as UiComponent };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact };

  const normalized = idOrName.toLocaleLowerCase("en-US");
  const insensitive = sorted(
    index.components.filter(
      (component) =>
        component.displayName.toLocaleLowerCase("en-US") === normalized ||
        component.exportKey.toLocaleLowerCase("en-US") === normalized,
    ),
  );
  if (insensitive.length === 1) return { status: "found", component: insensitive[0] as UiComponent };
  if (insensitive.length > 1) return { status: "ambiguous", candidates: insensitive };
  return { status: "not-found" };
}
