import { defineType, defineArrayMember, defineField } from "sanity";
import { ImageIcon } from "@sanity/icons";
import TableInput from "@/components/Sanity/TableInput";

/**
 * This is the schema type for block content used in the post document type
 * Importing this type into the studio configuration's `schema` property
 * lets you reuse it in other document types with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 */

export const blockContentType = defineType({
  title: "Block Content",
  name: "blockContent",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      // Styles let you define what blocks can be marked up as. The default
      // set corresponds with HTML tags, but you can set any title or value
      // you want, and decide how you want to deal with it where you want to
      // use your content.
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H1", value: "h1" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [{ title: "Bullet", value: "bullet" }],
      // Marks let you mark up inline text in the Portable Text Editor
      marks: {
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
        ],
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          {
            title: "URL",
            name: "link",
            type: "object",
            fields: [
              {
                title: "URL",
                name: "href",
                type: "url",
              },
            ],
          },
        ],
      },
    }),
    // Image blocks
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
          description: "Important for accessibility and SEO",
        }),
        defineField({
          name: "alignment",
          type: "string",
          title: "Image alignment",
          options: {
            list: [
              { title: "Full width", value: "full" },
              { title: "Left (text wraps right)", value: "left" },
              { title: "Right (text wraps left)", value: "right" },
              { title: "Center", value: "center" },
            ],
            layout: "radio",
          },
          initialValue: "full",
        }),
        defineField({
          name: "width",
          type: "number",
          title: "Custom width (px)",
          description: "Optional custom width (default 800)",
        }),
      ],
    }),
    defineArrayMember({
      name: "table",
      title: "Table",
      type: "object",
      components: { input: TableInput },
      fields: [
        defineField({
          name: "rows",
          title: "Rows",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              fields: [
                defineField({
                  name: "cells",
                  title: "Cells",
                  type: "array",
                  of: [{ type: "string" }],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    defineArrayMember({
      name: "video",
      title: "Video",
      type: "object",
      fields: [
        defineField({
          name: "source",
          title: "Video Source",
          type: "string",
          options: {
            list: [
              { title: "YouTube / Vimeo", value: "external" },
              { title: "Uploaded file", value: "file" },
            ],
            layout: "radio",
          },
          initialValue: "external",
        }),
        defineField({
          name: "url",
          title: "Video URL (YouTube or Vimeo link)",
          type: "url",
          hidden: ({ parent }) => parent?.source !== "external",
        }),
        defineField({
          name: "file",
          title: "Video File Upload",
          type: "file",
          options: { accept: "video/*" },
          hidden: ({ parent }) => parent?.source !== "file",
        }),
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
        }),
      ],
      preview: {
        select: { title: "caption", source: "source" },
        prepare({ title, source }) {
          return {
            title: title || "Video",
            subtitle: source === "file" ? "Uploaded video" : "External link",
          };
        },
      },
    }),
  ],
});
