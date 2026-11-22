import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../../components/ui';
import { UsersPanel } from './UsersPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { AppointmentsPanel } from './AppointmentsPanel';
import { ActivityPanel } from './ActivityPanel';

type Tab = 'customers' | 'providers' | 'categories' | 'appointments' | 'activity';
const TABS: { value: Tab; label: string }[] = [
  { value: 'customers', label: 'Customers' },
  { value: 'providers', label: 'Providers' },
  { value: 'categories', label: 'Categories' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'activity', label: 'Activity log' },
];

export default function AdminManagement() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as Tab | null;
  const tab: Tab = raw && TABS.some((t) => t.value === raw) ? raw : 'customers';

  return (
    <div>
      <PageHeader title="Management" subtitle="Manage users, providers, categories and every appointment on the platform." />
      <Tabs tabs={TABS} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      <div className="mt-5">
        {tab === 'customers' && <UsersPanel key="customers" role="customer" />}
        {tab === 'providers' && <UsersPanel key="providers" role="provider" />}
        {tab === 'categories' && <CategoriesPanel />}
        {tab === 'appointments' && <AppointmentsPanel />}
        {tab === 'activity' && <ActivityPanel />}
      </div>
    </div>
  );
}
