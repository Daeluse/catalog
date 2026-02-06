import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Subject from "../../src/app/documentation/[slug]/page";
import React from "react";

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(() => "mocked file content"),
  },
}));

vi.mock("@/components/MarkDown", () => ({
  default: (props: any) => <div>Mock MarkDown {props.content}</div>,
}));

describe("Documentation Pages", () => {
  it("render existing mdx pages", async () => {
    const Rendered = (await Subject({
      params: Promise.resolve({ slug: "consumers" }),
    })) as React.JSX.Element;

    const screen = await render(Rendered);
    expect(screen.getByText("Mock MarkDown mocked file content")).toBeTruthy();
  });
});
