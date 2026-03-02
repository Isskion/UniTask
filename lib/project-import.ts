import * as xlsx from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, deleteDoc, getDocs, query, where } from 'firebase/firestore';

export interface ProjectPlanNode {
    id: string; // The WBS or Outline Number (e.g. 1.1.1)
    projectId: string; // The UniTask project ID
    title: string;
    startDate: number | null;
    endDate: number | null;
    durationText: string;
    percentComplete: number;
    outlineLevel: number;
    parentId: string | null;
}

export class ProjectImportService {
    /**
     * Extracts headers from an MS Project exported XLSX file.
     */
    static async extractHeaders(file: File): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = xlsx.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = xlsx.utils.sheet_to_json<any>(worksheet, { header: 1 });

                    // Find the header row by looking for common MS Project column names
                    for (let i = 0; i < Math.min(rows.length, 20); i++) {
                        const row = rows[i];
                        if (row && (row.includes('Nombre') || row.includes('Nombre de tarea') || row.includes('Número de esquema') || row.includes('Outline Number'))) {
                            resolve(row.map(String).filter(Boolean)); // Return non-empty string headers
                            return;
                        }
                    }

                    reject(new Error("No se detectaron cabeceras válidas en el archivo."));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parses the XLSX file using a provided column mapping.
     */
    static async parseXlsxWithMapping(file: File, mapping: Record<string, string>, projectId: string): Promise<ProjectPlanNode[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = xlsx.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = xlsx.utils.sheet_to_json<any>(worksheet, { header: 1 });

                    // Find the header row
                    let startIndex = -1;
                    let headers: string[] = [];
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (row && (row.includes('Nombre') || row.includes('Nombre de tarea') || row.includes('Número de esquema') || row.includes('Outline Number'))) {
                            startIndex = i;
                            headers = row.map(String);
                            break;
                        }
                    }

                    if (startIndex === -1) {
                        throw new Error("No se pudo detectar las cabeceras en el archivo.");
                    }

                    // Create reverse mapping: uniTaskField -> columnIndex
                    const fieldToColIndex: Record<string, number> = {};
                    for (const [excelHeader, uniTaskField] of Object.entries(mapping)) {
                        if (uniTaskField && uniTaskField !== 'ignore') {
                            const colIdx = headers.indexOf(excelHeader);
                            if (colIdx !== -1) {
                                fieldToColIndex[uniTaskField] = colIdx;
                            }
                        }
                    }

                    if (fieldToColIndex['wbs'] === undefined) {
                        throw new Error("Es obligatorio mapear el campo 'WBS / Número de esquema'.");
                    }
                    if (fieldToColIndex['title'] === undefined) {
                        throw new Error("Es obligatorio mapear el campo 'Título / Nombre'.");
                    }

                    const nodes: ProjectPlanNode[] = [];

                    const convertExcelDate = (excelDate: any): number | null => {
                        if (typeof excelDate === 'number') {
                            return Math.round((excelDate - 25569) * 86400 * 1000);
                        }
                        if (typeof excelDate === 'string') {
                            const d = new Date(excelDate);
                            if (!isNaN(d.getTime())) return d.getTime();
                        }
                        return null;
                    };

                    for (let i = startIndex + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;

                        const name = row[fieldToColIndex['title']];
                        const outline = row[fieldToColIndex['wbs']] ? String(row[fieldToColIndex['wbs']]) : null;

                        if (!name || !outline) continue;

                        const parts = outline.split('.');
                        let parentId = null;
                        let outlineLevel = parts.length;

                        if (parts.length > 1) {
                            parts.pop();
                            parentId = parts.join('.');
                        }

                        const node: ProjectPlanNode & { description?: string, priority?: string } = {
                            id: outline,
                            projectId,
                            title: String(name),
                            startDate: fieldToColIndex['startDate'] !== undefined ? convertExcelDate(row[fieldToColIndex['startDate']]) : null,
                            endDate: fieldToColIndex['endDate'] !== undefined ? convertExcelDate(row[fieldToColIndex['endDate']]) : null,
                            durationText: fieldToColIndex['duration'] !== undefined && row[fieldToColIndex['duration']] ? String(row[fieldToColIndex['duration']]) : "",
                            percentComplete: fieldToColIndex['percentComplete'] !== undefined && row[fieldToColIndex['percentComplete']] ? parseFloat(row[fieldToColIndex['percentComplete']]) : 0,
                            outlineLevel,
                            parentId
                        };

                        if (fieldToColIndex['description'] !== undefined && row[fieldToColIndex['description']]) {
                            node.description = String(row[fieldToColIndex['description']]);
                        }

                        if (fieldToColIndex['priority'] !== undefined && row[fieldToColIndex['priority']]) {
                            node.priority = String(row[fieldToColIndex['priority']]);
                        }

                        nodes.push(node);
                    }

                    resolve(nodes);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Saves a parsed hierarchy to Firebase, replacing any existing ones for the project.
     */
    static async saveHierarchyToFirebase(projectId: string, tenantId: string, nodes: ProjectPlanNode[]) {
        // 1. Delete existing for this project to keep it clean (requires tenantId for security rules)
        const q = query(collection(db, "project_hierarchy"), where("projectId", "==", projectId), where("tenantId", "==", tenantId));
        const snap = await getDocs(q);
        const batchDelete = writeBatch(db);
        snap.forEach(doc => {
            batchDelete.delete(doc.ref);
        });
        await batchDelete.commit();

        // 2. Insert new docs in batches of 500 (Firestore limit)
        // Ensure nodes have tenantId
        const nodesWithTenant = nodes.map(n => ({ ...n, tenantId }));

        // Firestore batches can handle up to 500 ops.
        const chunkArray = (arr: any[], size: number): any[][] =>
            arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [arr];

        const chunks = chunkArray(nodesWithTenant, 450);

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const node of chunk) {
                const docRef = doc(collection(db, "project_hierarchy"));
                const dataToSave = {
                    ...node,
                    wbs: node.id,
                };
                delete (dataToSave as any).id;
                batch.set(docRef, dataToSave);
            }
            await batch.commit();
        }
    }

    /**
     * Reverts an import by deleting all project_hierarchy nodes for the project
     * and unsetting the planId on any associated tasks.
     */
    static async rollbackImport(projectId: string, tenantId: string) {
        // 1. Unset planId on all tasks for this project (requires tenantId for security rules)
        const tasksQ = query(collection(db, "tasks"), where("projectId", "==", projectId), where("tenantId", "==", tenantId));
        const tasksSnap = await getDocs(tasksQ);

        let batch = writeBatch(db);
        let count = 0;

        for (const docSnap of tasksSnap.docs) {
            const data = docSnap.data();
            if (data.planId) {
                batch.update(docSnap.ref, { planId: null });
                count++;
                if (count >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
        }
        if (count > 0) {
            await batch.commit();
        }

        // 2. Delete all hierarchy nodes (requires tenantId for security rules)
        const hierarchyQ = query(collection(db, "project_hierarchy"), where("projectId", "==", projectId), where("tenantId", "==", tenantId));
        const hierarchySnap = await getDocs(hierarchyQ);

        batch = writeBatch(db);
        count = 0;

        for (const docSnap of hierarchySnap.docs) {
            batch.delete(docSnap.ref);
            count++;
            if (count >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
    }

    /**
     * Exports the selected project plan (and linked tasks) to a MS Planner compatible CSV
     */
    static exportToPlannerCSV(nodes: ProjectPlanNode[], linkedTasks: any[]) {
        // Flat output for Planner
        // Task Name, Bucket Name, Progress, Priority, Assigned To, Start Date, Due Date, Description

        const headers = ["Task Name", "Bucket Name", "Progress", "Priority", "Assigned To", "Start Date", "Due Date", "Description"];
        const rows: string[][] = [headers];

        nodes.forEach(node => {
            const relatedTasks = linkedTasks.filter(t => t.planId === node.id);
            const bucketName = node.title.replace(/"/g, '""');

            if (relatedTasks.length === 0) {
                // Export the plan node as a task if nothing is linked
                const title = node.title.replace(/"/g, '""');
                let start = "";
                let due = "";
                if (node.startDate) {
                    const sDate = new Date(node.startDate);
                    if (!isNaN(sDate.getTime())) start = sDate.toISOString().split('T')[0];
                }
                if (node.endDate) {
                    const eDate = new Date(node.endDate);
                    if (!isNaN(eDate.getTime())) due = eDate.toISOString().split('T')[0];
                }

                rows.push([
                    `"${title}"`,
                    `"MS Project Import"`,
                    node.percentComplete ? node.percentComplete.toString() : "0",
                    `"Medium"`,
                    `""`,
                    start,
                    due,
                    `"Importado desde WBS ${node.id}"`
                ]);
            } else {
                // Export each linked UniTask task
                relatedTasks.forEach(task => {
                    const title = task.title.replace(/"/g, '""');
                    const assignee = (task.assigneeEmails && task.assigneeEmails[0]) || task.assignedTo || '';
                    const desc = (task.description || '').replace(/"/g, '""').replace(/\n/g, ' ');

                    let start = "";
                    let due = "";
                    if (task.startDate) {
                        const sDate = typeof task.startDate === 'object' && task.startDate.toDate ? task.startDate.toDate() : new Date(task.startDate);
                        if (!isNaN(sDate.getTime())) start = sDate.toISOString().split('T')[0];
                    }
                    if (task.endDate) {
                        const eDate = typeof task.endDate === 'object' && task.endDate.toDate ? task.endDate.toDate() : new Date(task.endDate);
                        if (!isNaN(eDate.getTime())) due = eDate.toISOString().split('T')[0];
                    }

                    rows.push([
                        `"${title}"`,
                        `"${bucketName}"`,
                        "0", // Progress is usually set in Planner
                        `"${task.priority || 'Medium'}"`,
                        `"${assignee}"`,
                        start,
                        due,
                        `"${desc}"`
                    ]);
                });
            }
        });

        const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n"); // Add BOM for Excel UTF-8
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `planner_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
