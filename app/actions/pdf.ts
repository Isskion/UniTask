import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

export async function generateDailyReportPDF(date: string, tenantId: string) {
    try {
        const pdfFn = httpsCallable(functions, 'generatePdf');
        const result = await pdfFn({ date, tenantId });
        return result.data as { success: boolean; pdf?: string; error?: string };
    } catch (error: any) {
        console.error('[PDF Client] Error:', error);
        return { success: false, pdf: undefined, error: error.message };
    }
}
