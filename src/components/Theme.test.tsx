import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandProvider, useBrand } from "./BrandProvider";
import { THEME_STORAGE_KEY, ThemeToggle, themeScript, useThemePreference } from "./Theme";

function mockSystem(dark: boolean) {
  const listeners = new Set<() => void>();
  const mql = { matches: dark, addEventListener: (_: string, l: () => void) => listeners.add(l), removeEventListener: (_: string, l: () => void) => listeners.delete(l) };
  vi.stubGlobal("matchMedia", () => mql);
  return {
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((l) => l());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function Probe() {
  return <span>{useBrand().theme}</span>;
}

describe("BrandProvider theme", () => {
  it("follows the system by default and updates when it changes", () => {
    const system = mockSystem(true);
    const { container } = render(
      <BrandProvider>
        <Probe />
      </BrandProvider>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-theme", "dark");
    act(() => system.set(false));
    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("puts the theme on <html> when it wraps the page", () => {
    mockSystem(false);
    const { container } = render(
      <BrandProvider theme="dark" root>
        <Probe />
      </BrandProvider>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("data-theme");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

function Toggle() {
  const [preference, setPreference] = useThemePreference();
  return (
    <>
      <ThemeToggle value={preference} onChange={setPreference} />
      <output>{preference}</output>
    </>
  );
}

describe("ThemeToggle", () => {
  it("offers system, light and dark, and remembers the choice", async () => {
    mockSystem(false);
    render(<Toggle />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("status")).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await userEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

describe("themeScript", () => {
  it("applies the stored choice, or the system setting, to <html>", () => {
    mockSystem(true);
    new Function(themeScript())();
    expect(document.documentElement.dataset.theme).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    new Function(themeScript())();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
