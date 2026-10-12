"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CatalogFiltersProps = { filter: string; query: string };

const options = [
  { label: "Sab kuch", value: "all" },
  { label: "Available", value: "instock" },
  { label: "Sold out", value: "outofstock" },
];

function filterHref(value: string, query: string) {
  const params = new URLSearchParams();
  if (value !== "all") params.set("filter", value);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function CatalogFilters({ filter, query }: CatalogFiltersProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, [open]);
  return (
    <>
      <div
        className="hidden flex-wrap gap-3 sm:flex"
        aria-label="Filter products"
      >
        {options.map((option) => (
          <Link
            key={option.value}
            href={filterHref(option.value, query)}
            aria-current={filter === option.value ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition ${filter === option.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"}`}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <div className="sm:hidden">
        <button
          ref={triggerRef}
          type="button"
          className="catalog-filter-trigger"
          onClick={() => setOpen(true)}
        >
          Filter · {options.find((option) => option.value === filter)?.label}
        </button>
        {open ? (
          <div
            className="catalog-filter-backdrop"
            onClick={() => setOpen(false)}
          >
            <section
              className="catalog-filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-filter-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
                if (event.key === "Tab") {
                  const focusable =
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                    );
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                  } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                  ) {
                    event.preventDefault();
                    first?.focus();
                  }
                }
              }}
            >
              <div className="catalog-filter-sheet__handle" />
              <div className="flex items-center justify-between">
                <h2 id="catalog-filter-title" className="font-serif text-xl">
                  Products filter karein
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  className="min-h-11 px-3"
                  onClick={() => setOpen(false)}
                >
                  Band karein
                </button>
              </div>
              <nav
                className="mt-5 grid gap-2"
                aria-label="Product availability"
              >
                {options.map((option) => (
                  <Link
                    key={option.value}
                    href={filterHref(option.value, query)}
                    aria-current={filter === option.value ? "page" : undefined}
                    className={`min-h-12 rounded-xl border px-4 py-3 ${filter === option.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </nav>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
