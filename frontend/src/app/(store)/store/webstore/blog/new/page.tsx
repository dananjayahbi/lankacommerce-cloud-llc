"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, BookOpen, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/webstore/admin/RichTextEditor";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface BlogPostPayload {
  title: string;
  handle: string;
  excerpt: string;
  content_html: string;
  author_name: string;
  tags: string[];
  featured_image_url: string;
  is_published: boolean;
  seo_title: string;
  seo_description: string;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewBlogPostPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleManual, setHandleManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!handleManual) setHandle(slugify(v));
  }

  const createMutation = useMutation({
    mutationFn: async (payload: BlogPostPayload) => {
      const res = await fetch(`${API_BASE}/api/webstore/tenants/blog/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      return res.json();
    },
    onSuccess: (data: { id: string }) => {
      toast.success("Blog post created!");
      router.push(`/store/webstore/blog/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error("Failed to create post: " + err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    createMutation.mutate({
      title,
      handle: handle || slugify(title),
      excerpt,
      content_html: contentHtml,
      author_name: authorName,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      featured_image_url: featuredImageUrl,
      is_published: isPublished,
      seo_title: seoTitle,
      seo_description: seoDescription,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-slate-500">
            <Link href="/store/webstore/blog">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#F97316]" />
            New Blog Post
          </h1>
        </div>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Content</h2>

            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Your post title"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="handle">URL Handle</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">/blog/</span>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setHandleManual(true);
                  }}
                  placeholder="my-post-url"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary for listings and SEO..."
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label>Body</Label>
              <RichTextEditor value={contentHtml} onChange={setContentHtml} />
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">SEO</h2>
            <div className="space-y-1">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input
                id="seoTitle"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Leave blank to use post title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="seoDescription">SEO Description</Label>
              <Textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Leave blank to use excerpt"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Settings</h2>

            <div className="flex items-center justify-between">
              <Label htmlFor="isPublished">Published</Label>
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author name"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="news, tips, announcement"
              />
              <p className="text-xs text-slate-400">Comma-separated</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
