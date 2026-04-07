import { test, expect } from '@grafana/plugin-e2e';

test('"Save & test" should be successful when configuration is valid', async ({
  createDataSourceConfigPage,
  readProvisionedDataSource,
  selectors,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  // Our plugin is frontend-only: testDatasource() returns success without
  // hitting any backend health endpoint. The library's saveAndTest() waits
  // for a health-check HTTP response that never comes, so we click the
  // Save & Test button directly using the versioned e2e selector (which
  // resolves correctly across Grafana versions) and assert the success alert.
  await configPage.getByGrafanaSelector(selectors.pages.DataSource.saveAndTest).click();
  await expect(configPage).toHaveAlert('success');
});
