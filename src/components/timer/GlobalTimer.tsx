import { TimerFloatingPopup } from "./TimerFloatingPopup";
import { TimerMiniWidget } from "./TimerMiniWidget";

/**
 * Global timer components that persist across all pages.
 * Renders the floating popup when open and mini-widget when minimized.
 */
export function GlobalTimer() {
  return (
    <>
      <TimerFloatingPopup />
      <TimerMiniWidget />
    </>
  );
}
