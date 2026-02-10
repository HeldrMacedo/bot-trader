const express = require('express');
const path = require('path');
const app = express();
const PORT = 3004;

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos da pasta atual
app.use(express.static(__dirname));

// --- MOCK APIs para evitar erros 404 no Console ---

// 1. Chave Gemini (Retorna chave de teste para evitar erro)
app.get('/get-gemini-key', (req, res) => {
    res.json({ apiKey: 'AIzaSyDO8QsMYHkItt2gP6FdpLCbayvzw9RkCZU' });
});

// 2. Débito de Créditos (Mock - Sempre sucesso)
app.post('/api/debit-credits', (req, res) => {
    console.log('💰 [MOCK] Débito solicitado:', req.body);
    res.json({ success: true, newBalance: 5000 });
});

// 3. Status do Servidor
app.get('/api', (req, res) => {
    res.json({ status: 'online' });
});

// 4. Usuários Online e Heartbeat
app.get('/api/online-users', (req, res) => {
    res.json({ success: true, users: [] });
});

app.post('/api/online-users/heartbeat', (req, res) => {
    res.json({ success: true });
});

app.post('/api/online-users/login', (req, res) => {
    res.json({ success: true });
});

// --------------------------------------------------

// Rota específica '/app' que o seu sistema exige
// Quando acessar localhost:3004/app, ele entregará o index.html
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Redirecionar a raiz '/' para '/app' por conveniência
app.get('/', (req, res) => {
    res.redirect('/app');
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor iniciado com sucesso!`);
    console.log(`🚀 Acesse: http://localhost:${PORT}/app`);
});