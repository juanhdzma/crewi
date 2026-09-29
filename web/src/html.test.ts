import { expect, it } from "vitest";
import { escapeHtml } from "./html";

it("escapes markup in player names", () => {
  expect(escapeHtml(`<img src=x onerror="alert('1')">&`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;");
  expect(escapeHtml("Ana 🦊")).toBe("Ana 🦊");
});
