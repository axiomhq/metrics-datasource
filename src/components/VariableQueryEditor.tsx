import React, { useState, useEffect, useCallback } from 'react';
import { InlineField, Select, Input, Spinner } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { VariableQuery } from '../types';
import { useDebounce } from '../utils/debounce';

interface VariableQueryEditorProps {
  query: VariableQuery;
  onChange: (query: VariableQuery) => void;
  datasource: DataSource;
}

export function VariableQueryEditor({ query, onChange, datasource }: VariableQueryEditorProps) {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    try {
      setIsMetricsLoading(true);
      const metrics = await datasource.getMetrics(query.dataset);
      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics([]);
    } finally {
      setIsMetricsLoading(false);
    }
  }, [query.dataset, datasource]);

  const loadTags = useCallback(async () => {
    try {
      setIsTagsLoading(true);
      const tags = await datasource.getTags(query.dataset, query.metric);
      setTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
      setTags([]);
    } finally {
      setIsTagsLoading(false);
    }
  }, [query.dataset, query.metric, datasource]);

  const debouncedLoadMetrics = useDebounce(loadMetrics, 300);
  const debouncedLoadTags = useDebounce(loadTags, 300);

  // Load metrics when dataset changes
  useEffect(() => {
    if (query.dataset) {
      debouncedLoadMetrics();
    } else {
      setMetrics([]);
    }
  }, [query.dataset, debouncedLoadMetrics]);

  // Load tags when dataset or metric change
  useEffect(() => {
    if (query.dataset) {
      debouncedLoadTags();
    } else {
      setTags([]);
    }
  }, [query.dataset, query.metric, debouncedLoadTags]);

  const onDatasetChange = (value: string) => {
    onChange({
      ...query,
      dataset: value || '',
      // Reset dependent fields
      metric: '',
      tag: undefined,
    });
  };

  const onMetricChange = (event: SelectableValue<string>) => {
    onChange({
      ...query,
      metric: event ? event.value ?? '' : '',
      // Reset dependent fields
      tag: '',
    });
  };

  const onTagChange = (event: SelectableValue<string>) => {
    onChange({
      ...query,
      tag: event ? event.value : '',
    });
  };

  return (
    <>
      <InlineField label="Dataset" labelWidth={12}>
        <Input
          id="variables-editor-dataset"
          name="dataset"
          value={query.dataset}
          onChange={(event) => onDatasetChange(event.currentTarget.value)}
          placeholder="Enter dataset name"
          width={40}
        />
      </InlineField>

      <InlineField label="Metric" labelWidth={12} tooltip={'optional'}>
        <Select
          id="variables-editor-metric"
          name="metric"
          options={metrics.map((metric) => ({ label: metric, value: metric }))}
          value={query.metric}
          onChange={onMetricChange}
          placeholder="Select metric"
          width={40}
          allowCustomValue
          disabled={!query.dataset}
          isClearable={true}
          prefix={isMetricsLoading ? <Spinner /> : ''}
        />
      </InlineField>

      <InlineField label="Tag" labelWidth={12}>
        <Select
          id="variables-editor-tag"
          name="tag"
          options={tags.map((tag) => ({ label: tag, value: tag }))}
          value={query.tag}
          onChange={(value) => onTagChange(value)}
          placeholder="Select tag"
          width={40}
          allowCustomValue
          disabled={!query.dataset}
          isSearchable={true}
          isClearable={true}
          prefix={isTagsLoading ? <Spinner /> : ''}
        />
      </InlineField>
    </>
  );
}
