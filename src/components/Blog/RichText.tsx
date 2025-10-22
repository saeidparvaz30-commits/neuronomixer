// components/RichText.tsx
import Image from "next/image";
import { PortableText, PortableTextComponents } from "@portabletext/react";

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?.url) return null;

      const alignment = value.alignment || "full";
      const width = value.width || 800;

      // Choose layout classes based on alignment
      let wrapperClass = "";
      let imageClass =
        "rounded-xl object-cover shadow-md transition-all duration-300";

      switch (alignment) {
        case "left":
          wrapperClass = "float-left mr-6 mb-4";
          break;
        case "right":
          wrapperClass = "float-right ml-6 mb-4";
          break;
        case "center":
          wrapperClass = "flex justify-center my-6";
          break;
        default:
          wrapperClass = "w-full my-8";
      }

      return (
        <div className={wrapperClass}>
          <Image
            src={value.asset.url}
            alt={value.alt || "Blog image"}
            width={width}
            height={Math.round(width * 0.6)}
            className={imageClass}
          />
        </div>
      );
    },
  },
  block: {
    h1: ({ children }) => (
      <h1 className="text-3xl md:text-4xl font-bold my-6 text-black">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-semibold my-4 text-gray-2000">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-1xl font-bold my-3 text-gray-1500">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h3 className="text-xl md:text-1xl font-bold my-3 text-gray-1500">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="my-3 leading-relaxed text-gray-1500">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[var(--color-accent)] pl-4 italic my-6">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc ml-6 space-y-1 text-gray-1500">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal ml-6 space-y-1 text-gray-1500">{children}</ol>
    ),
  },
};

export default function RichText({ value }: { value: any }) {
  return <PortableText value={value} components={components} />;
}
