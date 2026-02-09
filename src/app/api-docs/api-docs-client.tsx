'use client';

/**
 * Client component that renders Swagger UI.
 * Loads the pre-generated spec from /openapi.json (static asset in public/).
 */
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function ApiDocsClient() {
  return (
    <div className="swagger-ui-wrapper">
      <SwaggerUI
        url="/openapi.json"
        filter=""
        docExpansion="none"
      />
    </div>
  );
}
