const https = require('https');

const token = '8349362792:AAEe4D6KFPJFSUg802FSLQveboc_cdVjtmM';
const url = `https://api.telegram.org/bot${token}/getMe`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
