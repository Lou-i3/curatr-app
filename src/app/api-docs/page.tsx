/**
 * Interactive API documentation page — renders the OpenAPI spec with Swagger UI
 */
import { PageHeader } from '@/components/page-header';
import { ApiDocsClient } from './api-docs-client';

export default function ApiDocsPage() {
  return (
    <>
      <PageHeader
        title="API Documentation"
        description="Interactive reference for all Curatr REST API endpoints"
      />
      <div className="px-8 pb-8">
        <ApiDocsClient />
      </div>
    </>
  );
}
