import { InlineField, MultiSelect, Select } from '@grafana/ui';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { TagsField, WindowField } from './FormFields';


export const BucketField = ({
  name,
}: {
  name: string;
}) => {
  const specs = ['Min', 'Max', 'Avg', 'Sum', 'Count', '0.99', '0.95', '0.90', '0.50'];
  const { control } = useFormContext();


  const Input = ({ field }: { field: any }) =>
    (
      <MultiSelect
        {...field}
        onChange={(tags: Array<{ label: string; value: string }>) => field.onChange(tags.map((t) => t.value))}
        width={32}
        placeholder="Buckets"
        allowCreateWhileLoading
        allowCustomValue
        backspaceRemovesValue
        options={specs.map((t) => ({ label: t, value: t }))}
      />
    );

  return (
    <InlineField>
      <Controller name={name} control={control} render={({ field }) => <Input field={field} />} />
    </InlineField>
  );
};


export function BucketForm({ index, datasourceUid }: { index: number; datasourceUid: string }) {
  const { control } = useFormContext();
  const opts = ['Histogram','InterpolateHistogram'];

  return (
    <>
      <InlineField label="aggr">
        <Controller
          name={`aggr.${index}.aggr` as const}
          control={control}
          defaultValue={opts[0]}
          render={({ field }) => (
            <Select
              {...field}
              width={14}
              onChange={(opt) => field.onChange(opt.value)}
              options={opts.map((opt) => ({ label: opt, value: opt }))}
              required
            />
          )}
        />
      </InlineField>
      <WindowField name={`aggr.${index}.window` as const} />
      <BucketField name={`aggr.${index}.spec` as const} />
      {/* <InlineField label="op">
          <Controller
            name={`aggr.${index}.spec.1.key` as const}
            defaultValue={selectedAgg ? Object.keys(selectedAgg)[0] : {}}
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                width={12}
                onChange={(opt) => field.onChange({ [opt.value]: 0 })}
                options={specOpOpts.map((opt) => ({ label: opt, value: opt }))}
                required
              />
            )}
          />
        </InlineField>
        <InlineField label="value">
          <Controller
            name={`aggr.${index}.spec.1` as const}
            defaultValue={selectedAgg ? Object.values(selectedAgg)[0] : {}}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                width={12}
                onChange={(e) => {
                  const key = Object.keys(selectedAgg)[0];
                  field.onChange({ [key]: parseInt(e.currentTarget.value, 10) });
                }}
              />
            )}
          />
        </InlineField> */}
      <TagsField name={`aggr.${index}.tags` as const} datasourceUid={datasourceUid} multiSelect={true} />
    </>
  );
}
