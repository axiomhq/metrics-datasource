import React, { useEffect, useRef } from 'react';
import {
  Field,
} from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, AxiomMetricsQuery } from '../types';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import { MplQueryCodeMirror } from './MplQueryCodeMirror';
import { diagnostics } from '@axiomhq/mpl';

type Props = QueryEditorProps<DataSource, AxiomMetricsQuery, MyDataSourceOptions>;

interface QueryFormValues {
  query: string;
}

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const isFirstRender = React.useRef(true);
  const { key, refId, datasource: ds } = query;

  const onChangeRef = useRef(onChange);
  const onRunQueryRef = useRef(onRunQuery);
  onChangeRef.current = onChange;
  onRunQueryRef.current = onRunQuery;

  const methods = useForm<QueryFormValues>({
    defaultValues: {
      query: query.query ?? '',
    },
  });

  const { control } = methods;

  const values = useWatch({ control });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      onChangeRef.current({
        refId,
        key,
        datasource: ds,
        query: values.query ?? '',
      });
      try {
        const diags = diagnostics(values.query ?? '') as Array<{ severity: string }> | null;
        if (diags?.some(d => d.severity === 'error')) {
          return;
        }
      } catch {
        // WASM not yet initialized — fail open
      }
      onRunQueryRef.current();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [values, ds, key, refId]);

  return (
    <FormProvider {...methods}>
      <form>
        <Field label="Query" style={{ marginLeft: 6 }}>
          <Controller
            name={`query`}
            control={control}
            render={({ field }) => (
              <MplQueryCodeMirror
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                onRunQuery={onRunQuery}
                datasource={datasource}
              />
            )}
          />
        </Field>
      </form>
    </FormProvider>
  );
}
