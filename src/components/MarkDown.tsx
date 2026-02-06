"use client";
import React, { useEffect, useState } from "react";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

import "@/app/md.css";

export type MDXProps = {
  content: string;
};

async function compileMarkdown(props: MDXProps) {
  const code = String(
    await compile(props.content, {
      outputFormat: "function-body",
      remarkPlugins: [remarkGfm],
    }),
  );
  return run(code, {
    ...runtime,
    baseUrl: import.meta.url,
  }).then((result) => () => result.default);
}

export default function MarkdownComponent(props: MDXProps) {
  const [Markdown, setMarkdown] = useState<React.FC>();

  useEffect(() => {
    compileMarkdown(props).then((result) => setMarkdown(result));
  }, [props]);

  return (
    <div className="markdown-body">{Markdown ? <Markdown /> : <p>...</p>}</div>
  );
}
