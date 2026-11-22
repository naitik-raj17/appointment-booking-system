export type Role = 'customer' | 'provider' | 'admin';
export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type SlotStatus = 'available' | 'booked' | 'past';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
  providerCount?: number;
}

export interface ProviderProfile {
  _id: string;
  user: string;
  category: Pick<Category, '_id' | 'name' | 'slug' | 'icon'>;
  specialization: string;
  bio: string;
  experienceYears: number;
  city: string;
  address: string;
  price: number;
  currency: string;
  tags: string[];
  isApproved: boolean;
  ratingAverage: number;
  ratingCount: number;
}

export interface Session {
  token?: string;
  user: User;
  providerProfile: ProviderProfile | null;
}

export interface ProviderSummary {
  id: string;
  profileId: string;
  name: string;
  specialization: string;
  bio: string;
  experienceYears: number;
  city: string;
  address: string;
  price: number;
  currency: string;
  tags: string[];
  ratingAverage: number;
  ratingCount: number;
  category: { id: string; name: string; slug: string; icon: string } | null;
}

export interface DaySchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface BlockedDate {
  date: string;
  reason: string;
}

export interface Availability {
  _id?: string;
  slotDuration: number;
  bufferMinutes: number;
  weeklySchedule: DaySchedule[];
  blockedDates: BlockedDate[];
}

export interface Review {
  id: string;
  rating: number;
  review?: string;
  date: string;
  customerName: string;
}

export interface ProviderDetail extends ProviderSummary {
  email: string;
  phone: string;
  completedAppointments: number;
  availability: Availability | null;
  reviews: Review[];
}

export interface Slot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

export interface SlotsResponse {
  date: string;
  isWorkingDay: boolean;
  slotDuration: number | null;
  slots: Slot[];
  reason?: string;
}

export interface PersonRef {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface StatusHistoryEntry {
  status: AppointmentStatus;
  changedBy?: string;
  note?: string;
  at: string;
}

export interface Appointment {
  _id: string;
  customer: PersonRef;
  provider: PersonRef;
  providerProfile: {
    _id: string;
    specialization: string;
    city: string;
    address: string;
    price: number;
    currency: string;
    category?: { _id: string; name: string; slug: string; icon: string };
  };
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  isActive: boolean;
  notes: string;
  price: number;
  cancellationReason?: string;
  rescheduleCount: number;
  rating?: number;
  review?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSummary {
  byStatus: Record<AppointmentStatus, number>;
  total: number;
  upcoming: Appointment[];
  today: Appointment[];
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  emailStatus: 'pending' | 'sent' | 'failed' | 'skipped';
  createdAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unread?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface AdminUser extends User {
  appointmentCount: number;
  providerProfile: (Omit<ProviderProfile, 'category'> & { category?: { _id: string; name: string } }) | null;
}

export interface ActivityEntry {
  _id: string;
  actor?: { _id: string; name: string; email: string; role: Role };
  actorRole: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
}

export interface AdminStats {
  users: { total: number; customers: number; providers: number; admins: number };
  pendingProviders: number;
  appointments: { total: number; today: number; byStatus: Record<AppointmentStatus, number> };
  revenue: number;
  bookingsLast14Days: { date: string; count: number }[];
  bookingsByCategory: { category: string; count: number }[];
  topProviders: { id: string; name: string; specialization: string; rating: number; bookings: number; revenue: number }[];
}
