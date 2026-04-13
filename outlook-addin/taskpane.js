/* global Office */

Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        document.getElementById("send-btn").onclick = createUniTask;
        loadEmailDetails();
    }
});

function loadEmailDetails() {
    const item = Office.context.mailbox.item;
    document.getElementById("subject").value = item.subject || "Sin asunto";

    // Extract body as text
    item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            document.getElementById("body").value = result.value.substring(0, 1000) + "...";
        } else {
            showStatus("Error al leer el cuerpo del correo.", true);
        }
    });
}

async function createUniTask() {
    const subject = document.getElementById("subject").value;
    const body = document.getElementById("body").value;
    const btn = document.getElementById("send-btn");
    
    btn.disabled = true;
    showStatus("Enviando a UniTask...");

    try {
        // [Prototype] Send to a new Cloud Function endpoint
        // In a real scenario, this would include the tenantId and user auth token
        const response = await fetch("https://us-central1-minuta-f75a4.cloudfunctions.net/outlook-capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject: subject,
                body: body,
                source: "outlook_addin",
                sender: Office.context.mailbox.item.from.emailAddress
            })
        });

        if (response.ok) {
            showStatus("✅ Tarea creada correctamente.");
            setTimeout(() => {
                Office.context.ui.closeContainer();
            }, 2000);
        } else {
            throw new Error("Respuesta de servidor fallida");
        }
    } catch (error) {
        console.error(error);
        showStatus("❌ Error al conectar con UniTask.", true);
        btn.disabled = false;
    }
}

function showStatus(msg, isError = false) {
    const status = document.getElementById("status");
    status.innerText = msg;
    status.style.color = isError ? "#ef4444" : "#a1a1aa";
}
