"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Menu } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface MenuSummary {
  id: string;
  title: string;
  handle: string;
  item_count: number;
  updated_at: string;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function MenusListPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading } = useQuery<MenuSummary[]>({
    queryKey: ["webstore-menus"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/menus/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load menus");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/api/webstore/menus/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete menu");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-menus"] });
      toast.success("Menu deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Navigation Menus
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage the navigation structure of your storefront
          </p>
        </div>
        <Link href="/store/webstore/menus/new">
          <Button className="bg-[#F97316] hover:bg-orange-600 text-white gap-2">
            <Plus className="w-4 h-4" />
            Create Menu
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : menus.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <Menu className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            No menus yet. Create your first navigation menu.
          </p>
          <Link href="/store/webstore/menus/new">
            <Button
              variant="outline"
              className="border-[#F97316] text-[#F97316] hover:bg-orange-50"
            >
              Create Menu
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
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium text-slate-800">
                    {menu.title}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">
                    {menu.handle}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {menu.item_count}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {relativeDate(menu.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/store/webstore/menus/${menu.id}`}>
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
                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &ldquo;{menu.title}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The menu and all its
                              items will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(menu.id)}
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
