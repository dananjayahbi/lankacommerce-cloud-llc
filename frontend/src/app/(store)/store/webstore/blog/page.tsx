"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
const PAGE_SIZE = 20;

interface BlogPost {
  id: string;
  title: string;
  handle: string;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  tags: string[];
}

export default function BlogAdminPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const { data, isLoading } = useQuery<{
    count: number;
    results: BlogPost[];
  }>({
    queryKey: ["admin-blog-posts", page],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/blog/?page=${page}&page_size=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const posts = data?.results ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
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
      if (!res.ok) throw new Error("Failed to update publish status");
      return res.json();
    },
    onSuccess: (_data, { publish }) => {
      toast.success(publish ? "Post published." : "Post unpublished.");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: () => toast.error("Failed to update publish status."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/webstore/tenants/blog/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      toast.success("Post deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: () => toast.error("Failed to delete post."),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#F97316]" />
            Blog Posts
          </h1>
          <p className="text-sm text-slate-500">
            Create and manage your store&apos;s blog articles
          </p>
        </div>
        <Button asChild className="bg-[#F97316] hover:bg-[#ea6c0a] text-white">
          <Link href="/store/webstore/blog/new">
            <Plus className="w-4 h-4 mr-1" />
            New Post
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-slate-400"
                >
                  No blog posts yet.{" "}
                  <Link
                    href="/store/webstore/blog/new"
                    className="text-[#F97316] hover:underline"
                  >
                    Create your first post
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Link
                      href={`/store/webstore/blog/${post.id}`}
                      className="font-medium text-slate-900 hover:text-[#F97316] transition-colors"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      /{post.handle}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {post.author_name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={post.is_published ? "default" : "secondary"}
                      className={
                        post.is_published
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {post.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {post.published_at
                      ? format(new Date(post.published_at), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(post.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          publishMutation.mutate({
                            id: post.id,
                            publish: !post.is_published,
                          })
                        }
                        disabled={publishMutation.isPending}
                        title={
                          post.is_published ? "Unpublish post" : "Publish post"
                        }
                      >
                        {post.is_published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Link href={`/store/webstore/blog/${post.id}`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(post)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({data?.count ?? 0} posts)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &quot;
              {deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
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
    </div>
  );
}
