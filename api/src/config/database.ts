import { createClient } from '@supabase/supabase-js';
import { config } from './index';

if (!config.database.supabaseUrl || !config.database.supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(
  config.database.supabaseUrl,
  config.database.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;
