import { TimerMiniWidget } from "./TimerMiniWidget";

/**
 * Global timer components that persist across all pages.
 * Renders only the mini-widget when timer is active.
 * Full controls are available on the Timer page.
 */
export function GlobalTimer() {
  return <TimerMiniWidget />;
}
