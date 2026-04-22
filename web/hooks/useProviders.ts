import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { Provider } from 'helper';

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get<Provider[]>('/providers').then(res => {
      if (res.success && res.data) setProviders(res.data);
    }).finally(() => setLoading(false));
  }, []);

  return { providers, loading };
}
