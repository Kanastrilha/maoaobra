const DAY_NUMBERS = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sab: 6 };

export function getWorkingSchedule(details = {}) {
  const legacy = details.workingHours || '';
  const hours = legacy.match(/(\d{2}:\d{2})\s*às\s*(\d{2}:\d{2})/);
  return {
    days: details.diasTrabalho || legacy.split(',')[0] || 'Seg-Sex',
    start: details.horaInicio ?? hours?.[1] ?? '08:00',
    end: details.horaFim ?? hours?.[2] ?? '18:00',
    timeZone: details.timeZone || 'America/Cuiaba',
  };
}

function worksOnDay(days, day) {
  if (days === 'Todos os dias' || days === 'Dom-Dom') return true;
  if (days === 'Finais de semana') return day === 0 || day === 6;
  if (days === 'A combinar') return false;
  const [start, end] = days.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('-').map(d => DAY_NUMBERS[d]);
  if (start === undefined || end === undefined) return false;
  return start <= end ? day >= start && day <= end : day >= start || day <= end;
}

export function isWorkerOnline(details, now = new Date()) {
  if (!details?.isOnline) return false;
  const { days, start, end, timeZone } = getWorkingSchedule(details);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return false;
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const first = toMinutes(start), last = toMinutes(end);
    if (first === last) return false;
    if (first < last) return worksOnDay(days, day) && minute >= first && minute < last;
    return (minute >= first && worksOnDay(days, day)) || (minute < last && worksOnDay(days, (day + 6) % 7));
  } catch {
    return false;
  }
}
