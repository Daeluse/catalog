import { Card } from "@/components/Card";
import Link from "next/link";
import { redirect } from "next/navigation";
import fs from "fs";

import "@/app/md.css";
import MarkdownComponent from "@/components/MarkDown";

export const dynamicParams = false;

const docPages = [
  { slug: "getting-started", title: "Getting Started" },
  { slug: "publishing-modules", title: "Publishing Modules" },
  { slug: "consuming-modules", title: "Consuming Modules" },
  {
    slug: "applications-and-subscriptions",
    title: "Applications & Subscriptions",
  },
  { slug: "version-management", title: "Version Management" },
  { slug: "api-reference", title: "API Reference" },
  { slug: "api-tokens", title: "API Tokens" },
];

export function generateStaticParams() {
  return docPages;
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let content = "Not found";
  try {
    content = fs.readFileSync("src/documents/" + slug + ".mdx", "utf-8");
  } catch {
    redirect("/not-found");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <nav className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Documentation
              </h2>
              <ul className="space-y-1">
                {docPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/documentation/${page.slug}`}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        slug === page.slug
                          ? "bg-zinc-900 font-medium text-white"
                          : "text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 flex-1 markdown-body">
            <Card>
              <MarkdownComponent content={content}></MarkdownComponent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
