const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for use in HTML content or attribute values. */
export const esc = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);

/** Marks a string as already-safe HTML so `html` leaves it alone. */
export class Raw {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
}
export const raw = (value: string) => new Raw(value);

type Part = string | number | Raw | null | undefined | false | Part[];

const render = (part: Part): string => {
  if (part === null || part === undefined || part === false) return "";
  if (Array.isArray(part)) return part.map(render).join("");
  if (part instanceof Raw) return part.value;
  return esc(part);
};

/** Tagged template: interpolated values are escaped unless wrapped in `raw()` or produced by `html`. */
export const html = (strings: TemplateStringsArray, ...values: Part[]): Raw =>
  new Raw(strings.reduce((out, chunk, index) => out + chunk + (index < values.length ? render(values[index]) : ""), ""));

export const pad = (value: string | number, width: number) => String(value).padEnd(width, " ");
