interface ErrorContext {
  component?: string;
  action?: string;
  additionalData?: Record<string, unknown>;
}

export class DataAccessError extends Error {
  constructor(
    message: string,
    public context: ErrorContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DataAccessError';
  }
}

export function logDataAccessError(
  message: string,
  context: ErrorContext,
  error?: Error
) {
  const dataAccessError = new DataAccessError(message, context, error);

  console.error('[Data Access Error]', {
    message,
    context,
    error,
    timestamp: new Date().toISOString(),
  });

  if (import.meta.env.PROD) {
    import('@sentry/react').then((Sentry) => {
      Sentry.captureException(dataAccessError, {
        tags: {
          error_type: 'data_access',
          component: context.component,
          action: context.action,
        },
        extra: {
          ...context.additionalData,
          originalError: error?.message,
        },
      });
    });
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const healthCheckUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`;

    const response = await fetch(healthCheckUrl, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('Database health check failed:', data);
      return false;
    }

    const data = await response.json();

    if (data.status !== 'HEALTHY') {
      console.warn('Database is not healthy:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check database health:', error);
    return false;
  }
}

export function monitorQueryError(
  queryKey: string[],
  error: Error
): void {
  const errorMessage = error.message.toLowerCase();

  const isRLSError = errorMessage.includes('row-level security') ||
                     errorMessage.includes('permission denied') ||
                     errorMessage.includes('policy');

  const isConnectionError = errorMessage.includes('network') ||
                           errorMessage.includes('fetch') ||
                           errorMessage.includes('timeout');

  if (isRLSError) {
    logDataAccessError(
      'RLS Policy Error Detected - Content may not be accessible',
      {
        component: 'Query',
        action: queryKey.join('/'),
        additionalData: {
          queryKey,
          errorType: 'rls_policy',
          suggestion: 'Check database RLS policies',
        },
      },
      error
    );
  } else if (isConnectionError) {
    logDataAccessError(
      'Connection Error - Unable to reach database',
      {
        component: 'Query',
        action: queryKey.join('/'),
        additionalData: {
          queryKey,
          errorType: 'connection',
        },
      },
      error
    );
  } else {
    logDataAccessError(
      'Query Error',
      {
        component: 'Query',
        action: queryKey.join('/'),
        additionalData: {
          queryKey,
        },
      },
      error
    );
  }
}
