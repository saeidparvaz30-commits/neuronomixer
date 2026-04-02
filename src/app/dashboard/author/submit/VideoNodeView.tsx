"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useEffect } from "react";

export function VideoNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, caption = "" } = node.attrs as { src: string; caption?: string };
  const [capValue, setCapValue] = useState(caption);

  useEffect(() => { setCapValue(caption); }, [caption]);

  return (
    <NodeViewWrapper
      contentEditable={false}
      style={{ display: "block", margin: "1rem 0", clear: "both" }}
    >
      <div
        className={
          selected
            ? "ring-2 ring-[var(--color-accent)] rounded-xl ring-offset-2 ring-offset-[#111827]"
            : ""
        }
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={src}
          controls
          className="w-full rounded-xl block"
          style={{ maxHeight: "480px" }}
        />

        {selected && (
          <div className="flex items-center gap-2 mt-1 bg-gray-900/95 border border-white/20 rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-gray-400 shrink-0 font-medium">CAPTION</span>
            <input
              type="text"
              value={capValue}
              onChange={(e) => {
                setCapValue(e.target.value);
                updateAttributes({ caption: e.target.value });
              }}
              placeholder="Add a caption (optional)…"
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
