import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TARGET_SELECTORS = [
  ".zoho-table-wrap",
  ".table-scroll",
  ".import-table-scroll",
  ".ai-report-table-wrap",
  ".custom-panel-table-scroll",
  ".crm-table-wrap",
  ".table-panel",
  ".zoho-records-table-wrap",
  ".records-table-wrap",
  ".kanban-board-scroll",
  ".zoho-kanban-board",
  ".dashboard-table-wrap"
].join(",");

type EnhancedElement = HTMLElement & {
  __topScrollCleanup?: () => void;
  __topScrollBound?: boolean;
};

function createTopScrollbar(target: EnhancedElement) {
  if (target.__topScrollBound) return;

  const parent = target.parentElement;
  if (!parent) return;

  const proxy = document.createElement("div");
  proxy.className = "crm-top-scrollbar";
  const spacer = document.createElement("div");
  spacer.className = "crm-top-scrollbar__inner";
  proxy.appendChild(spacer);
  parent.insertBefore(proxy, target);

  let syncingFromProxy = false;
  let syncingFromTarget = false;

  const update = () => {
    const hasOverflow = target.scrollWidth - target.clientWidth > 12;
    if (!hasOverflow) {
      proxy.style.display = "none";
      return;
    }
    proxy.style.display = "block";
    spacer.style.width = `${target.scrollWidth}px`;
    proxy.scrollLeft = target.scrollLeft;
  };

  const onProxyScroll = () => {
    if (syncingFromTarget) return;
    syncingFromProxy = true;
    target.scrollLeft = proxy.scrollLeft;
    syncingFromProxy = false;
  };

  const onTargetScroll = () => {
    if (syncingFromProxy) return;
    syncingFromTarget = true;
    proxy.scrollLeft = target.scrollLeft;
    syncingFromTarget = false;
  };

  proxy.addEventListener("scroll", onProxyScroll, { passive: true });
  target.addEventListener("scroll", onTargetScroll, { passive: true });

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(target);
  if (target.firstElementChild instanceof HTMLElement) {
    resizeObserver.observe(target.firstElementChild);
  }

  const mutationObserver = new MutationObserver(() => update());
  mutationObserver.observe(target, { childList: true, subtree: true, attributes: true });

  const cleanup = () => {
    proxy.removeEventListener("scroll", onProxyScroll);
    target.removeEventListener("scroll", onTargetScroll);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    proxy.remove();
    delete target.__topScrollCleanup;
    delete target.__topScrollBound;
  };

  target.__topScrollCleanup = cleanup;
  target.__topScrollBound = true;
  update();
}

function scanAndEnhance() {
  const candidates = Array.from(document.querySelectorAll<EnhancedElement>(TARGET_SELECTORS));
  candidates.forEach((el) => {
    const style = window.getComputedStyle(el);
    const canScrollX = ["auto", "scroll", "overlay"].includes(style.overflowX) || el.scrollWidth > el.clientWidth;
    if (canScrollX) createTopScrollbar(el);
  });

  // cleanup detached or no longer matching nodes
  Array.from(document.querySelectorAll<HTMLElement>(".crm-top-scrollbar")).forEach((proxy) => {
    const next = proxy.nextElementSibling as EnhancedElement | null;
    if (!next || !next.__topScrollBound) proxy.remove();
  });
}

export default function GlobalTopScrollSync() {
  const location = useLocation();

  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => scanAndEnhance());
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", run);

    const timeout = window.setTimeout(run, 300);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", run);
      window.clearTimeout(timeout);
    };
  }, [location.pathname, location.search]);

  return null;
}
