import { Card } from "@/components/Card";
import "@/app/md.css";
import MarkDown from "@/components/MarkDown";
import fs from "fs";
import { redirect } from "next/navigation";

export const dynamicParams = false;

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-zinc-50">
      <Card>
        <MarkDown content={content} />
      </Card>
    </main>
  );
}
