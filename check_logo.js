const fs = require('fs');
const b64 = fs.readFileSync('logo.png').toString('base64');
const html = `<body style="background: gray"><img src="data:image/jpeg;base64,${b64}" /></body>`;
fs.writeFileSync('logo.html', html);
console.log('done');
