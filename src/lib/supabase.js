import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cekcccwlahbqajrouwrs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla2NjY3dsYWhicWFqcm91d3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTUyMzMsImV4cCI6MjA4NjQ3MTIzM30.cGFQG0a7AeLZPpM9KJcCRngaAm444Ufn-FhkOrBtyWA';

export const supabase = createClient(supabaseUrl, supabaseKey);
