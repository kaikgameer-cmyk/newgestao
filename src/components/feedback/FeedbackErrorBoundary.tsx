import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class FeedbackErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[FeedbackSystem] Error caught by boundary:", error.message);
    console.warn("[FeedbackSystem] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Silently fail - feedback system should never crash the app
      return null;
    }

    return this.props.children;
  }
}
