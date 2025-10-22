"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Linkedin, Github, ExternalLink, Twitter } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center mb-0 pb-0">
      {/* === Background Image/Video === */}
      <div className="absolute inset-0">
        {/* Example: replace with your video or image */}
        {/* <video autoPlay loop muted className="w-full h-full object-cover">
          <source src="/videos/contact-bg.mp4" type="video/mp4" />
        </video> */}
        <img
          src="/pictures/contact-bg.jpg"
          alt="Contact background"
          className="w-full h-full object-cover"
        />
        {/* Overlay for contrast */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* === Contact Box === */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col md:flex-row bg-white/85 backdrop-blur-md shadow-2xl rounded-2xl max-w-5xl w-full mx-4"
      >
        {/* Left: Contact Form */}
        <div className="w-full md:w-2/3 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-600 mb-6">
            Whether you have a question, a project idea, or just want to say
            hello — I’d love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 
                px-3 py-2 text-gray-600 
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-primary)] text-white font-medium px-6 py-2 rounded-md transition-colors duration-200"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>

            {status === "success" && (
              <p className="text-green-600 text-sm mt-2">
                ✅ Message sent successfully!
              </p>
            )}
            {status === "error" && (
              <p className="text-red-600 text-sm mt-2">
                ❌ Failed to send message. Try again.
              </p>
            )}
          </form>
        </div>

        {/* Right: Social Icons */}
        <div className="w-full md:w-1/3 flex flex-col justify-center items-center p-8 border-t md:border-t-0 md:border-l border-gray-300/40 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Connect</h2>
          <div className="flex md:flex-col items-center gap-6">
            <a
              href="mailto:saeid.sheikhi@neuronomixer.com"
              className="text-gray-700 hover:text-[var(--color-accent)] transition-all"
            >
              <Mail size={28} />
            </a>
            <a
              href="https://www.linkedin.com/in/saeid-sheikhi-aa2110149/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-[var(--color-accent)] transition-all"
            >
              <Linkedin size={28} />
            </a>
            <a
              href="https://github.com/saeidparvaz30-commits"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-[var(--color-accent)] transition-all"
            >
              <Github size={28} />
            </a>
            <a
              href="https://x.com/SaeidSheikhi_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-[var(--color-accent)] transition-all"
            >
              <Twitter size={28} />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
