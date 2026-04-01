import { DocumentTextIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
      },
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first within this category",
    }),
    defineField({
      name: "featured",
      title: "Featured on Blog",
      type: "boolean",
      description: "Pin this post as the featured article at the top of the blog page.",
      initialValue: false,
    }),
    defineField({
      name: "heroOrder",
      title: "Hero Slideshow Slot",
      type: "number",
      description: "Assign this post to homepage hero slot 1, 2, or 3. Clear to remove from slideshow.",
      options: {
        list: [
          { title: "Slot 1", value: 1 },
          { title: "Slot 2", value: 2 },
          { title: "Slot 3", value: 3 },
        ],
      },
    }),

    defineField({
      name: "author",
      type: "reference",
      to: { type: "author" },
    }),
    defineField({
      name: "mainImage",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alternative text",
        }),
      ],
    }),
    defineField({
      name: "description",
      title: "Short Description",
      type: "text",
      rows: 2,
      description: "Brief summary shown in post lists (1–2 sentences).",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Pending Review", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Rejected", value: "rejected" },
          { title: "Hidden", value: "hidden" },
          { title: "Deletion Requested", value: "deletion_requested" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
    }),
    defineField({
      name: "submittedBy",
      title: "Submitted By (User ID)",
      type: "string",
      readOnly: true,
      description: "The Prisma User ID of the author who submitted this post.",
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
    }),
    defineField({
      name: "body",
      type: "blockContent",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
    },
    prepare(selection) {
      const { author } = selection;
      return { ...selection, subtitle: author && `by ${author}` };
    },
  },
});
