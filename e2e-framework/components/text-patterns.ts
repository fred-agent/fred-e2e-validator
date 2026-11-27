/** Text with regular expression characters escaped, to build a pattern from it. */
export function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches names that start with this text, such as a card named by its title and description. */
export function startingWith(text: string): RegExp {
  return new RegExp(`^${literal(text)}`);
}

/** Matches text that ends with this text, such as a chip whose icon ligature comes first. */
export function endingWith(text: string): RegExp {
  return new RegExp(`${literal(text)}$`);
}

/** Labels or names in a message, each quoted, or "none". */
export function quoted(names: readonly string[]): string {
  return names.length > 0
    ? names.map((name) => `"${name}"`).join(", ")
    : "none";
}
