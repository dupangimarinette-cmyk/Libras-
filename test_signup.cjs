const fs = require('fs');

async function testFullSignup() {
  console.log('--- 1. Testing Admin Login ---');
  const loginRes = await fetch('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Maribug12345' })
  });
  const loginData = await loginRes.json();
  const token = loginData.session?.token;
  console.log('Admin login:', loginData.success, 'session user:', loginData.session?.username);

  console.log('\n--- 2. Requesting Human Check Challenge ---');
  const chRes = await fetch('http://localhost:3000/api/signup/challenge?mode=math');
  const chData = await chRes.json();
  console.log('Challenge question:', chData.question);

  const match = chData.question.match(/Quanto é (\d+) (mais|menos) (\d+)\?/);
  const a = parseInt(match[1]);
  const b = parseInt(match[3]);
  const op = match[2];
  const ans = op === 'mais' ? a + b : a - b;
  console.log('Calculated answer:', ans);

  // Wait 2.8s for MIN_FILL_MS (anti-bot minimum reading time)
  await new Promise(r => setTimeout(r, 2800));

  console.log('\n--- 3. Verifying Challenge Answer ---');
  const verifyRes = await fetch('http://localhost:3000/api/signup/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: chData.token, answer: String(ans) })
  });
  const verifyData = await verifyRes.json();
  console.log('Verify result:', verifyData.success, 'got pass:', Boolean(verifyData.pass));

  console.log('\n--- 4. Registering Real Student Account ---');
  const testSyncCode = 'LIB-' + Math.floor(1000 + Math.random() * 9000);
  const testUsername = 'Camila Libras';
  const saveRes = await fetch('http://localhost:3000/api/sync/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signup-Pass': verifyData.pass
    },
    body: JSON.stringify({
      syncCode: testSyncCode,
      username: testUsername,
      userStats: {
        username: testUsername,
        syncCode: testSyncCode,
        xp: 0,
        level: 1,
        gems: 0,
        hearts: 5,
        streak: 0,
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        bio: 'Aprendendo a Língua Brasileira de Sinais com Realidade Aumentada! 🤟',
        isLoggedIn: true,
        role: 'learner',
        completedLessonIds: [],
        claimedChestIds: [],
        signMastery: {},
        perfectSignsCount: 0,
        hasStreakFreeze: false,
        activeTheme: 'neon-cyber',
        profileColor: '#10b981',
        soundEnabled: true,
        hapticEnabled: true,
        activeTitle: 'Aprendiz Curioso',
        unlockedTitles: ['Aprendiz Curioso'],
        unlockedMascotItems: [],
        equippedMascot: { outfit: 'none', hat: 'none', glasses: 'none', skin: 'skin_esmeralda' },
        unlockedNameColors: ['gold'],
        unopenedChestsCount: 0,
        redeemedPromoCodes: [],
        lastCloudSynced: new Date().toISOString()
      },
      missions: []
    })
  });
  const saveData = await saveRes.json();
  console.log('Save response status:', saveRes.status, 'success:', saveData.success, 'syncCode:', saveData.syncCode);

  console.log('\n--- 5. Checking Admin Panel Realtime Feed ---');
  const feedRes = await fetch('http://localhost:3000/api/admin/realtime-feed', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const feed = await feedRes.json();
  console.log('Total accounts in admin panel:', feed.totalUsers);
  console.log('Users in admin panel:');
  feed.users.forEach(u => console.log('  -', u.role.toUpperCase(), u.username, '[' + u.syncCode + ']', u.xp, 'XP'));

  const camila = feed.users.find(u => u.username === 'Camila Libras');
  console.log('\n>>> Verification: Is "Camila Libras" in the Admin Panel without refresh?', camila ? 'YES (PASSED)' : 'NO (FAILED)');

  const adminTop = feed.users[0]?.role === 'admin';
  console.log('>>> Verification: Is Administradora at the top of the list?', adminTop ? 'YES (PASSED)' : 'NO (FAILED)');
}

testFullSignup().catch(console.error);
