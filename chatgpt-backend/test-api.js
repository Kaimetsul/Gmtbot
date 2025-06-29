import fetch from 'node-fetch';

const API_BASE = "http://localhost:4000/api";

async function testAPI() {
  try {
    // Test health check
    console.log('Testing health check...');
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/`);
    console.log('Health check status:', healthResponse.status);
    
    // Test login
    console.log('\nTesting login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'Latifmuda12@gmail.com', 
        password: 'password' 
      })
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      const error = await loginResponse.text();
      console.log('Error:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful, token:', loginData.token.substring(0, 20) + '...');
    
    // Test sessions API
    console.log('\nTesting sessions API...');
    const sessionsResponse = await fetch(`${API_BASE}/sessions`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    console.log('Sessions API status:', sessionsResponse.status);
    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      console.log('Sessions found:', sessions.length);
    } else {
      const error = await sessionsResponse.text();
      console.log('Sessions API error:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI(); 