const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/proxy?url=http://example.com');
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body length:", text.length);
    if(res.status === 404) console.log(text.slice(0, 200));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
