"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronRight,
  ExternalLink,
  Layers,
  FileText,
  ShoppingBag,
  Link2,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface MenuItem {
  id: string;
  title: string;
  type: "collection" | "product" | "page" | "url";
  url: string | null;
  resource_id: string | null;
  resource_label: string | null;
  open_in_new_tab: boolean;
  position: number;
  children: MenuItem[];
}

const ITEM_ICONS: Record<MenuItem["type"], React.ElementType> = {
  collection: Layers,
  product: ShoppingBag,
  page: FileText,
  url: Link2,
};

const TYPE_LABELS: Record<MenuItem["type"], string> = {
  collection: "Collection",
  product: "Product",
  page: "Page",
  url: "External URL",
};

// ─── Single sortable row ──────────────────────────────────────────────────────

function SortableMenuItem({
  item,
  depth,
  selectedId,
  onSelect,
  onDelete,
  children,
}: {
  item: MenuItem;
  depth: number;
  selectedId: string | null;
  onSelect: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  children?: React.ReactNode;
}) {
  const [childrenOpen, setChildrenOpen] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = ITEM_ICONS[item.type];
  const isSelected = selectedId === item.id;
  const hasChildren = item.children.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-1 bg-white transition-colors",
          depth > 0 && "ml-7",
          isSelected
            ? "border-[#F97316] bg-orange-50"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Expand children toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setChildrenOpen((o) => !o)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            {childrenOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-3.5 shrink-0" />
        )}

        {/* Icon + title */}
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-sm text-slate-800 truncate">{item.title}</span>

        {/* Type badge */}
        <span className="text-xs text-slate-400 hidden sm:block">
          {TYPE_LABELS[item.type]}
        </span>

        {item.open_in_new_tab && (
          <ExternalLink className="w-3 h-3 text-slate-300" />
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasChildren && childrenOpen && children}
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  item,
  onChange,
  onClose,
}: {
  item: MenuItem;
  onChange: (updated: MenuItem) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<MenuItem>(item);

  function update<K extends keyof MenuItem>(key: K, value: MenuItem[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    onChange(local);
    onClose();
  }

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Edit Item</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={local.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Menu item label"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Link Type</Label>
        <Select
          value={local.type}
          onValueChange={(v) => update("type", v as MenuItem["type"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="collection">Collection</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="page">Page</SelectItem>
            <SelectItem value="url">External URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {local.type === "url" ? (
        <div className="space-y-1.5">
          <Label>URL</Label>
          <Input
            value={local.url ?? ""}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>
            {TYPE_LABELS[local.type]} (handle or ID)
          </Label>
          <Input
            value={local.resource_id ?? ""}
            onChange={(e) => update("resource_id", e.target.value)}
            placeholder={`e.g. ${local.type}-slug`}
          />
          <p className="text-xs text-slate-400">
            Enter the handle of the {local.type} to link to.
          </p>
        </div>
      )}

      {local.type === "url" && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <Label className="cursor-pointer text-sm">Open in new tab</Label>
          <Switch
            checked={local.open_in_new_tab}
            onCheckedChange={(v) => update("open_in_new_tab", v)}
          />
        </div>
      )}

      <Button
        onClick={save}
        disabled={!local.title.trim()}
        className="w-full bg-[#F97316] hover:bg-orange-600 text-white"
      >
        Apply Changes
      </Button>
    </div>
  );
}

// ─── Add Item dialog ──────────────────────────────────────────────────────────

function AddItemPanel({
  onAdd,
  onClose,
}: {
  onAdd: (item: Omit<MenuItem, "id" | "position" | "children">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MenuItem["type"]>("url");
  const [url, setUrl] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);

  function handleAdd() {
    onAdd({
      title,
      type,
      url: type === "url" ? url : null,
      resource_id: type !== "url" ? resourceId : null,
      resource_label: null,
      open_in_new_tab: openInNewTab,
    });
    onClose();
  }

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Add Menu Item</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Shop All"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>Link Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as MenuItem["type"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="collection">Collection</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="page">Page</SelectItem>
            <SelectItem value="url">External URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "url" ? (
        <>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <Label className="cursor-pointer text-sm">Open in new tab</Label>
            <Switch
              checked={openInNewTab}
              onCheckedChange={setOpenInNewTab}
            />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label>{TYPE_LABELS[type]} handle or ID</Label>
          <Input
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            placeholder={`e.g. all-products`}
          />
        </div>
      )}

      <Button
        onClick={handleAdd}
        disabled={!title.trim() || (type === "url" && !url.trim())}
        className="w-full bg-[#F97316] hover:bg-orange-600 text-white"
      >
        Add Item
      </Button>
    </div>
  );
}

// ─── Main MenuItemTree component ──────────────────────────────────────────────

interface MenuItemTreeProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}

export function MenuItemTree({ items, onChange }: MenuItemTreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<"root" | string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedItem = findItem(items, selectedId);

  // ── Helpers ─────────────────────────────────────────────

  function findItem(list: MenuItem[], id: string | null): MenuItem | null {
    if (!id) return null;
    for (const item of list) {
      if (item.id === id) return item;
      const found = findItem(item.children, id);
      if (found) return found;
    }
    return null;
  }

  function updateItem(list: MenuItem[], updated: MenuItem): MenuItem[] {
    return list.map((item) => {
      if (item.id === updated.id) return updated;
      return { ...item, children: updateItem(item.children, updated) };
    });
  }

  function deleteItem(list: MenuItem[], id: string): MenuItem[] {
    return list
      .filter((item) => item.id !== id)
      .map((item) => ({ ...item, children: deleteItem(item.children, id) }));
  }

  function generateId() {
    return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ── Handlers ─────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Top-level reorder
    const activeIdx = items.findIndex((i) => i.id === active.id);
    const overIdx = items.findIndex((i) => i.id === over.id);
    if (activeIdx !== -1 && overIdx !== -1) {
      onChange(arrayMove(items, activeIdx, overIdx));
      return;
    }

    // Children reorder
    const newItems = items.map((item) => {
      const aIdx = item.children.findIndex((c) => c.id === active.id);
      const oIdx = item.children.findIndex((c) => c.id === over.id);
      if (aIdx !== -1 && oIdx !== -1) {
        return { ...item, children: arrayMove(item.children, aIdx, oIdx) };
      }
      return item;
    });
    onChange(newItems);
  }

  function handleAddItem(
    newData: Omit<MenuItem, "id" | "position" | "children">,
    parentId: string | null,
  ) {
    const newItem: MenuItem = {
      ...newData,
      id: generateId(),
      position: 0,
      children: [],
    };
    if (!parentId) {
      onChange([...items, newItem]);
    } else {
      onChange(
        items.map((item) => {
          if (item.id === parentId) {
            return { ...item, children: [...item.children, newItem] };
          }
          return item;
        }),
      );
    }
  }

  function handleUpdateItem(updated: MenuItem) {
    onChange(updateItem(items, updated));
    setSelectedId(null);
  }

  function handleDeleteItem(id: string) {
    onChange(deleteItem(items, id));
    if (selectedId === id) setSelectedId(null);
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Tree */}
      <div>
        {items.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            <p className="text-sm">No items yet. Add your first menu item.</p>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableMenuItem
                key={item.id}
                item={item}
                depth={0}
                selectedId={selectedId}
                onSelect={(i) => {
                  setSelectedId(i.id);
                  setAddingTo(null);
                }}
                onDelete={handleDeleteItem}
              >
                {/* Children (depth 1) */}
                {item.children.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={item.children.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {item.children.map((child) => (
                        <SortableMenuItem
                          key={child.id}
                          item={child}
                          depth={1}
                          selectedId={selectedId}
                          onSelect={(i) => {
                            setSelectedId(i.id);
                            setAddingTo(null);
                          }}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Add child button (depth 0 only, max 1 sub-level) */}
                <button
                  type="button"
                  onClick={() => {
                    setAddingTo(item.id);
                    setSelectedId(null);
                  }}
                  className="ml-7 flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#F97316] py-1"
                >
                  + Add sub-item
                </button>
              </SortableMenuItem>
            ))}
          </SortableContext>

          <DragOverlay>
            {activeId && (() => {
              const dragged = findItem(items, activeId);
              if (!dragged) return null;
              return (
                <div className="flex items-center gap-2 rounded-lg border border-[#F97316] bg-orange-50 px-3 py-2.5 shadow-md opacity-90">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <span className="text-sm font-medium text-slate-800">
                    {dragged.title}
                  </span>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>

        {/* Add top-level item */}
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-dashed"
          onClick={() => {
            setAddingTo("root");
            setSelectedId(null);
          }}
        >
          + Add Menu Item
        </Button>
      </div>

      {/* Side panel */}
      <div>
        {selectedItem && (
          <PropertiesPanel
            item={selectedItem}
            onChange={handleUpdateItem}
            onClose={() => setSelectedId(null)}
          />
        )}

        {addingTo !== null && (
          <AddItemPanel
            onAdd={(data) =>
              handleAddItem(data, addingTo === "root" ? null : addingTo)
            }
            onClose={() => setAddingTo(null)}
          />
        )}

        {!selectedItem && addingTo === null && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            <p className="text-sm">Select an item to edit its properties.</p>
          </div>
        )}
      </div>
    </div>
  );
}
