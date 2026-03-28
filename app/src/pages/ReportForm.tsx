import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SingleResponse, Report, DataField, ReportType, ReportStatus } from '../types';
import api from '../lib/api';

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'bi_dashboard', label: 'BI Dashboard' },
  { value: 'pdf_report', label: 'PDF Report' },
  { value: 'web_report', label: 'Web / Embedded' },
  { value: 'sql_extract', label: 'SQL Extract' },
];

const STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

type FormData = {
  title: string; description: string; type: ReportType; url: string;
  ownerName: string; ownerEmail: string; department: string; refreshCadence: string;
  dataStartDate: string; dataEndDate: string; status: ReportStatus;
  tags: string; dataFieldIds: string[];
};

const empty: FormData = {
  title: '', description: '', type: 'bi_dashboard', url: '',
  ownerName: '', ownerEmail: '', department: '', refreshCadence: '',
  dataStartDate: '', dataEndDate: '', status: 'draft', tags: '', dataFieldIds: [],
};

export function ReportForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(empty);
  const [error, setError] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.get<SingleResponse<Report>>(`/api/reports/${id}`).then((r) => r.data.data),
    enabled: isEdit,
  });

  const { data: fieldsData } = useQuery({
    queryKey: ['data-fields'],
    queryFn: () => api.get<{ data: DataField[] }>('/api/data-fields').then((r) => r.data.data),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description ?? '',
        type: existing.type,
        url: existing.url ?? '',
        ownerName: existing.ownerName ?? '',
        ownerEmail: existing.ownerEmail ?? '',
        department: existing.department ?? '',
        refreshCadence: existing.refreshCadence ?? '',
        dataStartDate: existing.dataStartDate?.slice(0, 10) ?? '',
        dataEndDate: existing.dataEndDate?.slice(0, 10) ?? '',
        status: existing.status,
        tags: existing.tags.map((t) => t.tag).join(', '),
        dataFieldIds: existing.dataFields.map((rdf) => rdf.dataField.id),
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: (payload: object) =>
      isEdit
        ? api.patch(`/api/reports/${id}`, payload)
        : api.post('/api/reports', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${res.data.data.id}`);
    },
    onError: () => setError('Failed to save. Please check the form and try again.'),
  });

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleField = (fieldId: string) =>
    setForm((f) => ({
      ...f,
      dataFieldIds: f.dataFieldIds.includes(fieldId)
        ? f.dataFieldIds.filter((id) => id !== fieldId)
        : [...f.dataFieldIds, fieldId],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    save.mutate({
      title: form.title,
      description: form.description || null,
      type: form.type,
      url: form.url || null,
      ownerName: form.ownerName || null,
      ownerEmail: form.ownerEmail || null,
      department: form.department || null,
      refreshCadence: form.refreshCadence || null,
      dataStartDate: form.dataStartDate || null,
      dataEndDate: form.dataEndDate || null,
      status: form.status,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      dataFieldIds: form.dataFieldIds,
    });
  };

  const field = (label: string, key: keyof FormData, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key] as string}
        onChange={set(key)}
        required={required}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <Link to={isEdit ? `/reports/${id}` : '/'} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← {isEdit ? 'Back to report' : 'Back to catalog'}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Report' : 'Add Report'}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {field('Title', 'title', 'text', true)}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={set('type')} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {field('Report URL', 'url', 'url')}

        <div className="grid grid-cols-2 gap-4">
          {field('Owner Name', 'ownerName')}
          {field('Owner Email', 'ownerEmail', 'email')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('Department', 'department')}
          {field('Refresh Cadence', 'refreshCadence')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('Data Start Date', 'dataStartDate', 'date')}
          {field('Data End Date', 'dataEndDate', 'date')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
          <input type="text" value={form.tags} onChange={set('tags')} placeholder="finance, monthly, actuals"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {fieldsData && fieldsData.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fields</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {fieldsData.map((df) => (
                <label key={df.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.dataFieldIds.includes(df.id)}
                    onChange={() => toggleField(df.id)} className="rounded" />
                  <span>{df.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={save.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-md text-sm">
            {save.isPending ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Report')}
          </button>
          <Link to={isEdit ? `/reports/${id}` : '/'}
            className="px-6 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50 font-medium">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
