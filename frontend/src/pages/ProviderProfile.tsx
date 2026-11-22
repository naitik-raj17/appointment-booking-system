import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, CalendarCheck2, Clock, Mail, MapPin, Phone, Star } from 'lucide-react';
import { appointmentApi, providerApi } from '../api';
import { ApiError } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Avatar, Badge, Button, CategoryIcon, ErrorState, PageLoader, Rating, Textarea } from '../components/ui';
import { Calendar } from '../components/booking/Calendar';
import { SlotPicker } from '../components/booking/SlotPicker';
import { bookingRange, firstWorkingDate, makeDateFilter } from '../components/booking/availabilityRules';
import { formatDate, formatMoney, formatTime, WEEKDAYS } from '../utils/format';
import type { Appointment } from '../types';

export default function ProviderProfile() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: provider, loading, error, reload } = useAsync(() => providerApi.get(id), [id]);

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const range = bookingRange();

  useEffect(() => {
    if (provider && !date) setDate(firstWorkingDate(provider.availability));
  }, [provider, date]);

  if (loading) return <PageLoader />;
  if (error || !provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState message={error || 'Provider not found'} onRetry={reload} />
      </div>
    );
  }

  const book = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/providers/${id}` } });
      return;
    }
    if (!date || !time) return;
    setBooking(true);
    setBookError(null);
    try {
      const appt = await appointmentApi.create({ providerId: provider.id, date, startTime: time, notes: notes.trim() });
      setBooked(appt);
      toast.success('Booking request sent!');
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Booking failed');
      if (err instanceof ApiError && err.status === 409) {
        setTime(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setBooking(false);
    }
  };

  const resetBooking = () => {
    setBooked(null);
    setTime(null);
    setNotes('');
    setRefreshKey((k) => k + 1);
  };

  const canBook = !user || user.role === 'customer';
  const workingDays = provider.availability?.weeklySchedule.filter((d) => d.isWorking) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/providers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <div className="flex items-start gap-4">
              <Avatar name={provider.name} size="xl" />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold">{provider.name}</h1>
                <p className="text-slate-500">{provider.specialization}</p>
                <div className="mt-2">
                  <Rating value={provider.ratingAverage} count={provider.ratingCount} size="md" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {provider.category && (
                <Badge className="bg-brand-50 text-brand-700 ring-brand-600/20">
                  <CategoryIcon icon={provider.category.icon} className="h-3 w-3" /> {provider.category.name}
                </Badge>
              )}
              {provider.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{provider.bio || 'No description yet.'}</p>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" /> {[provider.address, provider.city].filter(Boolean).join(', ') || '—'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Award className="h-4 w-4 text-slate-400" /> {provider.experienceYears} years experience · {provider.completedAppointments} completed appointments
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" /> {provider.email}
              </div>
              {provider.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" /> {provider.phone}
                </div>
              )}
            </dl>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Price per session</span>
              <span className="text-lg font-semibold">{formatMoney(provider.price, provider.currency)}</span>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-slate-400" /> Working hours
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {provider.availability?.weeklySchedule.map((d) => (
                <li key={d.dayOfWeek} className="flex justify-between py-2">
                  <span className="text-slate-600">{WEEKDAYS[d.dayOfWeek]}</span>
                  {d.isWorking ? (
                    <span className="text-right font-medium text-slate-800">
                      {formatTime(d.startTime)} – {formatTime(d.endTime)}
                      {d.breakStart && d.breakEnd && <span className="block text-xs font-normal text-slate-400">Break {formatTime(d.breakStart)} – {formatTime(d.breakEnd)}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400">Closed</span>
                  )}
                </li>
              ))}
            </ul>
            {workingDays.length === 0 && <p className="text-sm text-slate-500">This provider has not published working hours yet.</p>}
          </section>

          <section className="card p-6">
            <h2 className="font-semibold">Reviews</h2>
            {provider.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No reviews yet.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {provider.reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.customerName}</span>
                      <span className="flex" aria-label={`${r.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </span>
                    </div>
                    {r.review && <p className="mt-1 text-slate-600">{r.review}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(r.date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card order-first h-fit p-6 lg:sticky lg:top-24 lg:order-none lg:col-span-3">
          <h2 className="text-lg font-semibold">Book an appointment</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a date and an available time. {provider.availability ? `Sessions last ${provider.availability.slotDuration} minutes.` : ''}</p>

          {booked ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CalendarCheck2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="mt-3 font-semibold text-emerald-900">Request sent to {provider.name}</h3>
              <p className="mt-1 text-sm text-emerald-800">
                {formatDate(booked.date)} at {formatTime(booked.startTime)}. You'll be notified by email when it's confirmed.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={() => navigate('/customer/appointments')}>View my appointments</Button>
                <Button variant="outline" onClick={resetBooking}>
                  Book another time
                </Button>
              </div>
            </div>
          ) : !canBook ? (
            <div className="mt-6">
              <Alert kind="info">Only customer accounts can book appointments. You are signed in as {user?.role}.</Alert>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Calendar
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setTime(null);
                    setBookError(null);
                  }}
                  minDate={range.min}
                  maxDate={range.max}
                  isDisabled={makeDateFilter(provider.availability)}
                />
                <div>
                  {date ? (
                    <SlotPicker providerId={provider.id} date={date} value={time} onChange={setTime} refreshKey={refreshKey} />
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No working days in the booking window.</p>
                  )}
                </div>
              </div>

              <Textarea wrapperClassName="mt-6" label="Notes for the provider (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything they should know before your visit?" />

              {bookError && (
                <div className="mt-4">
                  <Alert kind="error">{bookError}</Alert>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  {date && time ? (
                    <>
                      <p className="font-medium text-slate-800">
                        {formatDate(date)} · {formatTime(time)}
                      </p>
                      <p className="text-slate-500">{formatMoney(provider.price, provider.currency)} · pay at the appointment</p>
                    </>
                  ) : (
                    <p className="text-slate-500">Select a time slot to continue.</p>
                  )}
                </div>
                <Button size="lg" onClick={book} loading={booking} disabled={Boolean(user) && (!date || !time)}>
                  {user ? 'Request booking' : 'Log in to book'}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
