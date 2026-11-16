export interface ElementOptions {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
}

/**
 * Creates an element. Text always goes through textContent, so text that comes from
 * the API can never be interpreted as HTML.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (options.class) {
    node.className = options.class;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    node.setAttribute(name, value);
  }
  node.append(...children);

  return node;
}
