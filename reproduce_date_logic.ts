
import { isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, startOfWeek, endOfWeek, format } from 'date-fns';

// Mock Tasks
const todayStr = "2026-01-07"; // The Current Date in the user metadata/system
const tasks = [
    { id: '1', createdAt: '2026-01-07T12:00:00.000Z', description: 'ISO String Task' }, // ISO String (UTC)
    { id: '2', createdAt: { toDate: () => new Date('2026-01-07T12:00:00.000Z') }, description: 'Firestore Timestamp Task' }, // Firestore-like
    { id: '3', createdAt: '2026-01-07', description: 'Short Date String Task' }, // YYYY-MM-DD
];

const entryDateStr = todayStr;
const entryDate = parseISO(entryDateStr);
console.log(`Entry Date Parsed (Local): ${entryDate.toString()}`);

// Helper
const getTaskDate = (task: any) => {
    if (!task.createdAt) return null;
    return (task.createdAt as any).toDate ? (task.createdAt as any).toDate() : new Date((task.createdAt as any));
};

console.log("--- Testing 'Day' Scope ---");
tasks.forEach(task => {
    const taskDate = getTaskDate(task);
    const taskDateStr = format(taskDate, 'yyyy-MM-dd');
    const isMatch = taskDateStr === entryDateStr;
    console.log(`Task ${task.id}: Date=${taskDate.toString()} -> Fmt=${taskDateStr}. Match? ${isMatch}`);
});

console.log("\n--- Testing 'Week' Scope ---");
tasks.forEach(task => {
    const taskDate = getTaskDate(task);
    const isMatch = isSameWeek(taskDate, entryDate, { weekStartsOn: 1 });
    console.log(`Task ${task.id}: Match? ${isMatch}`);
});

console.log("\n--- Chart Data Logic 'All' (Default Week) ---");
const relevantTasks = tasks;
const anchorDate = entryDate;
const startDate = startOfWeek(anchorDate, { weekStartsOn: 1 });
const endDate = endOfWeek(anchorDate, { weekStartsOn: 1 });
const daysMap = new Map<string, number>();

// Init Map
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    daysMap.set(format(d, 'yyyy-MM-dd'), 0);
}
console.log(`Chart Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

relevantTasks.forEach(t => {
    const tDate = getTaskDate(t);
    const dateKey = format(tDate, 'yyyy-MM-dd');
    if (daysMap.has(dateKey)) {
        daysMap.set(dateKey, daysMap.get(dateKey)! + 1);
        console.log(`Task ${t.id} added to chart bucket ${dateKey}`);
    } else {
        console.log(`Task ${t.id} skipped (outside range)`);
    }
});

console.log("Chart Data:", Array.from(daysMap.entries()));
