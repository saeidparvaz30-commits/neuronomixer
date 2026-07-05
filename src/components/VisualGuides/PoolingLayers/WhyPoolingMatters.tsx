"use client";

const REASONS = [
  {
    title: "Spatial Invariance",
    description:
      "Small shifts or translations of an object in the input don't significantly change the pooled output. This helps CNNs recognise the same feature regardless of its exact position.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "Dimensionality Reduction",
    description:
      "Pooling shrinks the spatial size of feature maps, reducing the number of parameters and computation in subsequent layers. A 2x2 max pool with stride 2 cuts width and height by half.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="4" height="4" rx="0.5" />
        <path d="M11 7h2M7 11v2M17 11v2M13 7h2" strokeOpacity={0.4} />
        <path d="M11 11l2 2" />
      </svg>
    ),
  },
  {
    title: "Noise Suppression",
    description:
      "Max pooling naturally ignores low activations by taking only the peak value in each region. This helps the network focus on strong, meaningful signals and ignore background noise.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M3 12h2l2-7 3 14 3-10 2 3h2M19 12h2" />
      </svg>
    ),
  },
];

export default function WhyPoolingMatters() {
  return (
    <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-4">
        Why pooling is used in CNNs
      </h3>
      <div className="flex flex-col gap-4">
        {REASONS.map((reason) => (
          <div key={reason.title} className="flex items-start gap-3">
            {/* Gold bullet icon */}
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center flex-shrink-0 text-[var(--color-accent)] mt-0.5">
              {reason.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">{reason.title}</p>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                {reason.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
