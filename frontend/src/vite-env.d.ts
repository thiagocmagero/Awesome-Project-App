/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BACKEND_PORT: string;
  readonly VITE_FRONTEND_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ── Planning page globals (loaded dynamically via <script>/<link> tags) ──────

declare const flatpickr: (
  el: HTMLElement,
  opts?: Record<string, unknown>,
) => { destroy(): void; setDate(d: string | Date, triggerChange?: boolean): void };

declare const Choices: new (
  el: HTMLElement,
  opts?: Record<string, unknown>,
) => { destroy(): void; setChoiceByValue(v: string): void };

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const gantt: {
  config: any;
  templates: any;
  locale: any;
  ext: any;
  init(el: string | HTMLElement): void;
  parse(data: any): void;
  clearAll(): void;
  destructor(): void;
  createDatastore(cfg: any): any;
  getDatastore(name: string): any;
  serverList(name: string): any[];
  updateCollection(name: string, items: any[]): void;
  getTaskBy(field: string, value: any): any[];
  copy(obj: any): any;
  attachEvent(name: string, handler: (...args: any[]) => any): string;
  detachEvent(id: string): void;
  getTask(id: any): any;
  updateTask(id: any): void;
  showLightbox(id: any): void;
  message(opts: any): void;
  setSizes(): void;
  render(): void;
  open(id: any): void;
  close(id: any): void;
  eachTask(fn: (task: any) => void): void;
  isCircularLink(link: any): boolean;
  date: {
    date_to_str(format: string): (date: Date) => string;
    add(date: Date, amount: number, unit: string): Date;
  };
  isWorkTime(date: Date): boolean;
  setWorkTime(cfg: any): void;
  addMarker(marker: { start_date: Date; css?: string; text?: string; title?: string }): string;
  renderMarkers(): void;
  plugins(cfg: Record<string, boolean>): void;
  resetLayout(): void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// Zynix template globals
declare function particlesJS(
  elementId: string,
  params: Record<string, unknown>
): void;

interface Window {
  particlesJS: typeof particlesJS;
}
