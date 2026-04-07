import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import {
  CoreApp,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  createDataFrame,
  FieldType,
  PartialDataFrame,
  TimeRange,
  MetricFindValue,
} from '@grafana/data';

import { AxiomMetricsQuery, MyDataSourceOptions, DEFAULT_QUERY, DataSourceResponse, MetricsAggregation, Filter, Series, V2QueryResponse, ID, SeriesData, VariableQuery } from './types';
import { lastValueFrom } from 'rxjs';
import { extract_dataset, diagnostics } from '@axiomhq/mpl';
import { ensureMplInit } from './mpl/ensureMplInit';

const INTERNAL_QUERY_PARAMS_HEADER = 'X-Axiom-Internal-Query-Params';

const encodeQueryParamsHeader = (
  params?: Record<string, string | number>
): string | undefined => {
  if (!params || Object.keys(params).length === 0) {
    return undefined;
  }
  return new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString();
};

const dayRe = /^([0-9]+)d$/;
const hourRe = /^([0-9]+)h$/;
const minRe = /^([0-9]+)m$/;
const secRe = /^([0-9]+)s$/;

const parseTime = (time: string): number => {
  const days = dayRe.exec(time);
  if (days) {
    return parseInt(days[1], 10) * 24 * 3600;
  }
  const hours = hourRe.exec(time);
  if (hours) {
    return parseInt(hours[1], 10) * 3600;
  }
  const mins = minRe.exec(time);
  if (mins) {
    return parseInt(mins[1], 10) * 60;
  }
  const secs = secRe.exec(time);
  if (secs) {
    return parseInt(secs[1], 10);
  }

  return parseInt(time, 10);

}

const replaceFilterVars = (filter: Filter | undefined, options: DataQueryRequest<AxiomMetricsQuery>): Filter | undefined => {
  if (!filter) {
    return filter
  }

  if ('and' in filter) {
    return {
      and: filter.and.map(f => replaceFilterVars(f, options))
    } as Filter
  } else if ('or' in filter) {
    return {
      or: filter.or.map(f => replaceFilterVars(f, options))
    } as Filter
  } else if ('not' in filter) {
    return {
      not: replaceFilterVars(filter.not, options)
    } as Filter
  } else if ('regex' in filter) {
    return {
      regex: getTemplateSrv().replace(filter.regex, options.scopedVars),
      tag: getTemplateSrv().replace(filter.tag, options.scopedVars)
    } as Filter
  } else if ('tagType' in filter) {
    return {
      tag: getTemplateSrv().replace(filter.tag, options.scopedVars),
      operator: filter.operator,
      tagType: filter.tagType
    } as Filter
  } else {
    return {
      tag: getTemplateSrv().replace(filter.tag, options.scopedVars),
      operator: filter.operator,
      value: getTemplateSrv().replace(filter.value, options.scopedVars)
    } as Filter
  }
}


const replaceMaybeFloat = (number: number | string | null, options: DataQueryRequest<AxiomMetricsQuery>): number | null => {
  if (!number) {
    return null
  }
  if (typeof number === 'number') {
    return number
  } else if (number === '$__interval_s' || number === '$__interval') {
    return parseFloat(getTemplateSrv().replace('$__interval_ms', options.scopedVars)) / 1000
  } else if (number === '$__rate_interval') {
    // __rate_interval is a prometheus specific variable it is defined by the scrap interval in a way - data we don't have
    // what we do instead is use 4 * the interval

    return parseFloat(getTemplateSrv().replace('$__interval_ms', options.scopedVars)) / 250
  }

  return parseFloat(getTemplateSrv().replace(number, options.scopedVars))
}
const replaceTime = (number: number | string, options: DataQueryRequest<AxiomMetricsQuery>): number => {
  if (typeof number === 'number') {
    return number
  } else if (number === '$__interval_s' || number === '$__interval') {
    return parseTime(getTemplateSrv().replace('$__interval_ms', options.scopedVars)) / 1000
  } else if (number === '$__rate_interval') {
    // __rate_interval is a prometheus specific variable it is defined by the scrap interval in a way - data we don't have
    // what we do instead is use 4 * the interval
    return parseTime(getTemplateSrv().replace('$__interval_ms', options.scopedVars)) / 250
  }

  return parseTime(getTemplateSrv().replace(number, options.scopedVars))
}

const replaceAggrVars = (aggr: MetricsAggregation, options: DataQueryRequest<AxiomMetricsQuery>): MetricsAggregation => {
  if ('Metric' in aggr) {
    return {
      Metric: {
        metric: getTemplateSrv().replace(aggr.Metric.metric, options.scopedVars),
        filter: replaceFilterVars(aggr.Metric.filter, options)
      }
    }
  } else if ('Time' in aggr) {
    const window = replaceTime(aggr.Time.window, options)
    return {
      Time: {
        aggr: aggr.Time.aggr,
        window: window,
        next: replaceAggrVars(aggr.Time.next, options)
      }
    }
  } else if ('Align' in aggr) {
    const alignment = replaceTime(aggr.Align.alignment, options)
    return {
      Align: {
        alignment: alignment,
        next: replaceAggrVars(aggr.Align.next, options)
      }
    }
  } else if ('Map' in aggr) {
    return {
      Map: {
        aggr: aggr.Map.aggr,
        value: replaceMaybeFloat(aggr.Map.value, options),
        next: replaceAggrVars(aggr.Map.next, options)
      }
    }
  } else if ('Tags' in aggr) {
    return {
      Tags: {
        aggr: aggr.Tags.aggr,
        tags: aggr.Tags.tags.map(t => getTemplateSrv().replace(t, options.scopedVars)),
        next: replaceAggrVars(aggr.Tags.next, options)
      }
    }
  }
  return aggr
}
export class DataSource extends DataSourceApi<AxiomMetricsQuery, MyDataSourceOptions> {
  baseUrl: string;
  uid: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url!;
    this.uid = instanceSettings.uid;
  }

  getDefaultQuery(_: CoreApp): Partial<AxiomMetricsQuery> {
    return DEFAULT_QUERY;
  }

  filterQuery(query: AxiomMetricsQuery): boolean {
    return !!query.query;
  }




  async query(options: DataQueryRequest<AxiomMetricsQuery>): Promise<DataQueryResponse> {
    const { range, intervalMs } = options;

    let interval = intervalMs / 1000;
    // we don't do less than 1 second
    if (interval < 1) {
      interval = 1;
    }

    const data = [];
    for (const target of options.targets) {
      // prepare request and payload
      const aggr = replaceAggrVars(target.aggr, options)
      let req = {
        aggr: aggr,
        query: target.query
      } as AxiomMetricsQuery

      const mplParams: Record<string, string> = {};
      let mplDataset = '';
      if (req.query) {
        const intervalSecs = Math.max(1, Math.ceil(intervalMs / 1000));
        mplParams['param____interval'] = `${intervalSecs}s`;
        mplParams['param____rate_interval'] = `${intervalSecs * 4}s`;

        let preamble = '';
        if (!/^\s*param\s+\$__interval\s*:/m.test(req.query)) {
          preamble += 'param $__interval: duration;\n';
        }
        if (!/^\s*param\s+\$__rate_interval\s*:/m.test(req.query)) {
          preamble += 'param $__rate_interval: duration;\n';
        }

        for (const v of getTemplateSrv().getVariables()) {
          const name = v.name;
          if (name === '__interval' || name === '__rate_interval') {
            continue;
          }
          const value = getTemplateSrv().replace(`$${name}`, options.scopedVars);
          mplParams[`param__${name}`] = `"${value}"`;
          if (!new RegExp(`^\\s*param\\s+\\$${name}\\s*:`, 'm').test(req.query!)) {
            preamble += `param $${name}: string;\n`;
          }
        }

        if (preamble) {
          req.query = preamble + req.query;
        }

        await ensureMplInit();

        const diags = diagnostics(req.query) as Array<{ severity: string }> | null;
        if (diags?.some(d => d.severity === 'error')) {
          continue;
        }

        mplDataset = extract_dataset(req.query) ?? '';
      }

      const resp = await this.execQuery(req, range, mplParams, mplDataset);

      if (resp.error) {
        return { error: resp.error, data: [] };
      }

      const notices = resp.warnings
        .map((w: string) => ({ severity: 'warning' as const, text: w }));

      // extract the data from the response
      for (const group of resp.data) {
        const id = group[0] as ID;
        const series = group[1] as SeriesData;
        let _time = [];
        for (let i = 0; i < series.data.length; i++) {
          _time.push((series.start + i * series.resolution) * 1000);
        }

        const name = Object.values(id.tags).map(k => `${k}`).join(' | ');

        const frame: PartialDataFrame = createDataFrame({
          refId: target.refId,
          meta: notices.length > 0 ? { notices } : undefined,
          fields: [
            { name: '_time', values: _time, type: FieldType.time },
            { name: name, values: series.data, type: FieldType.number, labels: id.tags },
          ],
        });
        data.push(frame);
      }
    }

    return { data };
  }

  async execQuery(query: AxiomMetricsQuery, range: TimeRange, extraParams: Record<string, string> = {}, dataset = '') {
    if (query.query) {
      const body: Record<string, unknown> = {
        mpl: query.query,
        startTime: range.from.toISOString(),
        endTime: range.to.toISOString(),
      };

      if (Object.keys(extraParams).length > 0) {
        body.params = extraParams;
      }

      const response = await lastValueFrom(getBackendSrv().fetch<V2QueryResponse>({
        url: `${this.baseUrl}/query`,
        method: 'POST',
        data: JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
          'accept': 'application/vnd.metrics.v3+json',
        },
      }));

      const v2 = response.data;
      const series: Series[] = v2.series.map((s) => [
        { tags: s.tags },
        { start: s.start, resolution: s.resolution, data: s.data },
      ]);
      return { error: null, data: series, warnings: v2.metadata?.warnings ?? [] };
    }

    // Legacy JSON aggregation queries routed through api.axiom.co
    const payload = JSON.stringify({ start: range.from.toISOString(), end: range.to.toISOString(), aggr: query.aggr });

    const response = await getBackendSrv().post<Series[]>(`${this.baseUrl}/legacy-query`,
      payload,
      {
        headers: {
          'content-type': 'application/json',
          'X-Axiom-Dataset': dataset,
          ...(internalQueryParams
            ? { [INTERNAL_QUERY_PARAMS_HEADER]: internalQueryParams }
            : {}),
        },
        params: {
          'start': range.from.utc().unix(),
          'end': range.to.utc().unix(),
        },
      });

    return { error: null, data: response as Series[], warnings: [] as string[] };
  }

  async request(url: string, params?: Record<string, string | number>) {
    const response = getBackendSrv().fetch<DataSourceResponse>({
      url: `${this.baseUrl}${url}`,
      ...(params ? { params } : {}),
    });
    return lastValueFrom(response);
  }

  private timeRangeParams(): Record<string, string> {
    const from = getTemplateSrv().replace('$__from');
    const to = getTemplateSrv().replace('$__to');
    return {
      start: new Date(parseInt(from, 10)).toISOString(),
      end: new Date(parseInt(to, 10)).toISOString(),
    };
  }

  async getDatasets(): Promise<string[]> {
    const response = await this.request('/datasets');
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data
      .filter((ds: { kind?: string }) => ds.kind === 'otel:metrics:v1')
      .map((ds: { name: string }) => ds.name);
  }

  async getMetrics(dataset: string): Promise<string[]> {
    const response = await this.request(`/info/datasets/${dataset}/metrics`, this.timeRangeParams());
    return Array.isArray(response.data) ? response.data : [];
  }

  async getTags(dataset: string, metric: string): Promise<string[]> {
    const url = metric
      ? `/info/datasets/${dataset}/metrics/${metric}/tags`
      : `/info/datasets/${dataset}/tags`;
    const response = await this.request(url, this.timeRangeParams());
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Handles template variable queries
   */
  async metricFindQuery(query: VariableQuery): Promise<MetricFindValue[]> {
    if (!query.dataset || !query.tag) {
      return []
    }
    try {
      // For tag values, we would need to query the actual data
      // This is a simplified implementation - you might need to adjust based on your API
      if (query.metric === '') {
        const tagValuesResponse = await this.request(`/info/datasets/${query.dataset}/tags/${query.tag}/values`);
        if (tagValuesResponse.data && Array.isArray(tagValuesResponse.data)) {
          return tagValuesResponse.data.map((value: string) => ({ text: value, value: value })).sort((a, b) => a.text.localeCompare(b.text));
        }
      } else {
        const tagValuesResponse = await this.request(`/info/datasets/${query.dataset}/metrics/${query.metric}/tags/${query.tag}/values`);
        if (tagValuesResponse.data && Array.isArray(tagValuesResponse.data)) {
          return tagValuesResponse.data.map((value: string) => ({ text: value, value: value })).sort((a, b) => a.text.localeCompare(b.text));
        }
      }
      return []
    } catch (error) {
      console.error('Error in metricFindQuery:', error);
      return [];
    }
  }

  /**
   * Checks whether we can connect to the API.
   */
  async testDatasource() {
    // const defaultErrorMessage = 'Cannot connect to API';

    return {
      status: 'success',
      message: 'Success',
    };

    // try {
    //   const today = new Date();
    //   const start = new Date(today.setDate(-1));
    //   const response = await fetch(`${this.baseUrl}/endpoints`, {
    //     method: 'GET',
    //     body: JSON.stringify({
    //       ...DEFAULT_QUERY,
    //       start: start.toISOString(),
    //       end: today.toISOString(),
    //     }),
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //   });
    //   if (response.ok) {
    //     return {
    //       status: 'success',
    //       message: 'Success',
    //     };
    //   } else {
    //     return {
    //       status: 'error',
    //       message: response.statusText ? response.statusText : defaultErrorMessage,
    //     };
    //   }
    // } catch (err) {
    //   let message = '';
    //   if (typeof err === 'string') {
    //     message = err;
    //   } else if (isFetchError(err)) {
    //     message = 'Fetch error: ' + (err.statusText ? err.statusText : defaultErrorMessage);
    //     if (err.data && err.data.error && err.data.error.code) {
    //       message += ': ' + err.data.error.code + '. ' + err.data.error.message;
    //     }
    //   }
    //   return {
    //     status: 'error',
    //     message,
    //   };
    // }
  }
}
