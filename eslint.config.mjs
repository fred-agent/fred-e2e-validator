import js from "@eslint/js";
import tseslint from "typescript-eslint";

// The architecture's boundaries, as lint rules. A rule key set for a narrower
// group of files replaces the same key of a wider group, so the narrower
// groups repeat what they keep.

const noAppImports = {
  group: ["**/app/**"],
  message: "e2e-framework must not import from app.",
};
// Pages are driven through Playwright's own actions and assertions.
const noPageScripts = {
  selector:
    "CallExpression[callee.property.name=/^(evaluate|evaluateHandle|evaluateAll|\\$eval|\\$\\$eval|waitForFunction|addInitScript|addScriptTag|exposeFunction|exposeBinding)$/]",
  message: "No custom JavaScript in pages: drive them through Playwright APIs.",
};
const noFixedWaits = {
  selector: "CallExpression[callee.property.name='waitForTimeout']",
  message: "No fixed waits: use a web-first assertion.",
};
// Public async methods on page objects, components and the API adapter appear
// as steps in the report. The decorator requires a method declaration.
const stepOnPublicAsyncMethods = {
  selector: [
    "ClassBody > MethodDefinition[kind='method'][static=false][value.async=true]:not([accessibility='private']):not([key.type='PrivateIdentifier']):not(:has(> Decorator[expression.type='Identifier'][expression.name='step']))",
    "ClassBody > PropertyDefinition[static=false][value.async=true]:not([accessibility='private']):not([key.type='PrivateIdentifier'])",
  ].join(", "),
  message:
    "A public async method is a method that carries @step; a method that only its own class calls is private.",
};
// The API forwards the caller's token to the control plane for verification.
const noCryptographyImports = [
  {
    name: "crypto",
    message: "No cryptography in this project.",
  },
  {
    name: "node:crypto",
    message: "No cryptography in this project.",
  },
  {
    name: "jose",
    message: "No cryptography in this project: Fred verifies tokens.",
  },
];
const noCryptographyGlobal = {
  name: "crypto",
  message: "No cryptography in this project.",
};
const noLocators = {
  selector:
    "CallExpression[callee.property.name=/^(locator|frameLocator|getBy[A-Z][A-Za-z]*)$/]",
  message: "Locators live only in page objects and components.",
};

// A test file calls users, factories, flows and page objects through the
// fixtures of e2e-framework/fixtures/test.ts, and holds every test it runs
// as written: a test that fails is kept and fails, and tests are
// independent. A test list reads `›` and `>` as separators, so no title
// holds them.
const testFileImports = {
  regex: "^(?!(\\.\\./)+e2e-framework/fixtures/test\\.ts$)",
  message: "A test file imports only e2e-framework/fixtures/test.ts.",
};
const TEST_CALL =
  ":matches([callee.name='test'], [callee.object.name='test'][callee.property.name=/^(describe|step|fixme)$/])";
const testFileRules = [
  {
    selector:
      "ObjectPattern > Property[key.name=/^(page|context|browser|request|expect)$/]",
    message:
      "A test holds no page, context, browser, request or expect: it acts and checks through a user's page objects and flows.",
  },
  {
    selector: "MemberExpression[object.name='test'][property.name='expect']",
    message: "A test holds no expect: a page-object method makes the check.",
  },
  {
    selector: "MemberExpression[property.name='only']",
    message: "No .only: a run holds every test.",
  },
  {
    selector:
      "CallExpression[callee.object.name='test'][callee.property.name='fixme']:not([arguments.length=2][arguments.1.body.type='BlockStatement'][arguments.1.body.body.length=0], [arguments.length=3][arguments.1.type='ObjectExpression'][arguments.2.body.type='BlockStatement'][arguments.2.body.body.length=0])",
    message:
      "test.fixme is a planned test only: test.fixme(title, body) or test.fixme(title, details, body), its body the steps as comments.",
  },
  {
    selector:
      "MemberExpression[object.name='test'][property.name=/^(skip|fail)$/]",
    message:
      "No test.skip or test.fail: a test that fails is kept as written and fails.",
  },
  {
    selector:
      "MemberExpression[object.object.name='test'][object.property.name='describe'][property.name=/^(skip|fixme)$/]",
    message:
      "No test.describe.skip or test.describe.fixme: a test that fails is kept as written and fails.",
  },
  {
    selector:
      "MemberExpression[object.object.name='test'][object.property.name='describe'][property.name='serial']",
    message: "No test.describe.serial: tests are independent.",
  },
  {
    selector:
      "CallExpression[callee.property.name='configure'] Property[key.name='mode'][value.value='serial']",
    message: "No serial mode: tests are independent.",
  },
  {
    selector: `CallExpression${TEST_CALL} > Literal[value=/[›>]/]`,
    message: "No › or > in a title: a test list reads them as separators.",
  },
  {
    selector: `CallExpression${TEST_CALL} > TemplateLiteral > TemplateElement[value.raw=/[›>]/]`,
    message: "No › or > in a title: a test list reads them as separators.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "docker-out/**",
      "app/ui/dist/**",
      ".local/**",
      ".local-stack/**",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      "no-restricted-imports": ["error", { paths: noCryptographyImports }],
      "no-restricted-globals": ["error", noCryptographyGlobal],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          // node:test registers describe() and it() synchronously.
          allowForKnownSafeCalls: [
            { from: "package", name: ["describe", "it"], package: "node:test" },
          ],
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // The test files, with the shared restrictions repeated.
    files: ["tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [testFileImports],
          paths: noCryptographyImports,
        },
      ],
      "no-restricted-syntax": ["error", noLocators, ...testFileRules],
    },
  },
  {
    // The app may use the framework; the framework never depends on the app.
    // Outside page objects and components, nothing writes a locator.
    files: ["e2e-framework/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [noAppImports],
          paths: noCryptographyImports,
        },
      ],
      "no-restricted-syntax": [
        "error",
        noPageScripts,
        noFixedWaits,
        noLocators,
      ],
    },
  },
  {
    // Public promise-returning methods on the API adapter use the same step
    // decorator as page objects.
    files: ["e2e-framework/fred-api/**/*.ts"],
    rules: {
      "@typescript-eslint/promise-function-async": "error",
      "no-restricted-syntax": [
        "error",
        noPageScripts,
        noFixedWaits,
        noLocators,
        stepOnPublicAsyncMethods,
      ],
    },
  },
  {
    // Page objects and components are the only place for locators. A method
    // that returns a promise is declared async, and each public one carries
    // @step.
    files: ["e2e-framework/pages/**/*.ts", "e2e-framework/components/**/*.ts"],
    rules: {
      "@typescript-eslint/promise-function-async": "error",
      "no-restricted-syntax": [
        "error",
        noPageScripts,
        noFixedWaits,
        stepOnPublicAsyncMethods,
      ],
    },
  },
);
