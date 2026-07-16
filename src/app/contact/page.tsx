import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the NeuroNomixer team. Whether you have a question, project idea, or collaboration request, we'd love to hear from you.",
  alternates: { canonical: "https://www.neuronomixer.com/contact" },
  openGraph: {
    title: "Contact | NeuroNomixer",
    description: "Get in touch with the NeuroNomixer team.",
    url: "https://www.neuronomixer.com/contact",
    siteName: "NeuroNomixer",
    type: "website",
    images: [{ url: "https://www.neuronomixer.com/pictures/Logo.png", alt: "NeuroNomixer" }],
  },
  twitter: {
    card: "summary",
    title: "Contact | NeuroNomixer",
    description: "Get in touch with the NeuroNomixer team.",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
