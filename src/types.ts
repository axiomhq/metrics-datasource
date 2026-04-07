import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export type MetricsAggregation = AxiomMetricsQueryRequestTime
  | AxiomMetricsQueryRequestAlign
  | AxiomMetricsQueryRequestTags
  | AxiomMetricsQueryRequestMetric
  | AxiomMetricsQueryRequestMap
  | AxiomMetricsQueryRequestBucket;

export interface AxiomMetricsQueryRequestMetric {
  Metric: {
    metric: string;
    filter?: Filter;
  }
}

export interface AxiomMetricsQueryRequestTime {
  Time: {
    aggr: string;
    window: number|string;
    next: MetricsAggregation
  }
}

export interface AxiomMetricsQueryRequestAlign {
  Align: {
    alignment: number|string;
    next: MetricsAggregation
  }
}

export interface AxiomMetricsQueryRequestMap {
  Map: {
    aggr: string;
    value: number | string | null;
    next: MetricsAggregation
  }
}

export interface AxiomMetricsQueryRequestTags {
  Tags: {
    aggr: string;
    tags: string[];
    next: MetricsAggregation
  }
}

export interface AxiomMetricsQueryRequestBucket {
  Bucket: {
    aggr: 'Histogram' | 'InterpolateHistogram';
    window: number;
    tags: string[];
    spec: BucketSpec[];
    next: MetricsAggregation
  }
}

export type BucketSpec = 'Min'|'Max'|'Avg'|'Sum'| 'Count'| { 'Percentile': number };

export interface AxiomMetricsQuery extends DataQuery {
  dataset: string;
  aggr: MetricsAggregation;
  query?: string;
}

export type Filter = { and: Filter[] } | { or: Filter[] }  | { not: Filter } | {regex: string, tag: string} | FilterComparison | FilterIs;

export type FilterComparison = {
  tag: string;
  operator: string;
  value: string;
}

export type FilterIs = {
  tag: string;
  operator: 'is';
  tagType: 'string' | 'int' | 'float' | 'bool';
}

export const DEFAULT_QUERY: Partial<AxiomMetricsQuery> = {
  dataset: '',
  aggr: {
    Time: {
      aggr: 'Avg',
      window: 60,
      next: {
        Metric: {
          metric: '',
        }
      }
    }
  }
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  url: string;
  apiUrl?: string;
  orgId?: string;
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}

export type ID = {
  tags: {
      [key: string]: string;
  };
}

export type SeriesData = {
  resolution: number;
  start: number;
  data: Array<number|null>
}

export type Series = Array<ID | SeriesData>

export interface V2Series {
  metric: string;
  tags: Record<string, string>;
  start: number;
  resolution: number;
  data: Array<number | null>;
  summary?: number | null;
}

export interface V2QueryResponse {
  metadata: {
    group_keys?: string[];
    warnings?: string[];
  };
  series: V2Series[];
}

export interface VariableQuery {
  dataset: string;
  metric: string;
  tag?: string;
}

export const DEFAULT_VARIABLE_QUERY: VariableQuery = {
  dataset: '',
  metric: '',
};
