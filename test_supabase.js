const { createClient } = require('@supabase/supabase-js');

// Config from src/lib/supabase.js
const supabaseUrl = 'https://cekcccwlahbqajrouwrs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla2NjY3dsYWhicWFqcm91d3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTUyMzMsImV4cCI6MjA4NjQ3MTIzM30.cGFQG0a7AeLZPpM9KJcCRngaAm444Ufn-FhkOrBtyWA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing fetch for receiver: uLYaL2ZV86fNyomFatYgMSK7qkQ2');

    // 1. Fetch Request
    const { data: rawReqs, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', 'uLYaL2ZV86fNyomFatYgMSK7qkQ2')
        .eq('status', 'pending');

    console.log('Results:', { rawReqs, error });

    if (rawReqs && rawReqs.length > 0) {
        console.log('Success! Connection and query work.');
    } else {
        console.log('Failed to find the row. RLS might be blocking it for anon key even if permissive?');
    }
}

testFetch();
