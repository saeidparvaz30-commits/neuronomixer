import { defineType, defineField } from "sanity";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "image",
      title: "Background Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "intuitive",
      title: "Intuitive layout?",
      type: "boolean",
      description: "If true, posts will appear numbered like chapters.",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first on the main blog page",
    }),
    defineField({
      name: "active",
      title: "Active?",
      type: "boolean",
      description: "Uncheck to hide category from the main blog page",
      initialValue: true,
    }),
  ],
});
