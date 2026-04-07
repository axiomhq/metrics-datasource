import { getBackendSrv } from '@grafana/runtime';
import { InlineField, Input, MultiSelect, Select } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { lastValueFrom } from 'rxjs';

export const WindowField = ({ name }: { name: string }) => {
  const { control } = useFormContext();

  return (
    <InlineField label="window">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            width={8}
            onChange={(e) => field.onChange(e.currentTarget.value)}
            placeholder="window"
          />
        )}
      />
    </InlineField>
  );
};

export const TagsField = ({
  name,
  datasourceUid,
  multiSelect,
}: {
  name: string;
  datasourceUid: string;
  multiSelect?: boolean;
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { control } = useFormContext();
  const dataset = useWatch({ name: 'dataset' as const, control });
  const metric = useWatch({ name: 'metric' as const, control });

  useEffect(() => {
    // reload available tags when the dataset or metric changes
    const getMetricTags = async (metric: string) => {
      const dataProxyUrl = `/api/datasources/proxy/uid/${datasourceUid}/info`;

      const response = getBackendSrv().fetch<string[]>({
        url: `${dataProxyUrl}/datasets/${dataset}/metrics/${metric}/tags`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await lastValueFrom(response);
      let suggestionsData: string[] = responseData.data.sort((a, b) => a.localeCompare(b));
      return suggestionsData;
    };

    if (!metric) {
      setAvailableTags([]);
    }

    getMetricTags(metric).then((tags) => setAvailableTags(tags));
  }, [dataset, datasourceUid, metric]);

  const Input = ({ field }: { field: any }) =>
    multiSelect ? (
      <MultiSelect
        {...field}
        onChange={(tags: Array<{ label: string; value: string }>) => field.onChange(tags.map((t) => t.value))}
        width={32}
        placeholder="Tags"
        allowCreateWhileLoading
        allowCustomValue
        backspaceRemovesValue
        options={availableTags.map((t) => ({ label: t, value: t }))}
      />
    ) : (
      <Select
        {...field}
        onChange={(tag: { label: string; value: string }) => field.onChange(tag.value)}
        width={32}
        placeholder="select tag..."
        allowCreateWhileLoading
        allowCustomValue
        backspaceRemovesValue
        options={availableTags.map((t) => ({ label: t, value: t }))}
      />
    );

  return (
    <InlineField>
      <Controller name={name} control={control} render={({ field }) => <Input field={field} />} />
    </InlineField>
  );
};
