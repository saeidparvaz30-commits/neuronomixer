"use client";

export default function LayerNormNote() {
  return (
    <div className="rounded-2xl border border-[#a855f7]/35 bg-[#a855f7]/06 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30">
            Related
          </span>
        </div>
        <div>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            BatchNorm normalizes across the{" "}
            <span className="font-semibold text-white">BATCH dimension</span>. For transformers &amp;
            NLP,{" "}
            <span className="font-semibold text-[#a855f7]">Layer Normalization</span> normalizes
            across the{" "}
            <span className="font-semibold text-white">FEATURE dimension</span> instead — works for
            single samples and variable-length sequences.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-white/[0.07]">
              <div className="text-[10px] font-bold text-[#3bb4a4] uppercase tracking-wider mb-1">
                BatchNorm
              </div>
              <div className="text-xs text-[#94a3b8]">
                Normalize over batch. Good for CNNs and fully connected layers.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-white/[0.07]">
              <div className="text-[10px] font-bold text-[#a855f7] uppercase tracking-wider mb-1">
                LayerNorm
              </div>
              <div className="text-xs text-[#94a3b8]">
                Normalize over features. Used in every Transformer (BERT, GPT, etc.).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
