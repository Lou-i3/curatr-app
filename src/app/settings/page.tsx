import { getSettings } from '@/lib/settings';
import { SettingsForm } from './settings-form';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Settings"
        description="Configure application preferences"
      />

      <SettingsForm initialSettings={settings} />
    </PageContainer>
  );
}
