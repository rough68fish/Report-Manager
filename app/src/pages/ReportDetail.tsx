import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SingleResponse, Report, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';
import api from '../lib/api';

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.get<SingleResponse<Report>>(`/api/reports/${id}`).then((r) => r.data.data),
  });

  const archive = useMutation({
    mutationFn: () => api.delete(`/api/reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      navigate('/');
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError || !data) return <p className="text-red-500">Report not found.</p>;

  const r = data;

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/" className="text-sm text-blue-600 hover:underline mb-2 block">← Back to catalog</Link>
          <h1 className="text-2xl font-bold text-gray-900">{r.title}</h1>
        </div>
        <Link
          to={`/reports/${r.id}/edit`}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium"
        >
          Edit
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REPORT_TYPE_COLORS[r.type]}`}>
          {REPORT_TYPE_LABELS[r.type]}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          r.status === 'published' ? 'bg-green-100 text-green-800' :
          r.status === 'archived' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {r.status}
        </span>
        {r.tags.map((t) => (
          <span key={t.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {t.tag}
          </span>
        ))}
      </div>

      {r.description && <p className="text-gray-700 mb-6">{r.description}</p>}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mb-6">
        {r.url && (
          <>
            <dt className="text-gray-500 font-medium">URL</dt>
            <dd><a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">{r.url}</a></dd>
          </>
        )}
        {r.ownerName && (
          <>
            <dt className="text-gray-500 font-medium">Owner</dt>
            <dd>{r.ownerName}{r.ownerEmail && ` (${r.ownerEmail})`}</dd>
          </>
        )}
        {r.department && (
          <>
            <dt className="text-gray-500 font-medium">Department</dt>
            <dd>{r.department}</dd>
          </>
        )}
        {r.refreshCadence && (
          <>
            <dt className="text-gray-500 font-medium">Refresh</dt>
            <dd>{r.refreshCadence}</dd>
          </>
        )}
        {(r.dataStartDate || r.dataEndDate) && (
          <>
            <dt className="text-gray-500 font-medium">Data range</dt>
            <dd>{r.dataStartDate?.slice(0, 10) ?? '—'} → {r.dataEndDate?.slice(0, 10) ?? 'ongoing'}</dd>
          </>
        )}
        <dt className="text-gray-500 font-medium">Last updated</dt>
        <dd>{new Date(r.updatedAt).toLocaleDateString()}</dd>
      </dl>

      {r.dataFields.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Data Fields</h2>
          <div className="flex flex-wrap gap-2">
            {r.dataFields.map(({ dataField: df }) => (
              <span key={df.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">
                {df.name}
                {df.sourceSystem && <span className="text-blue-400 ml-1">· {df.sourceSystem}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {r.categories.map(({ category: c }) => (
              <span key={c.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => { if (confirm('Archive this report?')) archive.mutate(); }}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Archive report
      </button>
    </div>
  );
}
