fetch('http://localhost:3000/api/chatbot/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        messages: [
            { role: 'user', content: 'Tolong jelaskan kondisi gizi balita terkait stunting dan capaian ASI berdasarkan indikator.' }
        ],
        userRole: 'superadmin'
    })
})
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
