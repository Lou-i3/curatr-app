import { getSettings } from '@/lib/settings';
import { SettingsForm } from './settings-form';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';
import { AdminGuard } from '@/components/admin-guard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <AdminGuard>
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Settings"
        description="Configure application preferences"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <SettingsForm initialSettings={settings} />
    </PageContainer>
    </AdminGuard>
  );
}
