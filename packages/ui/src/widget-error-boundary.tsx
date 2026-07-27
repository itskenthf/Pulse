"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "./error-state";

export interface WidgetErrorBoundaryProps {
  name: string;
  children: ReactNode;
  /** Any value that changes on the next server-driven re-render of this
   *  boundary's children — callers pass a fresh value computed at the
   *  wrapping Server Component's own render (e.g. `Date.now()`), since
   *  `revalidatePath` re-executes Server Components but doesn't remount
   *  this Client Component (it's keyed by the widget's static id, which
   *  never changes). Without this, a boundary that ever caught an error
   *  stayed in that state forever — even after a later refresh
   *  successfully re-fetched the widget's data — because nothing told
   *  the class instance to give the new children a fresh render attempt.
   */
  resetKey?: unknown;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps one widget's Suspense boundary so an error anywhere in its render
 * tree — including inside its async Server Component, which Next.js's
 * streaming SSR surfaces to the nearest Client Component error boundary —
 * shows an ErrorState in just that grid cell, not the whole dashboard. A
 * plain try/catch around a widget's render() call only catches
 * synchronous errors in that top-level function; it can't catch errors
 * thrown by JSX descendants during React's actual render phase, since
 * JSX elements are just deferred descriptions until React renders them.
 * Error boundaries must be class components — React has no Hook
 * equivalent for `componentDidCatch`/`getDerivedStateFromError`.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(`Widget "${this.props.name}" failed to render`, error);
  }

  componentDidUpdate(prevProps: WidgetErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={`${this.props.name} is unavailable`}
          message="Other widgets are unaffected — it'll retry on the next refresh."
        />
      );
    }
    return this.props.children;
  }
}
