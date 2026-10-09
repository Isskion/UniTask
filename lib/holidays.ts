// Festivos de Madrid (estatales, Comunidad de Madrid y locales de Madrid capital).
// Fuente única: functions/src/workCalendar.ts (la comparten la app y las Cloud Functions).
import { format } from 'date-fns';
import { MADRID_HOLIDAYS, isHoliday } from '@/functions/src/workCalendar';

export { MADRID_HOLIDAYS };
export { holidayName, holidayCoverage, isWorkday, workdaysBetween, addWorkdays } from '@/functions/src/workCalendar';

/** Día en hora local (no toISOString: en UTC una medianoche local puede caer el día anterior). */
export const isMadridHoliday = (date: Date): boolean => isHoliday(format(date, 'yyyy-MM-dd'));
