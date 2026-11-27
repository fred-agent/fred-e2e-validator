// Follow appended lines only while the reader is near the bottom.
import { useEffect, useRef } from "react";
import { parseLine } from "../../../e2e-framework/reporting/run-log.ts";

/** How close to the end, in pixels, still counts as reading the end. */
const AT_END_PX = 40;

export function RunLog({ text }: { text: string }) {
  const box = useRef<HTMLPreElement>(null);
  const atEnd = useRef(true);
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();

  useEffect(() => {
    const element = box.current;
    if (element && atEnd.current) element.scrollTop = element.scrollHeight;
  }, [text]);

  return (
    <pre
      ref={box}
      className="e2e-log"
      role="log"
      aria-label="Run log"
      tabIndex={0}
      onScroll={() => {
        const element = box.current;
        if (element)
          atEnd.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            AT_END_PX;
      }}
    >
      {lines.map((line, index) => (
        // Lines only ever append, so their index is a stable key.
        <span key={index} data-event={parseLine(line)?.event || undefined}>
          {line}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}
