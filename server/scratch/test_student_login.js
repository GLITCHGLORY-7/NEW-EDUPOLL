async function testLogin() {
  const url = 'http://localhost:3000/api/auth/login';
  const body = { loginId: 'SEC25IT175', password: 'SAIRAM123' };
  
  console.log('Sending login request to:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response body:', data);
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}

testLogin();
