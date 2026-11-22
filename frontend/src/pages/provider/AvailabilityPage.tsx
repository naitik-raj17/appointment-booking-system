import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { providerApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import type { Availability, DaySchedule } from '../../types';
import { formatDate, todayStr, WEEKDAYS } from '../../utils/format';
import { Alert, Button, ErrorState, Input, PageHeader, PageLoader, Select } from '../../components/ui';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Mirrors the server's slot generator to preview how many slots a day yields. */
function countSlots(day: DaySchedule, duration: number, buffer: number) {
  if (!day.isWorking || day.startTime >= day.endTime) return 0;
  const end = toMin(day.endTime);
  const breakRange = day.breakStart && day.breakEnd ? [toMin(day.breakStart), toMin(day.breakEnd)] : null;
  let n = 0;
  for (let s = toMin(day.startTime); s + duration <= end; s += duration + buffer) {
    if (breakRange && s < breakRange[1] && breakRange[0] < s + duration) continue;
    n += 1;
  }
  return n;
}

function dayError(d: DaySchedule): string | null {
  if (!d.isWorking) return null;
  if (d.startTime >= d.endTime) return 'End must be after start';
  if (Boolean(d.breakStart) !== Boolean(d.breakEnd)) return 'Set both break times or neither';
  if (d.breakStart && d.breakEnd) {
    if (d.breakStart >= d.breakEnd) return 'Break end must be after break start';
    if (d.breakStart < d.startTime || d.breakEnd > d.endTime) return 'Break must be within working hours';
  }
  return null;
}

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function AvailabilityPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => providerApi.myAvailability(), []);
  const [form, setForm] = useState<Availability | null>(null);
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const reset = () => {
    if (!data) return;
    setForm({
      slotDuration: data.slotDuration,
      bufferMinutes: data.bufferMinutes,
      weeklySchedule: [...data.weeklySchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      blockedDates: data.blockedDates,
    });
    setDirty(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reset, [data]);

  const errors = useMemo(() => Object.fromEntries((form?.weeklySchedule ?? []).map((d) => [d.dayOfWeek, dayError(d)])), [form]);
  const hasErrors = Object.values(errors).some(Boolean);

  if (loading || (!form && !error)) return <PageLoader />;
  if (error || !form) return <ErrorState message={error || 'Could not load availability'} onRetry={reload} />;

  const patch = (next: Partial<Availability>) => {
    setForm({ ...form, ...next });
    setDirty(true);
  };
  const patchDay = (dow: number, next: Partial<DaySchedule>) =>
    patch({ weeklySchedule: form.weeklySchedule.map((d) => (d.dayOfWeek === dow ? { ...d, ...next } : d)) });

  const copyToWeekdays = (source: DaySchedule) =>
    patch({ weeklySchedule: form.weeklySchedule.map((d) => (d.dayOfWeek >= 1 && d.dayOfWeek <= 5 ? { ...source, dayOfWeek: d.dayOfWeek } : d)) });

  const addBlocked = () => {
    if (!newBlock.date) return;
    if (form.blockedDates.some((b) => b.date === newBlock.date)) {
      toast.error('That date is already blocked');
      return;
    }
    patch({ blockedDates: [...form.blockedDates, { date: newBlock.date, reason: newBlock.reason.trim() }].sort((a, b) => (a.date < b.date ? -1 : 1)) });
    setNewBlock({ date: '', reason: '' });
  };

  const save = async () => {
    if (hasErrors) {
      toast.error('Please fix the highlighted days first');
      return;
    }
    setSaving(true);
    setWarning(null);
    try {
      const payload: Availability = {
        ...form,
        weeklySchedule: form.weeklySchedule.map((d) => ({ ...d, breakStart: d.breakStart || undefined, breakEnd: d.breakEnd || undefined })),
      };
      const res = await providerApi.updateMyAvailability(payload);
      toast.success('Availability saved');
      if (res.meta.activeAppointmentsOnBlockedDates > 0) {
        setWarning(`${res.meta.activeAppointmentsOnBlockedDates} active appointment(s) fall on blocked dates. They are kept — cancel them from Appointments if needed.`);
      }
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const weeklyTotal = form.weeklySchedule.reduce((sum, d) => sum + countSlots(d, form.slotDuration, form.bufferMinutes), 0);

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Set your weekly working hours, appointment length and days off. Customers only see slots inside these hours."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty || hasErrors}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />
      {warning && (
        <div className="mb-4">
          <Alert kind="warning">{warning}</Alert>
        </div>
      )}

      <section className="card p-5">
        <h2 className="font-semibold">Appointment slots</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select label="Slot duration" value={form.slotDuration} onChange={(e) => patch({ slotDuration: Number(e.target.value) })}>
            {[15, 20, 30, 45, 50, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
          <Select label="Buffer between slots" value={form.bufferMinutes} onChange={(e) => patch({ bufferMinutes: Number(e.target.value) })}>
            {[0, 5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'No buffer' : `${m} minutes`}
              </option>
            ))}
          </Select>
          <div className="rounded-lg bg-brand-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Weekly capacity</p>
            <p className="text-2xl font-semibold text-brand-900">{weeklyTotal} slots</p>
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Weekly schedule</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {DISPLAY_ORDER.map((dow) => {
            const d = form.weeklySchedule.find((x) => x.dayOfWeek === dow)!;
            const err = errors[dow];
            return (
              <div key={dow} className={`px-5 py-4 ${err ? 'bg-red-50/50' : ''}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="flex w-40 shrink-0 items-center gap-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={d.isWorking} onChange={(e) => patchDay(dow, { isWorking: e.target.checked })} />
                    <span className="text-sm font-medium">{WEEKDAYS[dow]}</span>
                  </label>
                  {d.isWorking ? (
                    <div className="flex flex-1 flex-wrap items-end gap-3">
                      <Input type="time" label="Start" value={d.startTime} onChange={(e) => patchDay(dow, { startTime: e.target.value })} wrapperClassName="w-32" />
                      <Input type="time" label="End" value={d.endTime} onChange={(e) => patchDay(dow, { endTime: e.target.value })} wrapperClassName="w-32" />
                      <Input type="time" label="Break from" value={d.breakStart || ''} onChange={(e) => patchDay(dow, { breakStart: e.target.value || undefined })} wrapperClassName="w-32" />
                      <Input type="time" label="Break to" value={d.breakEnd || ''} onChange={(e) => patchDay(dow, { breakEnd: e.target.value || undefined })} wrapperClassName="w-32" />
                      <span className="pb-2 text-xs text-slate-500">{countSlots(d, form.slotDuration, form.bufferMinutes)} slots</span>
                      {dow === 1 && (
                        <Button size="sm" variant="ghost" className="mb-1" onClick={() => copyToWeekdays(d)} title="Copy Monday's hours to Tuesday–Friday">
                          <Copy className="h-3.5 w-3.5" /> Copy to weekdays
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Day off</span>
                  )}
                </div>
                {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarOff className="h-4 w-4 text-slate-400" /> Days off & holidays
        </h2>
        <p className="mt-1 text-sm text-slate-500">No slots are offered on blocked dates.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input type="date" label="Date" min={todayStr()} value={newBlock.date} onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })} wrapperClassName="sm:w-48" />
          <Input label="Reason (optional)" value={newBlock.reason} maxLength={120} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })} wrapperClassName="flex-1" />
          <Button variant="outline" onClick={addBlocked} disabled={!newBlock.date}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {form.blockedDates.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {form.blockedDates.map((b) => (
              <li key={b.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{formatDate(b.date)}</span>
                  {b.reason && <span className="text-slate-500"> — {b.reason}</span>}
                </span>
                <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => patch({ blockedDates: form.blockedDates.filter((x) => x.date !== b.date) })} aria-label={`Remove ${b.date}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No blocked dates.</p>
        )}
      </section>

      {dirty && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-lg">
          <span className="text-sm text-slate-600">You have unsaved changes.</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              Discard
            </Button>
            <Button onClick={save} loading={saving} disabled={hasErrors}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
