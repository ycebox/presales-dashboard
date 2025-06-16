import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://presales-dashboard.supabase.co';
const supabaseKey = 'wxrwoxfrrtaynhhliroe';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
