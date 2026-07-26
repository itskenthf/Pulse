"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "./error-state";

export interface WidgetErrorBoundaryProps {
  name: string;
  children: ReactNode;
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

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={`${this.props.name} is unavailable`}
          message="Other widgets are unaffected — try refreshing the page."
        />
      );
    }
    return this.props.children;
  }
}
