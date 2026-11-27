// The tests as the run page shows them, and the one function that picks the
// tests a selection runs. The service and the run page both import this
// module, so it holds no Node code. Tags are written as the tests write
// them, such as "@smoke".

/** Picked test files, or chosen tags; neither runs every test. */
export type Selection = Readonly<{
  /** File paths relative to the test directory. */
  files: readonly string[];
  tags: readonly string[];
}>;

/** One test of a test file. */
export type Test = Readonly<{
  /** The titles from the file's top-level group down to the test. */
  titlePath: readonly string[];
  /** Its own tags and those of its groups. */
  tags: readonly string[];
  /** A planned test, `test.fixme`, which a run never runs. */
  planned: boolean;
}>;

export type TestFile = Readonly<{
  /** File path relative to the test directory. */
  path: string;
  /** The first directory in the relative path. */
  area: string;
  /** The title of the file's top-level group. */
  title: string;
  tests: readonly Test[];
}>;

export type TestInventory = Readonly<{
  files: readonly TestFile[];
  /** Every tag a test carries, sorted. */
  tags: readonly string[];
}>;

/** A test of a test file. */
export type SelectedTest = Readonly<{ file: TestFile; test: Test }>;

/** A selection that names both test files and tags. */
export class SelectionError extends Error {
  override name = "SelectionError";
}

/**
 * The tests a run of the selection runs, each once, in the inventory's
 * order: every automated test of the picked files, or every automated test
 * that carries a chosen tag, or every automated test. Planned tests never
 * run.
 */
export function selectedTests(
  inventory: TestInventory,
  selection: Selection,
): SelectedTest[] {
  if (selection.files.length > 0 && selection.tags.length > 0)
    throw new SelectionError("A run selects test files or tags, not both.");
  const files =
    selection.files.length > 0
      ? inventory.files.filter((file) => selection.files.includes(file.path))
      : inventory.files;
  return files.flatMap((file) =>
    file.tests
      .filter((test) => !test.planned)
      .filter(
        (test) =>
          selection.tags.length === 0 ||
          test.tags.some((tag) => selection.tags.includes(tag)),
      )
      .map((test) => ({ file, test })),
  );
}

/** How many tests a run of the selection runs, planned tests not counted. */
export function countTests(
  inventory: TestInventory,
  selection: Selection,
): number {
  return selectedTests(inventory, selection).length;
}
