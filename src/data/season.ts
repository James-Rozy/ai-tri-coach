// The 2027 season on /progress/ and the homepage. Dates past the base block are the plan, not fixed:
// the tune-up 70.3 and the Michigan date are still to be confirmed.
export const season = {
  start: '2026-11-01',
  end: '2027-09-19',
  phases: [
    { name: 'Base', from: '2026-11-01', to: '2027-03-31', note: 'All easy. Calves, swim technique, an FTP test in December.', color: 'var(--swim)' },
    { name: 'Build', from: '2027-04-01', to: '2027-06-30', note: 'Intensity comes back. Ends with a tune-up 70.3.', color: 'var(--bike)' },
    { name: 'Race prep', from: '2027-07-01', to: '2027-09-04', note: 'Race-specific long days and open water.', color: 'var(--run)' },
    { name: 'Taper', from: '2027-09-05', to: '2027-09-19', note: 'Two weeks to freshen up.', color: 'var(--trans)' },
  ],
  race: { name: '70.3 Michigan rematch', date: 'Sept 2027', note: 'Date to be confirmed' },
  then: 'Then my first full Ironman',
};
