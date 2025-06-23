import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://presales-dashboard.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cndveGZycnRheW5oaGxpcm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5OTE4NzQsImV4cCI6MjA2MzU2Nzg3NH0.N8LIM1AbAX2t5TVllcMxnyYDS1mg-8-ZqxIO8qEyhZo';

export const supabase = createClient(supabaseUrl, supabaseKey); // ✅ Named export
