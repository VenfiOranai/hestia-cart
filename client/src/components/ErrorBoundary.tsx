import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React error boundary. Catches errors thrown during rendering in the subtree
 * below it and shows a fallback UI instead of a blank white screen. Errors in
 * event handlers, async callbacks, or useEffect teardown won't be caught here
 * — those should be handled locally with try/catch + toast.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to the console so it still shows up in devtools; a real deployment
    // would forward this to an error tracking service.
    console.error("Rendering error caught by ErrorBoundary:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              The app hit an unexpected error. You can try again, or reload the
              page if it keeps happening.
            </p>
          </div>
          <pre className="text-left text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex-1 min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 min-h-[44px] rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
