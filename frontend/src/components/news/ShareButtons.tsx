"use client";

/* Хуваалцах товчнууд: Facebook (шинэ цонх) ба холбоос хуулах. */

import { useEffect, useRef, useState } from "react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer,width=600,height=520");
  };

  const copyLink = () => {
    if (!navigator.clipboard?.writeText) {
      alert(`Холбоос: ${url}`);
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert(`Холбоос: ${url}`));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={shareFacebook}
        aria-label={`${title} — Facebook-т хуваалцах`}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy hover:text-navy"
      >
        Facebook
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy hover:text-navy"
      >
        {copied ? "Хуулагдлаа" : "Холбоос хуулах"}
      </button>
    </div>
  );
}
