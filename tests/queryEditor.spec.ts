import { test, expect } from '@grafana/plugin-e2e';

test('query editor should render the CodeMirror MPL editor', async ({
  panelEditPage,
  readProvisionedDataSource,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);

  // The query editor renders a CodeMirror instance inside the query row.
  // Verify that the editor container is visible.
  const queryRow = panelEditPage.getQueryEditorRow('A');
  await expect(queryRow.locator('.cm-editor')).toBeVisible();
});
