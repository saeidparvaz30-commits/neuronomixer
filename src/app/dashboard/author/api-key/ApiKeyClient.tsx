"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, RefreshCw, Check, KeyRound } from "lucide-react";

interface Props {
  existing: { key: string; createdAt: Date; lastUsedAt: Date | null } | null;
  siteUrl: string;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative group">
      <pre className="bg-[#060d18] border border-white/10 rounded-xl p-4 text-[12px] text-[#94a3b8] overflow-x-auto leading-relaxed font-mono">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function ApiKeyClient({ existing, siteUrl }: Props) {
  const [apiKey, setApiKey] = useState(existing?.key ?? null);
  const [lastUsed, setLastUsed] = useState(existing?.lastUsedAt ?? null);
  const [createdAt, setCreatedAt] = useState(existing?.createdAt ?? null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/author/generate-api-key", { method: "POST" });
      const data = await res.json();
      if (data.key) {
        setApiKey(data.key);
        setCreatedAt(new Date());
        setLastUsed(null);
        setVisible(true);
      }
    } finally {
      setLoading(false);
      setConfirmRegen(false);
    }
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function maskedKey(k: string) {
    return k.slice(0, 8) + "••••••••••••••••••••••••••••••••••••••••••••";
  }

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2.5">
          <KeyRound size={22} className="text-[var(--color-accent)]" />
          API Access
        </h1>
        <p className="text-sm text-gray-400">
          Use your personal API key to read your posts and submit new ones programmatically — perfect for automating content creation with Claude or any HTTP client.
        </p>
      </div>

      {/* Key card */}
      <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Your API Key</h2>
          {apiKey && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {createdAt && <span>Created {fmt(createdAt)}</span>}
              {lastUsed && <span>· Last used {fmt(lastUsed)}</span>}
            </div>
          )}
        </div>

        {apiKey ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-[var(--color-accent)] truncate">
              {visible ? apiKey : maskedKey(apiKey)}
            </code>
            <button onClick={() => setVisible(!visible)} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title={visible ? "Hide" : "Reveal"}>
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={copyKey} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy">
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            </button>
            {confirmRegen ? (
              <div className="flex items-center gap-1.5">
                <button onClick={generate} disabled={loading} className="px-3 py-2 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50">
                  {loading ? "..." : "Confirm"}
                </button>
                <button onClick={() => setConfirmRegen(false)} className="px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmRegen(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl transition-colors" title="Regenerate key">
                <RefreshCw size={13} />
                Regenerate
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm mb-4">No API key yet. Generate one to get started.</p>
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition"
            >
              <KeyRound size={14} />
              {loading ? "Generating…" : "Generate API Key"}
            </button>
          </div>
        )}

        {apiKey && (
          <p className="text-xs text-gray-600">
            Keep this key secret. Anyone with it can submit posts on your behalf. Regenerating will immediately invalidate the old key.
          </p>
        )}
      </div>

      {/* Docs */}
      {apiKey && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">API Reference</h2>
          <p className="text-sm text-gray-400">Base URL: <code className="text-[var(--color-accent)] font-mono">{siteUrl}/api/v1</code></p>
          <p className="text-sm text-gray-400">All requests require: <code className="text-[var(--color-accent)] font-mono">Authorization: Bearer YOUR_API_KEY</code></p>

          {/* List posts */}
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 font-mono">GET</span>
              <code className="text-sm text-white font-mono">/api/v1/posts</code>
              <span className="text-xs text-gray-500 ml-1">— List all your posts</span>
            </div>
            <CodeBlock code={`curl ${siteUrl}/api/v1/posts \\
  -H "Authorization: Bearer ${visible ? apiKey : "YOUR_API_KEY"}"`} />
            <p className="text-xs text-gray-500">Returns each post with a <code className="text-gray-400">bodyMarkdown</code> field — the full article content as markdown, ready for Claude to read.</p>
          </div>

          {/* Content review prompt */}
          <div className="bg-[#060d18]/80 border border-[#3bb4a4]/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#3bb4a4]">Content Review &amp; Improvement Prompt</h3>
            <p className="text-xs text-gray-400">
              Paste this into Claude (or any LLM) to analyse your existing articles and get actionable improvement suggestions:
            </p>
            <CodeBlock code={`You are a senior content strategist and editor specialising in AI, data science, and risk analytics.

Your task is to review all published articles by a NeuroNomixer author and provide a detailed review report.

## Step 1 — Fetch all posts
Call the following API to retrieve every article including full body content:

GET ${siteUrl}/api/v1/posts
Authorization: Bearer ${visible ? apiKey : "YOUR_API_KEY"}

## Step 2 — Analyse each article
For every post returned, evaluate:
1. **Clarity** — Is the writing clear, concise, and free of jargon overload?
2. **Structure** — Does it have a strong intro, logical sections (## headings), and a conclusion?
3. **Depth** — Is the topic covered thoroughly, or are key concepts left unexplained?
4. **SEO & Title** — Is the title specific and searchable? Does the description accurately summarise the post?
5. **Visuals** — Are there images or videos to break up text and illustrate concepts?
6. **Links** — Does it reference relevant external sources or link to related posts?
7. **Freshness** — Are any facts, tools, or statistics likely outdated?

## Step 3 — Produce a report with this structure

### Overall Summary
- Total posts reviewed
- General strengths across the portfolio
- Most common weaknesses

### Per-Article Review
For each post, provide:
- **Title**: <post title>
- **URL**: <post url>
- **Score**: X/10
- **What works well**: bullet list
- **What could be stronger**: bullet list

Be direct and specific. Reference the actual content, not generic observations.`} />
          </div>

          {/* List categories */}
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 font-mono">GET</span>
              <code className="text-sm text-white font-mono">/api/v1/categories</code>
              <span className="text-xs text-gray-500 ml-1">— List available categories</span>
            </div>
            <CodeBlock code={`curl ${siteUrl}/api/v1/categories \\
  -H "Authorization: Bearer ${visible ? apiKey : "YOUR_API_KEY"}"`} />
          </div>

          {/* Submit post */}
          <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/20 text-green-400 font-mono">POST</span>
              <code className="text-sm text-white font-mono">/api/v1/posts</code>
              <span className="text-xs text-gray-500 ml-1">— Submit a post for review</span>
            </div>
            <CodeBlock code={`curl -X POST ${siteUrl}/api/v1/posts \\
  -H "Authorization: Bearer ${visible ? apiKey : "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My Article Title",
    "description": "A brief 1-2 sentence summary.",
    "category": "charting-your-data-journey",
    "mainImageUrl": "https://images.unsplash.com/photo-xxx?w=1200",
    "body": "## Introduction\\n\\nYour **markdown** content here.\\n\\n![Chart showing model accuracy](https://example.com/chart.png)\\n\\n[VIDEO: GPT-4 explained](https://youtube.com/watch?v=xxx)\\n\\nLearn more at [OpenAI](https://openai.com)."
  }'`} />
            <div className="text-xs text-gray-500 space-y-1.5 mt-2">
              <p><code className="text-gray-400">title</code> — required. Article headline.</p>
              <p><code className="text-gray-400">description</code> — optional. Short summary shown in listings.</p>
              <p><code className="text-gray-400">category</code> — required. Slug from <code className="text-gray-400">GET /api/v1/categories</code>.</p>
              <p><code className="text-gray-400">mainImageUrl</code> — optional. Public URL for the article header image. Uploaded automatically to Sanity.</p>
              <p><code className="text-gray-400">body</code> — required. Full article in markdown. Supported syntax:</p>
              <ul className="ml-3 space-y-1 text-gray-600">
                <li><code className="text-gray-500"># / ## / ### / ####</code> — headings</li>
                <li><code className="text-gray-500">**bold**</code>, <code className="text-gray-500">*italic*</code>, <code className="text-gray-500">`code`</code> — inline marks</li>
                <li><code className="text-gray-500">- item</code> — bullet list</li>
                <li><code className="text-gray-500">{"> quote"}</code> — blockquote</li>
                <li><code className="text-gray-500">[link text](https://url)</code> — hyperlink</li>
                <li><code className="text-gray-500">![alt text](https://image-url.jpg)</code> — image (uploaded to Sanity automatically)</li>
                <li><code className="text-gray-500">[VIDEO: caption](https://youtube.com/...)</code> — YouTube / Vimeo embed</li>
                <li>Bare YouTube/Vimeo URL on its own line also embeds a video</li>
              </ul>
            </div>
          </div>

          {/* Claude prompt example */}
          <div className="bg-[#060d18]/80 border border-[var(--color-accent)]/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-accent)]">Claude Automation System Prompt</h3>
            <p className="text-xs text-gray-400">
              Paste this as the system prompt in Claude (claude.ai, API, or MCP) to enable automated article creation:
            </p>
            <CodeBlock code={`You are a content writer for NeuroNomixer, a blog about AI, data science, and risk analytics.

## API Access
Base URL: ${siteUrl}/api/v1
Authorization: Bearer ${visible ? apiKey : "YOUR_API_KEY"}

## Available Endpoints
- GET  /api/v1/categories  → list available categories and their slugs
- GET  /api/v1/posts       → list all your published/pending posts
- POST /api/v1/posts       → submit a new article for admin review

## Submitting an Article
POST /api/v1/posts with JSON body:
{
  "title": "Article headline",
  "description": "1–2 sentence summary shown in listings",
  "category": "slug-from-categories-endpoint",
  "mainImageUrl": "https://public-url-to-header-image.jpg",
  "body": "Full article in markdown (see syntax below)"
}

## Markdown Syntax for body
- Headings: # H1  ## H2  ### H3  #### H4
- Inline:   **bold**  *italic*  \`code\`
- Lists:    - bullet item
- Quote:    > blockquote text
- Link:     [link text](https://url.com)
- Image:    ![alt description](https://public-image-url.jpg)
            → auto-uploaded to Sanity, shows in article
- Video:    [VIDEO: optional caption](https://youtube.com/watch?v=xxx)
            → embeds YouTube or Vimeo player in article
            (bare YouTube/Vimeo URL on its own line also works)

## Writing Guidelines
- Write in-depth, accurate articles (800–2000 words)
- Always start with a brief introduction paragraph
- Use ## headings to structure sections
- Include at least one relevant image (use Unsplash/Pexels free images)
- End with a "## Conclusion" or "## Key Takeaways" section
- After submitting, report the returned postId to confirm success`} />
          </div>
        </div>
      )}
    </div>
  );
}
