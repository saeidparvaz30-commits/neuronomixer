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
      name: "metaDescription",
      title: "Meta Description",
      type: "string",
      description: "SEO meta description for this post (recommended: 150–160 characters).",
      validation: (Rule) =>
        Rule.warning("Meta description should not exceed 160 characters.").max(160),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Pending Review", value: "pending" },
          { title: "Scheduled", value: "scheduled" },
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
    defineField({
      name: "language",
      title: "Language",
      type: "string",
      options: {
        list: [
          { title: "English", value: "en" },
          { title: "Farsi", value: "fa" },
        ],
        layout: "radio",
      },
      initialValue: "en",
      description:
        "English posts are the source. Farsi posts are created by the translation pipeline.",
    }),
    defineField({
      name: "translationOf",
      title: "Translation of",
      type: "reference",
      to: [{ type: "post" }],
      description: "Set on Farsi documents only. Points at the English source post.",
      options: {
        // Resolver form, because the predicate depends on the current document
        // (self-exclusion). filterParams is typed `never` in this form, so the
        // params come back from the resolver instead.
        filter: ({ document }) => {
          const publishedId = document._id.replace(/^drafts\./, "");
          return {
            filter:
              '(!defined(language) || language == "en") && !(_id in [$self, $selfDraft])',
            params: { self: publishedId, selfDraft: `drafts.${publishedId}` },
          };
        },
        disableNew: true,
      },
    }),
    defineField({
      name: "translationNotes",
      title: "Translation Notes",
      type: "text",
      rows: 6,
      readOnly: true,
      description:
        "Findings from the pipeline's verify pass. Written by the translation script, not by hand.",
    }),
    defineField({
      name: "sourceUpdatedAt",
      title: "Source Updated At",
      type: "datetime",
      readOnly: true,
      // Staleness is exact because it compares the source's revision against the
      // revision this translation was made from, not against the Farsi document's
      // own _updatedAt. Saeid reviewing and editing a Farsi draft bumps that
      // timestamp, which would make a stale translation look permanently fresh.
      // "When was this translated" is answered by the draft's own _createdAt, so
      // no second field is needed (D-08, RESEARCH staleness option A).
      hidden: ({ document }) => document?.language !== "fa",
      description:
        "The English source revision this translation was made from. Written by the translation script, not by hand.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      language: "language",
      sourceTitle: "translationOf.title",
      media: "mainImage",
    },
    prepare({ title, author, language, sourceTitle, media }) {
      const subtitle =
        language === "fa" && sourceTitle
          ? `fa of: ${sourceTitle}`
          : author && `by ${author}`;
      return { title, subtitle, media };
    },
  },
});
