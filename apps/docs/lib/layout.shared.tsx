import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "LatticeOS",
    },
    githubUrl: "https://github.com/Karthick-Ramachandran/LatticeOS",
    links: [
      {
        text: "Phase 1 Reuse",
        url: "/docs/features/phase-1-reuse",
        active: "nested-url",
      },
    ],
  };
}
