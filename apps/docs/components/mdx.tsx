import type { ComponentProps } from "react";
import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

function CopyablePre({ ref: _ref, ...props }: ComponentProps<"pre">) {
  return (
    <CodeBlock {...props}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    pre: CopyablePre,
    ...components,
  };
}
