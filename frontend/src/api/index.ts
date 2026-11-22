import { http } from './client';
import type {
  ActivityEntry,
  AdminStats,
  AdminUser,
  Appointment,
  AppointmentStatus,
  AppointmentSummary,
  Availability,
  Category,
  Notification,
  Paginated,
  ProviderDetail,
  ProviderProfile,
  ProviderSummary,
  Session,
  SlotsResponse,
  User,
} from '../types';

type Data<T> = { data: T };

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'customer' | 'provider';
  categoryId?: string;
  specialization?: string;
  city?: string;
  price?: number;
}

export interface ProviderSearchParams {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentQuery {
  status?: string;
  scope?: 'upcoming' | 'past' | 'all';
  from?: string;
  to?: string;
  q?: string;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const authApi = {
  login: (email: string, password: string) => http.post<Data<Session>>('/auth/login', { email, password }).then((r) => r.data),
  register: (input: RegisterInput) => http.post<Data<Session>>('/auth/register', input).then((r) => r.data),
  me: () => http.get<Data<Session>>('/auth/me').then((r) => r.data),
  updateAccount: (input: { name?: string; phone?: string }) => http.put<Data<Session>>('/auth/me', input).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) => http.put('/auth/password', { currentPassword, newPassword }),
};

export const categoryApi = {
  list: () => http.get<Data<Category[]>>('/categories').then((r) => r.data),
};

export const providerApi = {
  search: (params: ProviderSearchParams) => http.get<Paginated<ProviderSummary>>('/providers', { ...params }),
  get: (id: string) => http.get<Data<ProviderDetail>>(`/providers/${id}`).then((r) => r.data),
  slots: (id: string, date: string) => http.get<Data<SlotsResponse>>(`/providers/${id}/slots`, { date }).then((r) => r.data),
  myProfile: () => http.get<Data<ProviderProfile>>('/providers/me/profile').then((r) => r.data),
  updateMyProfile: (input: Partial<Omit<ProviderProfile, 'category'>> & { categoryId?: string }) =>
    http.put<Data<ProviderProfile>>('/providers/me/profile', input).then((r) => r.data),
  myAvailability: () => http.get<Data<Availability>>('/providers/me/availability').then((r) => r.data),
  updateMyAvailability: (input: Availability) =>
    http.put<Data<Availability> & { meta: { activeAppointmentsOnBlockedDates: number } }>('/providers/me/availability', input),
};

export const appointmentApi = {
  list: (query: AppointmentQuery) => http.get<Paginated<Appointment>>('/appointments', { ...query }),
  summary: () => http.get<Data<AppointmentSummary>>('/appointments/summary').then((r) => r.data),
  get: (id: string) => http.get<Data<Appointment>>(`/appointments/${id}`).then((r) => r.data),
  create: (input: { providerId: string; date: string; startTime: string; notes?: string }) =>
    http.post<Data<Appointment>>('/appointments', input).then((r) => r.data),
  cancel: (id: string, reason: string) => http.patch<Data<Appointment>>(`/appointments/${id}/cancel`, { reason }).then((r) => r.data),
  setStatus: (id: string, status: Exclude<AppointmentStatus, 'pending'>, reason = '') =>
    http.patch<Data<Appointment>>(`/appointments/${id}/status`, { status, reason }).then((r) => r.data),
  reschedule: (id: string, date: string, startTime: string) =>
    http.patch<Data<Appointment>>(`/appointments/${id}/reschedule`, { date, startTime }).then((r) => r.data),
  review: (id: string, rating: number, review: string) =>
    http.post<Data<Appointment>>(`/appointments/${id}/review`, { rating, review }).then((r) => r.data),
};

export const notificationApi = {
  list: (page = 1, limit = 20) => http.get<Paginated<Notification>>('/notifications', { page, limit }),
  markRead: (id: string) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
};

export const adminApi = {
  stats: () => http.get<Data<AdminStats>>('/admin/stats').then((r) => r.data),
  users: (query: { role?: string; status?: string; q?: string; page?: number; limit?: number }) =>
    http.get<Paginated<AdminUser>>('/admin/users', query),
  updateUser: (id: string, input: { isActive?: boolean; name?: string; phone?: string }) =>
    http.patch<Data<User>>(`/admin/users/${id}`, input).then((r) => r.data),
  deleteUser: (id: string) => http.delete(`/admin/users/${id}`),
  setApproval: (id: string, isApproved: boolean) => http.patch(`/admin/providers/${id}/approval`, { isApproved }),
  appointments: (query: AppointmentQuery) => http.get<Paginated<Appointment>>('/admin/appointments', { ...query }),
  activity: (page = 1, limit = 20) => http.get<Paginated<ActivityEntry>>('/admin/activity', { page, limit }),
  categories: () => http.get<Data<Category[]>>('/admin/categories').then((r) => r.data),
  createCategory: (input: { name: string; description: string; icon: string; isActive: boolean }) =>
    http.post<Data<Category>>('/admin/categories', input).then((r) => r.data),
  updateCategory: (id: string, input: { name: string; description: string; icon: string; isActive: boolean }) =>
    http.put<Data<Category>>(`/admin/categories/${id}`, input).then((r) => r.data),
  deleteCategory: (id: string) => http.delete(`/admin/categories/${id}`),
};
