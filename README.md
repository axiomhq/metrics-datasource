# Axiom Metrics Datasource

A Grafana datasource plugin for querying metrics from [Axiom](https://axiom.co).

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   npm run dev
   ```

3. Build plugin in production mode

   ```bash
   npm run build
   ```

4. Run the tests (using Jest)

   ```bash
   # Runs the tests and watches for changes
   npm run test

   # Exits after running all the tests
   npm run test:ci
   ```

5. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   npm run server
   ```

6. Run the E2E tests (using Playwright)

   ```bash
   npm run e2e
   ```

7. Run the linter

   ```bash
   npm run lint

   # or

   npm run lint:fix
   ```

## Releasing

To trigger a release, push a version tag:

1. Run `npm version <major|minor|patch>`
2. Run `git push origin main --follow-tags`

The [release workflow](./.github/workflows/release.yml) will build, sign, and publish a GitHub release automatically.

## Learn more

- [Axiom documentation](https://axiom.co/docs)
- [`plugin.json` documentation](https://grafana.com/developers/plugin-tools/reference/plugin-json)
- [How to sign a plugin?](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)

## License

Apache-2.0
