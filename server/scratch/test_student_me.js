async function testMe() {
  // Login first to get token
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'SEC25IT175', password: 'SAIRAM123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login token:', token);

  // Fetch student profile
  const res = await fetch('http://localhost:3000/api/student/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Profile response status:', res.status);
  const data = await res.json();
  console.log('Profile response body:', data);
}

testMe();
