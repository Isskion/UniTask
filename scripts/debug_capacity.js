
const start = "2024-02-12"; // Monday
const end = "2024-02-23"; // Friday (2 weeks)
const points = 1;
const resources = 6;
const includeWeekends = false;

const calculatePlannedCapacity = (start, end, points, resources, includeWeekends) => {
    if (!start || !end) return 0;
    const startDate = new Date(start instanceof Date ? start : (start.toDate ? start.toDate() : start));
    const endDate = new Date(end instanceof Date ? end : (end.toDate ? end.toDate() : end));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) return 0;

    let workDays = 0;
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
        if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
            workDays++;
        }
        curr.setDate(curr.getDate() + 1);
    }
    console.log(`Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    console.log(`Workdays: ${workDays}, Points: ${points}, Resources: ${resources}`);
    return workDays * points * resources;
};

const capacity = calculatePlannedCapacity(start, end, points, resources, includeWeekends);
console.log("Calculated Capacity:", capacity);
