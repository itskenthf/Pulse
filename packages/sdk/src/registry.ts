import type { Widget, WidgetActions } from "./widget";

const registry = new Map<string, Widget>();

/**
 * Registers a widget with the shell. The shell never imports widget
 * internals directly. Re-registering the exact same widget object is a
 * no-op (module re-evaluation under dev/HMR) — registering a *different*
 * widget under an id already in use is a real bug and still throws.
 */
export function registerWidget<
  TData,
  TSettings,
  TActions extends WidgetActions = WidgetActions,
>(widget: Widget<TData, TSettings, TActions>): void {
  const existing = registry.get(widget.id);
  if (existing) {
    if (existing === widget) return;
    throw new Error(`Widget "${widget.id}" is already registered`);
  }
  // The registry necessarily erases each widget's specific TData/TSettings
  // once stored alongside other widgets — callers that need them back
  // (the shell's render loop) re-attach the type via the widget's own
  // declared render() signature, not via `any` here.
  registry.set(widget.id, widget as unknown as Widget);
}

export function getWidget(id: string): Widget | undefined {
  return registry.get(id);
}

export function getAllWidgets(): Widget[] {
  return Array.from(registry.values());
}
