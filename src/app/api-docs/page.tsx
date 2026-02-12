/**
 * Interactive API documentation page — renders the OpenAPI spec with Swagger UI
 */
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';
import { ApiDocsClient } from './api-docs-client';

export default function ApiDocsPage() {
  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="API Documentation"
        description="Interactive reference for all Curatr REST API endpoints"
        breadcrumbs={[{ label: 'API Docs' }]}
      />
      <ApiDocsClient />
    </PageContainer>
  );
}
