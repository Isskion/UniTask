
const apiKey = "AIzaSyCn0bFRny8MBp-hOIrxoIiiwVdgIMIqTsY";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function test() {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
