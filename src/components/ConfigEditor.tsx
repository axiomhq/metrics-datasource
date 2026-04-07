import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

import { FieldSet, InlineField, Input, SecretInput } from '@grafana/ui';

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonData, secureJsonFields } = options;

  const onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,

      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  const onURLChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        url: event.target.value,
      },
    });
  };

  const onAPIURLChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        apiUrl: event.target.value,
      },
    });
  };

  const onOrgIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        orgId: event.target.value,
      },
    });
  };

  const onAPIKeyReset = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  };

  return (
    <FieldSet label="Configure credentials">
      <InlineField label="Edge URL" labelWidth={14} tooltip="Axiom edge deployment URL for queries">
        <Input
          required
          name="url"
          defaultValue={'https://us-east-1.aws.edge.axiom.co'}
          value={jsonData.url}
          onChange={onURLChange}
          width={40}
        />
      </InlineField>

      <InlineField label="API URL" labelWidth={14} tooltip="Axiom central API URL for dataset listing">
        <Input
          name="apiUrl"
          defaultValue={'https://api.axiom.co'}
          value={jsonData.apiUrl || 'https://api.axiom.co'}
          onChange={onAPIURLChange}
          width={40}
        />
      </InlineField>

      <InlineField label="Org ID" labelWidth={14} tooltip="Axiom organization ID">
        <Input
          required
          name="orgId"
          placeholder={'Enter your org ID'}
          value={jsonData.orgId}
          onChange={onOrgIdChange}
          width={40}
        />
      </InlineField>

      <InlineField label="API Key" labelWidth={14}>
        <SecretInput
          required
          name="config-editor-api-key"
          type="password"
          placeholder={'Enter your API key'}
          value={secureJsonData?.apiKey}
          onChange={onAPIKeyChange}
          onReset={onAPIKeyReset}
          isConfigured={secureJsonFields.apiKey}
          width={40}
        />
      </InlineField>
    </FieldSet>
  );
}
