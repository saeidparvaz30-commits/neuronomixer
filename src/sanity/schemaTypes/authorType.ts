import { UserIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

export const authorType = defineType({
  name: "author",
  title: "Author",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Full Name",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      title: "Slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      type: "image",
      title: "Profile Image",
      options: { hotspot: true },
    }),
    defineField({
      name: "shortBio",
      type: "text",
      title: "Short Bio (for posts)",
      description:
        "A brief one- or two-sentence introduction to appear under blog posts.",
      rows: 3,
    }),
    defineField({
      name: "longBio",
      type: "array",
      title: "Full Bio (for author page)",
      description: "Detailed author bio, used on author pages.",
      of: [
        defineArrayMember({
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [],
        }),
      ],
    }),
    defineField({
      name: "order",
      type: "number",
      title: "Order",
      description:
        "Order in which the author appears (lower is higher priority)",
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: "linkedIn",
      type: "url",
      title: "LinkedIn URL",
    }),
    defineField({
      name: "github",
      type: "url",
      title: "GitHub URL",
    }),
    defineField({
      name: "twitter",
      type: "url",
      title: "Twitter URL",
    }),
    defineField({
      name: "personalWebsite",
      type: "url",
      title: "Personal Website URL",
      description: "Include your personal website (add https:// if missing).",
      validation: (Rule) =>
        Rule.uri({
          allowRelative: false,
          scheme: ["http", "https"],
        }).error(
          "Please enter a valid URL (must include http:// or https://)."
        ),
    }),

    defineField({
      name: "email",
      type: "string",
      title: "Email Address",
      validation: (Rule) =>
        Rule.email().error("Please enter a valid email address."),
    }),
  ],
  preview: {
    select: {
      title: "name",
      media: "image",
    },
  },
});
