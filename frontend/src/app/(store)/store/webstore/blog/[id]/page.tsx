"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/webstore/admin/RichTextEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface BlogPost {
  id: string;
  title: string;
  handle: string;
  excerpt: string;
  content_html: string;
  author_name: string;
  tags: string[];
  featured_image_url: string;
  is_published: boolean;
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["admin-blog-post", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/tenants/blog/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    enabled: !!accessToken && !!id,
  });

  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setHandle(post.handle);
    setExcerpt(post.excerpt ?? "");
    setContentHtml(post.content_html ?? "");
    setAuthorName(post.author_name ?? "");
    setTagsInput((post.tags ?? []).join(", "));
    setFeaturedImageUrl(post.featured_image_url ?? "");
    setIsPublished(post.is_published);
    setSeoTitle(post.seo_title ?? "");
    setSeoDescription(post.seo_description ?? "");
  }, [post]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/tenants/blog/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          handle,
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
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Post saved.");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (err: Error) => toast.error("Save failed: " + err.message),
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/blog/${id}/publish/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_published: publish }),
        },
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_data, publish) => {
      toast.success(publish ? "Post published." : "Post unpublished.");
      setIsPublished(publish);
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: () => toast.error("Failed to update publish status."),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/tenants/blog/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast.success("Post deleted.");
      router.push("/store/webstore/blog");
    },
    onError: () => toast.error("Failed to delete post."),
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#F97316]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center text-slate-500">
        Post not found.{" "}
        <Link href="/store/webstore/blog" className="text-[#F97316] underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-500"
            >
              <Link href="/store/webstore/blog">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#F97316]" />
                {post.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={isPublished ? "default" : "secondary"}
                  className={
                    isPublished
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {isPublished ? "Published" : "Draft"}
                </Badge>
                {post.published_at && (
                  <span className="text-xs text-slate-400">
                    Published {format(new Date(post.published_at), "MMM d, yyyy")}
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  · Updated {format(new Date(post.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => publishMutation.mutate(!isPublished)}
              disabled={publishMutation.isPending}
            >
              {isPublished ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Publish
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
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
                  onChange={(e) => setTitle(e.target.value)}
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
                    onChange={(e) => setHandle(e.target.value)}
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
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
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
                {featuredImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredImageUrl}
                    alt="Featured preview"
                    className="mt-2 rounded-md w-full object-cover max-h-40"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &quot;{post.title}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
