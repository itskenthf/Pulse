import type { Widget } from "./widget";

const registry = new Map<string, Widget>();

/** Registers a widget with the shell. The shell never imports widget internals directly. */
export function registerWidget(widget: Widget): void {
  if (registry.has(widget.id)) {
    throw new Error(`Widget "${widget.id}" is already registered`);
  }
  registry.set(widget.id, widget);
}

export function getWidget(id: string): Widget | undefined {
  return registry.get(id);
}

export function getAllWidgets(): Widget[] {
  return Array.from(registry.values());
}
