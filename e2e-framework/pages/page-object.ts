import type { Page } from "@playwright/test";

/**
 * What the page registry can create: a class whose constructor takes the
 * page, with its name in the report and the run log.
 */
export type PageObjectClass = {
  new (page: Page): object;
  /** The page's name in the report and the run log, such as "Sign-in page". */
  readonly displayName: string;
};
