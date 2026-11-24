# Run `make code-quality` before every commit.

DETECT_SECRETS := uvx --quiet --from detect-secrets==1.5.0
DETECT_SECRET_BASELINE_FILE := .secrets.baseline
DETECT_SECRET_EXCLUDE_FILES := (^|/)package-lock\.json$$

# OpenSpec runs without telemetry and without its update check.
OPENSPEC := env OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 openspec

# The local cluster stores test accounts in the selected instance's namespace.
IMAGE := fred-e2e-tests:local
K3D_CONTEXT := k3d-fred
ACCOUNTS_SECRET := fred-e2e-tests-accounts
# The accounts Secret, with the accounts as the tests read them from .env.
ACCOUNTS_MANIFEST := node --input-type=module -e 'import { isAccountVariable } from "./e2e-framework/config/accounts.ts"; import { loadDotEnv } from "./e2e-framework/config/environment.ts"; loadDotEnv(); const accounts = Object.entries(process.env).filter(([key]) => isAccountVariable(key)); if (accounts.length === 0) process.exit(1); const data = Object.fromEntries(accounts.map(([key, value]) => [key, Buffer.from(value).toString("base64")])); console.log(JSON.stringify({ apiVersion: "v1", kind: "Secret", metadata: { name: process.argv[1] }, type: "Opaque", data }))' "$(ACCOUNTS_SECRET)"

.PHONY: help
help: ## Show the available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-18s %s\n", $$1, $$2}'

.PHONY: install
install: ## Install the locked dependencies without running install scripts
	npm ci --ignore-scripts

.PHONY: type-check
type-check: ## Type-check the sources and the page with tsc (no files emitted)
	npx tsc --noEmit
	npx tsc --noEmit -p app/ui

.PHONY: format-check
format-check: ## Check formatting with prettier (writes nothing)
	npx prettier --check .

.PHONY: format-fix
format-fix: ## Reformat in place with prettier
	npx prettier --write .

.PHONY: lint
lint: ## Lint with ESLint, including the architecture's boundary rules
	npx eslint --max-warnings=0 .

.PHONY: detect-secret
detect-secret: ## Scan tracked and new files for secrets with detect-secrets
	@# Materialize the file list so a Git failure cannot become a successful empty scan.
	@files=$$(mktemp) && trap 'rm -f "$$files"' EXIT && \
		git ls-files -z --cached --others --exclude-standard > "$$files" && \
		xargs -0 $(DETECT_SECRETS) detect-secrets-hook \
		--baseline "$(DETECT_SECRET_BASELINE_FILE)" \
		--exclude-files '$(DETECT_SECRET_EXCLUDE_FILES)' < "$$files"

.PHONY: deps-check
deps-check: ## Check that package.json pins @playwright/test to an exact version
	@grep -qE '"@playwright/test": "[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?"' package.json || { echo 'package.json: pin @playwright/test to an exact version, such as 1.2.3' >&2; exit 1; }

.PHONY: code-quality
code-quality: type-check format-check lint detect-secret deps-check ## Run all checks: the gate to pass before committing
	@found=$$(find e2e-framework -name '*.test.ts'); test -z "$$found" || { echo "Unit tests belong to app/service/ only; e2e-framework/ holds $$found" >&2; exit 1; }
	@test "$$(git show :env-config.json | grep -oE '"fredBaseUrl": *"[^"]*"')" = '"fredBaseUrl": "http://localhost:8080"' || { echo 'The staged env-config.json must hold http://localhost:8080 as fredBaseUrl; the address of your own Fred stays in the working copy' >&2; exit 1; }
	@echo "All code quality checks completed"

.PHONY: test-unit
test-unit: ## Run the unit tests for the run page's service
	node --test 'app/**/*.test.ts'

.PHONY: ui
ui: ## Build the embedded run page with Vite
	npm run build:ui

.PHONY: image
image: ## Build the image of the service, the tests and the run page
	docker build --file deploy/Dockerfile --tag $(IMAGE) .

.PHONY: k3d-accounts
k3d-accounts: SHELL := /bin/bash
k3d-accounts: ## Provision the test accounts for the selected instance
	@test -n "$$FRED" || { echo 'Select a deployment instance.' >&2; exit 2; }
	@$(ACCOUNTS_MANIFEST) >/dev/null 2>&1 || { echo 'Account configuration is missing or has an unsupported setting.' >&2; exit 2; }
	@set -o pipefail; { $(ACCOUNTS_MANIFEST) \
		| kubectl --context "$(K3D_CONTEXT)" -n "fred-$$FRED" apply -f -; } >/dev/null 2>&1 \
		|| { echo 'Account setup failed.' >&2; exit 1; }
	@echo 'Account setup completed.'

.PHONY: browsers
browsers: ## Install the browser env-config.json names (downloads it)
	browser=$$(node --input-type=module -e 'import { readEnvConfig } from "./e2e-framework/config/settings.ts"; process.stdout.write(readEnvConfig().browser)') && npx playwright install "$$browser"

.PHONY: test
test: ## Run tests against the configured environment with Playwright arguments from TESTS
	npx playwright test $(TESTS)

.PHONY: report
report: ## Open the last HTML report
	npx playwright show-report

.PHONY: spec-check
spec-check: ## Validate every OpenSpec change and spec, strictly
	$(OPENSPEC) validate --all --strict --no-interactive

.PHONY: audit
audit: ## Check runtime dependencies for known vulnerabilities (requires network access)
	npm audit --omit=dev
