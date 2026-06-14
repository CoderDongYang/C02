import type { DAGNode } from './dagEngine';

type UpstreamOutputs = Record<string, unknown>;

export async function executeNode(
  node: DAGNode,
  upstreamOutputs: UpstreamOutputs
): Promise<unknown> {
  switch (node.type) {
    case 'source':
      return executeSourceNode(node);
    case 'transform':
      return executeTransformNode(node, upstreamOutputs);
    case 'filter':
      return executeFilterNode(node, upstreamOutputs);
    case 'sink':
      return executeSinkNode(node, upstreamOutputs);
    default:
      return executeGenericNode(node, upstreamOutputs);
  }
}

async function executeSourceNode(node: DAGNode): Promise<unknown> {
  const data = node.data;
  const sourceType = data.sourceType as string || 'sample';

  switch (sourceType) {
    case 'sample':
      return generateSampleData(data);
    case 'csv':
      return parseCsvData(data);
    case 'api':
      return fetchApiData(data);
    default:
      return generateSampleData(data);
  }
}

function generateSampleData(data: Record<string, unknown>): unknown {
  const count = (data.count as number) || 10;
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push({
      id: i + 1,
      name: `Record_${i + 1}`,
      value: Math.round(Math.random() * 1000),
      timestamp: new Date().toISOString(),
    });
  }
  return { records, count: records.length };
}

function parseCsvData(data: Record<string, unknown>): unknown {
  const raw = (data.csvContent as string) || '';
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return { records: [], count: 0 };

  const headers = lines[0].split(',').map((h) => h.trim());
  const records = lines.slice(1).map((line, idx) => {
    const values = line.split(',').map((v) => v.trim());
    const record: Record<string, unknown> = { _rowIndex: idx };
    headers.forEach((header, i) => {
      const num = Number(values[i]);
      record[header] = isNaN(num) || values[i] === '' ? values[i] : num;
    });
    return record;
  });

  return { records, count: records.length };
}

async function fetchApiData(data: Record<string, unknown>): Promise<unknown> {
  const url = data.apiUrl as string;
  const method = (data.apiMethod as string) || 'GET';

  if (!url) {
    return { records: [], count: 0, error: 'No API URL configured' };
  }

  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (Array.isArray(result)) {
    return { records: result, count: result.length };
  }
  return result;
}

async function executeTransformNode(
  node: DAGNode,
  upstreamOutputs: UpstreamOutputs
): Promise<unknown> {
  const upstreamValues = Object.values(upstreamOutputs);
  if (upstreamValues.length === 0) {
    return { records: [], count: 0 };
  }

  const firstOutput = upstreamValues[0] as any;
  const records = firstOutput?.records || (Array.isArray(firstOutput) ? firstOutput : []);

  const transformType = node.data.transformType as string || 'map';
  const expression = node.data.expression as string || '';

  switch (transformType) {
    case 'map': {
      const transformed = records.map((record: any, idx: number) => {
        if (!expression) return { ...record, _transformed: true };
        try {
          const fn = new Function('record', 'index', `return ${expression}`);
          const result = fn(record, idx);
          return typeof result === 'object' ? result : { ...record, _mapped: result };
        } catch {
          return { ...record, _transformError: true };
        }
      });
      return { records: transformed, count: transformed.length };
    }
    case 'sort': {
      const field = expression || 'value';
      const sorted = [...records].sort((a: any, b: any) => {
        const va = a[field];
        const vb = b[field];
        if (typeof va === 'number' && typeof vb === 'number') return va - vb;
        return String(va).localeCompare(String(vb));
      });
      return { records: sorted, count: sorted.length };
    }
    case 'aggregate': {
      const field = expression || 'value';
      const nums = records
        .map((r: any) => Number(r[field]))
        .filter((n: number) => !isNaN(n));
      return {
        aggregate: {
          field,
          count: nums.length,
          sum: nums.reduce((a: number, b: number) => a + b, 0),
          avg: nums.length ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : 0,
          min: nums.length ? Math.min(...nums) : null,
          max: nums.length ? Math.max(...nums) : null,
        },
        sourceCount: records.length,
      };
    }
    default: {
      return { records, count: records.length };
    }
  }
}

async function executeFilterNode(
  node: DAGNode,
  upstreamOutputs: UpstreamOutputs
): Promise<unknown> {
  const upstreamValues = Object.values(upstreamOutputs);
  if (upstreamValues.length === 0) {
    return { records: [], count: 0 };
  }

  const firstOutput = upstreamValues[0] as any;
  const records = firstOutput?.records || (Array.isArray(firstOutput) ? firstOutput : []);

  const expression = node.data.expression as string || '';
  const filterType = node.data.filterType as string || 'condition';

  switch (filterType) {
    case 'condition': {
      if (!expression) return { records, count: records.length };
      const filtered = records.filter((record: any, idx: number) => {
        try {
          const fn = new Function('record', 'index', `return ${expression}`);
          return fn(record, idx);
        } catch {
          return false;
        }
      });
      return { records: filtered, count: filtered.length, filteredOut: records.length - filtered.length };
    }
    case 'limit': {
      const limit = parseInt(expression, 10) || 10;
      const limited = records.slice(0, limit);
      return { records: limited, count: limited.length, totalBefore: records.length };
    }
    default:
      return { records, count: records.length };
  }
}

async function executeSinkNode(
  node: DAGNode,
  upstreamOutputs: UpstreamOutputs
): Promise<unknown> {
  const upstreamValues = Object.values(upstreamOutputs);
  if (upstreamValues.length === 0) {
    return { written: 0, status: 'no_input' };
  }

  const firstOutput = upstreamValues[0] as any;
  const records = firstOutput?.records || (Array.isArray(firstOutput) ? firstOutput : []);
  const sinkType = node.data.sinkType as string || 'log';

  switch (sinkType) {
    case 'log': {
      console.log(`[Sink:Log] Pipeline output (${records.length} records):`, JSON.stringify(records, null, 2).slice(0, 500));
      return { written: records.length, status: 'logged' };
    }
    case 'json': {
      return { written: records.length, status: 'json_export', data: records };
    }
    case 'webhook': {
      const url = node.data.webhookUrl as string;
      if (!url) return { written: 0, status: 'no_url' };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, count: records.length, timestamp: new Date().toISOString() }),
      });
      return { written: records.length, status: response.ok ? 'sent' : 'failed', httpStatus: response.status };
    }
    default:
      return { written: records.length, status: 'unknown_sink' };
  }
}

async function executeGenericNode(
  node: DAGNode,
  upstreamOutputs: UpstreamOutputs
): Promise<unknown> {
  return {
    nodeId: node.id,
    nodeType: node.type,
    upstreamCount: Object.keys(upstreamOutputs).length,
    data: node.data,
  };
}
