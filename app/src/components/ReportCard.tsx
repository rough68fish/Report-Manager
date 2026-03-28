import { Link } from 'react-router-dom';
import { Report, REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from '../types';

export function ReportCard({ report }: { report: Report }) {
  const fields = report.dataFields.slice(0, 4).map((rdf) => rdf.dataField.name);
  const extraFields = report.dataFields.length - 4;

  return (
    <Link
      to={`/reports/${report.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-400 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-snug">{report.title}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${REPORT_TYPE_COLORS[report.type]}`}>
          {REPORT_TYPE_LABELS[report.type]}
        </span>
      </div>

      {report.description && (
        <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{report.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {fields.map((name) => (
          <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {name}
          </span>
        ))}
        {extraFields > 0 && (
          <span className="text-xs text-gray-400">+{extraFields} more</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        {report.ownerName && <span>{report.ownerName}</span>}
        {report.department && <span>· {report.department}</span>}
        <span className="ml-auto">
          {new Date(report.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
