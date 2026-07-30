FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY fixtures ./fixtures
COPY apps ./apps
COPY tsconfig.base.json ./

RUN npm install --ignore-scripts && npm run build -w @khyfee/deflake-core && npm run build -w @khyfee/deflake-reporters && npm run build -w @khyfee/deflake \
  && cd fixtures/flaky-suite && npm install && npx playwright install --with-deps chromium

ENV PYTHONPATH=/app/packages/triager
WORKDIR /app
ENTRYPOINT ["node", "packages/cli/dist/cli.js"]
CMD ["demo", "--attempts", "10"]
