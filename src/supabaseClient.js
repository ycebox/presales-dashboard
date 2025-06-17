import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://presales-dashboard.supabase.co';
const supabaseKey = 'wxrwoxfrrtaynhhliroe';

export const supabase = createClient(supabaseUrl, supabaseKey); // ✅ Named export
