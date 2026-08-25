"use client";

import * as React from "react";
import { Plus, ChevronRight, Network } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface Node {
  id: string;
  name: string;
  code: string | null;
  level: number;
  parent_id: string | null;
  status: string;
}

interface Settings {
  level_1_label: string;
  level_2_label: string;
  level_3_label: string;
  level_4_label: string;
}

export default function HierarchyPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [settings, setSettings] = React.useState<Settings>({
    level_1_label: "Zone",
    level_2_label: "Circle",
    level_3_label: "Division",
    level_4_label: "Station",
  });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    level: "1",
    parent_id: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: nodeData }, { data: settingsData }] = await Promise.all([
      supabase.from("hierarchy_nodes").select("*").order("level").order("name"),
      supabase.from("app_settings").select("key, value"),
    ]);
    setNodes(nodeData ?? []);
    if (settingsData) {
      const map: Record<string, string> = {};
      for (const s of settingsData) map[s.key] = s.value;
      setSettings({
        level_1_label: map["level_1_label"] ?? "Zone",
        level_2_label: map["level_2_label"] ?? "Circle",
        level_3_label: map["level_3_label"] ?? "Division",
        level_4_label: map["level_4_label"] ?? "Station",
      });
    }
  }

  function levelLabel(level: number) {
    return (
      settings[`level_${level}_label` as keyof Settings] ?? `Level ${level}`
    );
  }

  function parentOptions() {
    const targetLevel = parseInt(form.level, 10);
    if (targetLevel === 1) return [];
    return nodes.filter((n) => n.level === targetLevel - 1);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("hierarchy_nodes").insert({
      name: form.name.trim(),
      code: form.code.trim() || null,
      level: parseInt(form.level, 10),
      parent_id: form.parent_id || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", code: "", level: "1", parent_id: "" });
    load();
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const children = nodes.filter((n) => n.parent_id === parentId);
    if (children.length === 0) return null;
    return (
      <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
        {children.map((node) => {
          const hasChildren = nodes.some((n) => n.parent_id === node.id);
          const expanded = expandedIds.has(node.id);
          return (
            <div key={node.id} className="py-1">
              <div className="flex items-center gap-2 group">
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(node.id)}
                    className="text-slate-400 hover:text-foreground transition-colors"
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                  </button>
                ) : (
                  <span className="h-3.5 w-3.5 inline-block" />
                )}
                <span className="text-sm font-medium text-foreground">{node.name}</span>
                {node.code && (
                  <span className="text-xs text-foreground-secondary">({node.code})</span>
                )}
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {levelLabel(node.level)}
                </Badge>
                <Badge
                  variant={node.status === "active" ? "success" : "danger"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {node.status}
                </Badge>
              </div>
              {hasChildren && expanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }

  const rootNodes = nodes.filter((n) => n.parent_id === null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Hierarchy</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {levelLabel(1)} → {levelLabel(2)} → {levelLabel(3)} → {levelLabel(4)}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Node
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Tree</CardTitle>
          <CardDescription>
            {nodes.length === 0
              ? "No nodes yet. Add your first Zone / Circle / Division / Station."
              : `${nodes.length} node${nodes.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-foreground-secondary">
              <Network className="h-10 w-10 text-slate-200" />
              <p className="text-sm">Click &ldquo;Add Node&rdquo; to build your hierarchy.</p>
            </div>
          ) : (
            renderTree(null, 0)
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Hierarchy Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value, parent_id: "" }))}
              >
                {[1, 2, 3, 4].map((l) => (
                  <option key={l} value={String(l)}>
                    Level {l} — {levelLabel(l)}
                  </option>
                ))}
              </select>
            </div>

            {parseInt(form.level, 10) > 1 && (
              <div className="space-y-1.5">
                <Label>Parent {levelLabel(parseInt(form.level, 10) - 1)}</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.parent_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                >
                  <option value="">— select parent —</option>
                  {parentOptions().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={`e.g. Bangalore North ${levelLabel(parseInt(form.level, 10))}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. BLR-N-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
