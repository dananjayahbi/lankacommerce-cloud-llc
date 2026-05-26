"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface PageSummary {
  id: string;
  title: string;
  handle: string;
  is_published: boolean;
  updated_at: string;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function PagesListPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery<PageSummary[]>({
    queryKey: ["webstore-pages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/pages/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? []);
    },
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/api/webstore/pages/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete page");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-pages"] });
      toast.success("Page deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pages</h1>
          <p className="text-slate-500 text-sm mt-1">
            Create and manage static pages for your storefront
          </p>
        </div>
        <Link href="/store/webstore/pages/new">
          <Button className="bg-[#F97316] hover:bg-orange-600 text-white gap-2">
            <Plus className="w-4 h-4" />
            Create Page
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            No pages yet. Create your first static page.
          </p>
          <Link href="/store/webstore/pages/new">
            <Button
              variant="outline"
              className="border-[#F97316] text-[#F97316] hover:bg-orange-50"
            >
              Create Page
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium text-slate-800">
                    {page.title}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">
                    {page.handle}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.is_published ? "success" : "secondary"}
                    >
                      {page.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {relativeDate(page.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/store/webstore/pages/${page.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &ldquo;{page.title}&rdquo;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The page will be
                              permanently removed from your storefront.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(page.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
