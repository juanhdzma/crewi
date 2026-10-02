import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Logo, LogoMark } from "./ui";

test("Logo links home and shows the mark next to the wordmark", () => {
  const html = renderToStaticMarkup(<Logo />);
  expect(html).toContain('href="/"');
  expect(html).toContain("<svg");
  expect(html).toContain("crewi");
});

test("LogoMark is decorative and draws the three avatars", () => {
  const html = renderToStaticMarkup(<LogoMark />);
  expect(html).toContain('aria-hidden="true"');
  expect(html.match(/<circle/g)).toHaveLength(3);
});
