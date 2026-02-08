import { getSettings } from '@/lib/settings';
import { SettingsForm } from './settings-form';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="p-8">
      <PageHeader
        title="Settings"
        description="Configure application preferences"
      />

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
