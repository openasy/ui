import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { followLinks, navigate, usePath } from "./routing";

function Page() {
  return (
    <>
      <p>at {usePath()}</p>
      <a href="/people/abc">Person</a>
      <a href="/api/v1/people">API</a>
      <a href="/people" target="_blank">New tab</a>
      <a href="https://example.com/people">Elsewhere</a>
    </>
  );
}

let stop: () => void;
beforeEach(() => history.replaceState(null, "", "/"));
afterEach(() => stop?.());

describe("routing", () => {
  it("opens a page and follows the browser's history", () => {
    render(<Page />);
    act(() => navigate("/people?q=ada"));
    expect(screen.getByText("at /people")).toBeInTheDocument();
    expect(location.search).toBe("?q=ada");
    act(() => {
      history.replaceState(null, "", "/groups");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("at /groups")).toBeInTheDocument();
  });

  it("replaces the entry when asked", () => {
    const before = history.length;
    navigate("/groups", { replace: true });
    expect(location.pathname).toBe("/groups");
    expect(history.length).toBe(before);
  });

  it("opens links to pages without a reload, and leaves the rest to the browser", () => {
    stop = followLinks(["people"]);
    render(<Page />);
    const click = (name: string, init: MouseEventInit = {}) => !fireEvent.click(screen.getByRole("link", { name }), { button: 0, ...init });
    let opened = false;
    act(() => {
      opened = click("Person");
    });
    expect(opened).toBe(true);
    expect(location.pathname).toBe("/people/abc");
    expect(screen.getByText("at /people/abc")).toBeInTheDocument();
    expect(click("API")).toBe(false);
    expect(click("New tab")).toBe(false);
    expect(click("Elsewhere")).toBe(false);
    expect(click("Person", { metaKey: true })).toBe(false);
  });

  it("turns an address from before into a path", () => {
    history.replaceState(null, "", "/#/people/abc?tab=devices");
    stop = followLinks(["people"]);
    expect(location.pathname + location.search + location.hash).toBe("/people/abc?tab=devices");
  });
});
