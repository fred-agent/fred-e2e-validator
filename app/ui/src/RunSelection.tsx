// What a run selects: every test, chosen tags, or picked test files grouped
// by area, each file with its tests by title path. The count is the
// service's own `countTests`.
import {
  Button,
  Checkbox,
  Chip,
  Disclosure,
  IconButton,
  PageEmptyState,
  SelectableCard,
  TextInput,
  type MaterialIconType,
} from "@fred-oss/ui";
import { useState } from "react";
import {
  countTests,
  type Selection,
  type Test,
  type TestFile,
  type TestInventory,
} from "../../service/test-view.ts";
import { plural } from "./format.ts";

export type Mode = "everything" | "tags" | "pick";

export type Choice = Readonly<{
  mode: Mode;
  tags: ReadonlySet<string>;
  files: ReadonlySet<string>;
}>;

export const NO_CHOICE: Choice = {
  mode: "everything",
  tags: new Set(),
  files: new Set(),
};

const MODES: readonly Readonly<{
  mode: Mode;
  title: string;
  description: string;
  icon: MaterialIconType;
}>[] = [
  {
    mode: "everything",
    title: "Everything",
    description: "Every automated test.",
    icon: "check_box",
  },
  {
    mode: "tags",
    title: "By tag",
    description: "The tests that carry a chosen tag.",
    icon: "category",
  },
  {
    mode: "pick",
    title: "Pick test files",
    description: "Test files chosen from a searchable list.",
    icon: "search",
  },
];

export function selectionOf({ mode, tags, files }: Choice): Selection {
  if (mode === "tags") return { files: [], tags: [...tags] };
  if (mode === "pick") return { files: [...files], tags: [] };
  return { files: [], tags: [] };
}

/** The tests a choice runs; nothing while no tag or test file is chosen. */
export function testCount(inventory: TestInventory, choice: Choice): number {
  if (choice.mode === "tags" && choice.tags.size === 0) return 0;
  if (choice.mode === "pick" && choice.files.size === 0) return 0;
  return countTests(inventory, selectionOf(choice));
}

const testsIn = (inventory: TestInventory, file: TestFile) =>
  countTests(inventory, { files: [file.path], tags: [] });

const plannedIn = (file: TestFile) =>
  file.tests.filter((test) => test.planned).length;

/** A test's title path below the file's top-level group, which titles the file. */
function titleOf(file: TestFile, test: Test): string {
  const [group, ...rest] = test.titlePath;
  return group === file.title && rest.length > 0
    ? rest.join(" › ")
    : test.titlePath.join(" › ");
}

function toggled(values: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function matches(file: TestFile, query: string): boolean {
  const text = query.trim().toLowerCase();
  return (
    !text ||
    file.title.toLowerCase().includes(text) ||
    file.path.toLowerCase().includes(text) ||
    file.tests.some(
      (test) =>
        test.titlePath.some((title) => title.toLowerCase().includes(text)) ||
        test.tags.some((tag) => tag.toLowerCase().includes(text)),
    )
  );
}

function TagPicker({
  inventory,
  chosen,
  onChange,
}: {
  inventory: TestInventory;
  chosen: ReadonlySet<string>;
  onChange: (tags: ReadonlySet<string>) => void;
}) {
  return (
    <div className="e2e-row" role="group" aria-label="Tags">
      {inventory.tags.map((tag) => (
        <Button
          type="button"
          key={tag}
          color="primary"
          variant={chosen.has(tag) ? "filled" : "outlined"}
          size="small"
          aria-pressed={chosen.has(tag)}
          onClick={() => onChange(toggled(chosen, tag))}
        >
          {`${tag} · ${countTests(inventory, { files: [], tags: [tag] })}`}
        </Button>
      ))}
    </div>
  );
}

function TestFileRow({
  inventory,
  file,
  picked,
  onToggle,
}: {
  inventory: TestInventory;
  file: TestFile;
  picked: boolean;
  onToggle: () => void;
}) {
  const planned = plannedIn(file);
  return (
    <div className="e2e-test-file">
      <label className="e2e-check">
        <Checkbox checked={picked} onChange={onToggle} />
        <span>
          <strong>{file.title}</strong>{" "}
          <span className="e2e-muted">
            {file.path} · {plural(testsIn(inventory, file), "test")}
            {planned > 0 ? `, ${planned} planned` : ""}
          </span>
        </span>
      </label>
      <Disclosure title={`Tests (${file.tests.length})`}>
        <ul className="e2e-tests">
          {file.tests.map((test) => (
            <li key={test.titlePath.join("\n")}>
              {titleOf(file, test)}
              {(test.planned || test.tags.length > 0) && (
                <span className="e2e-muted">
                  {" "}
                  {[...(test.planned ? ["planned"] : []), ...test.tags].join(
                    " · ",
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

function TestFilePicker({
  inventory,
  picked,
  onPicked,
  onClear,
}: {
  inventory: TestInventory;
  picked: ReadonlySet<string>;
  onPicked: (files: ReadonlySet<string>) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const shown = inventory.files.filter((file) => matches(file, query));
  const areas = [...new Set(shown.map((file) => file.area))].sort();
  const setPicked = (files: readonly TestFile[], on: boolean) => {
    const next = new Set(picked);
    for (const file of files)
      if (on) next.add(file.path);
      else next.delete(file.path);
    onPicked(next);
  };

  return (
    <div className="e2e-stack">
      <div className="e2e-row">
        <TextInput
          label="Search"
          placeholder="Title, path or tag"
          icon={{ type: "search" }}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          type="button"
          color="primary"
          variant="outlined"
          size="small"
          onClick={() => setPicked(shown, true)}
        >
          Select shown
        </Button>
        <Button
          type="button"
          color="primary"
          variant="text"
          size="small"
          onClick={() => {
            setQuery("");
            onClear();
          }}
        >
          Clear
        </Button>
      </div>
      {shown.length === 0 ? (
        <PageEmptyState icon="search_off" message="No test file matches." />
      ) : (
        <div className="e2e-test-files">
          {areas.map((area) => {
            const files = shown.filter((file) => file.area === area);
            const count = files.filter((file) => picked.has(file.path)).length;
            const open = !collapsed.has(area);
            return (
              <section key={area} aria-label={area}>
                <div className="e2e-area">
                  <IconButton
                    type="button"
                    variant="icon"
                    size="small"
                    icon={{
                      type: open ? "expand_less" : "expand_more",
                      accessibleName: `${open ? "Collapse" : "Expand"} ${area}`,
                    }}
                    onClick={() => setCollapsed(toggled(collapsed, area))}
                  />
                  <label className="e2e-check">
                    <Checkbox
                      checked={count === files.length}
                      indeterminate={count > 0 && count < files.length}
                      onChange={() => setPicked(files, count < files.length)}
                    />
                    <strong>{area}</strong>
                  </label>
                </div>
                {open &&
                  files.map((file) => (
                    <TestFileRow
                      key={file.path}
                      inventory={inventory}
                      file={file}
                      picked={picked.has(file.path)}
                      onToggle={() => onPicked(toggled(picked, file.path))}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RunSelection({
  inventory,
  choice,
  onChange,
}: {
  inventory: TestInventory;
  choice: Choice;
  onChange: (choice: Choice) => void;
}) {
  const tests = testCount(inventory, choice);
  const picked = inventory.files.filter((file) => choice.files.has(file.path));
  return (
    <section className="e2e-stack" aria-label="What to run">
      <div className="e2e-modes">
        {MODES.map((mode) => (
          <SelectableCard
            key={mode.mode}
            selected={choice.mode === mode.mode}
            title={mode.title}
            description={mode.description}
            icon={mode.icon}
            onSelect={() => onChange({ ...choice, mode: mode.mode })}
          />
        ))}
      </div>
      {choice.mode === "tags" && (
        <TagPicker
          inventory={inventory}
          chosen={choice.tags}
          onChange={(tags) => onChange({ ...choice, tags })}
        />
      )}
      {choice.mode === "pick" && (
        <TestFilePicker
          inventory={inventory}
          picked={choice.files}
          onPicked={(files) => onChange({ ...choice, files })}
          onClear={() =>
            onChange({ ...choice, files: new Set(), tags: new Set() })
          }
        />
      )}
      {choice.mode === "pick" && picked.length > 0 && (
        <div className="e2e-row e2e-summary" aria-label="Selected test files">
          {picked.map((file) => (
            <Chip
              key={file.path}
              label={file.title}
              title={file.path}
              onRemove={() =>
                onChange({
                  ...choice,
                  files: toggled(choice.files, file.path),
                })
              }
            />
          ))}
        </div>
      )}
      <p className="e2e-muted" aria-live="polite">
        {tests > 0
          ? `${plural(tests, "test")} will run.`
          : "Nothing to run yet."}
      </p>
    </section>
  );
}
