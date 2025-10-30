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
    // 📊 Table Renderer
    table: ({ value }) => {
      if (!value?.rows) return null;

      return (
        <div className="overflow-x-auto my-8">
          <table className="min-w-full border-[2px] border-gray-500 border-collapse rounded-md text-sm text-center">
            <tbody>
              {value.rows.map((row: any, i: number) => (
                <tr key={i} className="even:bg-gray-100">
                  {row.cells?.map((cell: string, j: number) => (
                    <td
                      key={j}
                      className={`border border-gray-400 px-3 py-2 ${
                        i === 0
                          ? "font-bold text-gray-100 border-b-4 border-gray-600 bg-[var(--color-primary)]"
                          : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },

    // 🎥 Video Renderer
    video: ({ value }) => {
      if (!value) return null;

      // External (YouTube / Vimeo)
      if (value.source === "external" && value.url) {
        // convert YouTube watch link to embed form
        const embedUrl = value.url.includes("watch?v=")
          ? value.url.replace("watch?v=", "embed/")
          : value.url;

        return (
          <div className="my-8 w-full flex flex-col items-center">
            <div className="aspect-video w-full max-w-3xl">
              <iframe
                src={embedUrl}
                title={value.caption || "Video"}
                className="w-full h-full rounded-xl shadow-md"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            {value.caption && (
              <p className="text-sm text-center text-gray-500 mt-2">
                {value.caption}
              </p>
            )}
          </div>
        );
      }

      // Uploaded file
      if (value.source === "file" && value.file?.asset?.url) {
        const fileUrl = value.file.asset.url;
        return (
          <div className="my-8 w-full flex flex-col items-center">
            <video
              src={fileUrl}
              controls
              className="rounded-xl shadow-md w-full max-w-3xl"
            />
            {value.caption && (
              <p className="text-sm text-center text-gray-500 mt-2">
                {value.caption}
              </p>
            )}
          </div>
        );
      }

      return null;
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
