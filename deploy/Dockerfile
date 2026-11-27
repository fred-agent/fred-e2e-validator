# The service, the support code, the tests and the run page in one image, on
# Playwright's own image, whose browsers match the pinned @playwright/test.
# Use the repository root as the build context.
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe

# Build the embedded run page with its development dependencies.
FROM ${PLAYWRIGHT_IMAGE} AS page
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY app ./app
COPY e2e-framework ./e2e-framework
RUN npm run build:ui

# The runtime: the tests are listed here, so a test file that does not load
# fails the build and is named. tar and gzip, which pack the reports, are
# part of the image's base system.
FROM ${PLAYWRIGHT_IMAGE}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN npx playwright install msedge && chown pwuser /app
COPY playwright.config.ts tsconfig.json env-config.json sign-in.json ./
COPY e2e-framework ./e2e-framework
COPY test-data ./test-data
COPY tests ./tests
COPY app/app-id.ts ./app/app-id.ts
COPY app/service ./app/service
COPY --from=page /build/app/ui/dist ./app/ui/dist
RUN npx playwright test --list --reporter=list
USER pwuser
EXPOSE 8080
CMD ["node", "app/service/main.ts"]
