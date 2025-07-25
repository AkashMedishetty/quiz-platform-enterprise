const { createClient } = require('@supabase/supabase-js');

// Load test configuration
const SUPABASE_URL = 'https://wfyyzdrqkzwhprcefnkx.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your actual key
const TEST_SESSION_CODE = 'TEST-LOAD'; // Replace with test session
const CONCURRENT_USERS = 50; // Start small, increase gradually

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simulate participant joining
async function simulateParticipant(participantNumber) {
  try {
    console.log(`🔄 Participant ${participantNumber} joining...`);
    
    // Get session
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('access_code', TEST_SESSION_CODE)
      .single();

    if (!session) {
      throw new Error('Session not found');
    }

    // Create participant
    const { data: participant, error } = await supabase
      .from('quiz_participants')
      .insert({
        quiz_session_id: session.id,
        name: `TestUser${participantNumber}`,
        mobile: `99999${participantNumber.toString().padStart(5, '0')}`,
        institute: 'Load Test Institute',
        avatar_color: 'bg-gradient-to-r from-blue-400 to-purple-400',
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Participant ${participantNumber} failed:`, error.message);
      return;
    }

    console.log(`✅ Participant ${participantNumber} joined successfully`);
    
    // Simulate staying connected for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error(`❌ Participant ${participantNumber} error:`, error.message);
  }
}

// Run load test
async function runLoadTest() {
  console.log(`🚀 Starting load test with ${CONCURRENT_USERS} concurrent users...`);
  
  const promises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    promises.push(simulateParticipant(i));
    
    // Stagger joins to avoid overwhelming
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  await Promise.all(promises);
  console.log('🏁 Load test completed');
}

runLoadTest().catch(console.error); 