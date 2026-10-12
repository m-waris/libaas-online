"use client";

import { useEffect, useRef, useState } from "react";

import { getCloudinaryImageUrl } from "../../lib/cloudinary-image";
import type { StorefrontImage } from "../../lib/queries";

type ProductGalleryProps = {
  images: StorefrontImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<number | null>(null);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const closeZoomRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!zoomed) return;
    closeZoomRef.current?.focus();
    return () => zoomTriggerRef.current?.focus();
  }, [zoomed]);
  const activeImage = images[activeIndex];

  return (
    <section className="product-gallery" aria-label="Product photos">
      <div className="product-gallery__main">
        {activeImage ? (
          <button
            ref={zoomTriggerRef}
            type="button"
            className="product-gallery__zoom"
            onClick={() => setZoomed(true)}
            aria-label={`Zoom in on ${productName}, photo ${activeIndex + 1}`}
            onTouchStart={(event) => {
              touchStart.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              const end = event.changedTouches[0]?.clientX;
              touchStart.current = null;
              if (
                start === null ||
                end === undefined ||
                Math.abs(end - start) < 45
              )
                return;
              setActiveIndex((current) =>
                Math.min(
                  images.length - 1,
                  Math.max(0, current + (end < start ? 1 : -1)),
                ),
              );
            }}
          >
            {/* Remote URLs can come from multiple providers; Cloudinary URLs are transformed first. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCloudinaryImageUrl(activeImage.url, { width: 1200 })}
              alt={`${productName}, photo ${activeIndex + 1}`}
              fetchPriority="high"
              decoding="async"
            />
            <span>Tap to zoom</span>
          </button>
        ) : (
          <div className="product-gallery__empty">Photo jald aa rahi hai</div>
        )}
        {images.length > 1 ? (
          <p className="product-gallery__count" aria-live="polite">
            {activeIndex + 1} / {images.length}
          </p>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          className="product-gallery__thumbs"
          role="group"
          aria-label="Choose a product photo"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={activeIndex === index ? "is-active" : ""}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCloudinaryImageUrl(image.url, { width: 240 })}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      ) : null}

      {zoomed && activeImage ? (
        <div
          className="product-gallery__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} photo`}
          onClick={() => setZoomed(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setZoomed(false);
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
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <button
            ref={closeZoomRef}
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close zoom"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCloudinaryImageUrl(activeImage.url, { width: 2000 })}
            alt={`${productName}, enlarged`}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
