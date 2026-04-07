import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface AxiomMetricsQuery extends DataQuery {
  query?: string;
}

export const DEFAULT_QUERY: Partial<AxiomMetricsQuery> = {};

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

export interface DataPoint {
  Time: number;
  Value: number;
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
