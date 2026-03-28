import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReportCard } from '../components/ReportCard';
import { PaginatedResponse, Report, ReportType, REPORT_TYPE_LABELS } from '../types';
import api from '../lib/api';

const TYPES: ReportType[] = ['bi_dashboard', 'pdf_report', 'web_report', 'sql_extract'];

export function Browse() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ReportType | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', search, type, page],
    queryFn: () =>
      api
        .get<PaginatedResponse<Report>>('/api/reports', {
          params: { search: search || undefined, type: type || undefined, page },
        })
        .then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Report Catalog</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="search"
          placeholder="Search reports…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as ReportType | ''); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-500">Failed to load reports.</p>}

      {data && (
        <>
          <p className="text-sm text-gray-500 mb-4">{data.meta.total} report{data.meta.total !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
          {data.data.length === 0 && (
            <p className="text-gray-400 text-center py-16">No reports found.</p>
          )}

          {/* Pagination */}
          {data.meta.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {data.meta.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                disabled={page === data.meta.pages}
                className="px-3 py-1 text-sm rounded border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
