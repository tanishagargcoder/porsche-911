"use client";

import { Component, type ReactNode } from "react";

type State = { error: Error | null };

/**
 * Catches anything the 3D scene throws and prints it plainly.
 *
 * Without this, React's dev overlay tries to serialise the props of everything
 * in the tree to build its report — and the scene graph is full of Three.js
 * objects whose `parent` and `children` point at each other. Serialising those
 * throws "Converting circular structure to JSON", which is then the error you
 * see instead of the one that actually happened.
 */
export class SceneBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // plain string only — logging the error object drags the scene graph along
    console.error("[scene]", error.message);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink px-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ruby">
          The scene stopped
        </span>

        <p className="max-w-lg font-mono text-xs leading-relaxed text-white/70">
          {error.message}
        </p>

        <pre className="max-h-40 max-w-lg overflow-auto text-left font-mono text-[10px] leading-relaxed text-white/30">
          {(error.stack ?? "").split("\n").slice(1, 6).join("\n")}
        </pre>

        <button
          onClick={() => window.location.reload()}
          className="border border-ruby px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white transition-colors hover:bg-ruby/15"
        >
          Reload
        </button>
      </div>
    );
  }
}
