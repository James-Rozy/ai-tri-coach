// Every watch face on /watch-faces/. Add a new entry here when a face (or a new brand) ships.
export type WatchFace = {
  id: string;
  name: string;
  brand: 'Garmin' | 'Apple' | 'COROS' | 'Polar' | 'Suunto';
  platform: string;
  /** Watches it's built and tested for. */
  devices: string[];
  /** coming-soon until the store listing is live; then set storeUrl and flip to available. */
  status: 'coming-soon' | 'available';
  storeUrl?: string;
  /** Leave out until it's decided; shown as a chip when set. */
  price?: string;
  tagline: string;
  features: { title: string; body: string }[];
};

export const watchFaces: WatchFace[] = [
  {
    id: 'sd-digital-tri',
    name: 'SD Digital Tri',
    brand: 'Garmin',
    platform: 'Connect IQ',
    devices: ['Fēnix 9 Pro 47mm'],
    status: 'coming-soon',
    tagline: 'A digital sports watch layout for triathletes: your week of swim, bike and run on your wrist, and a countdown to race day.',
    features: [
      { title: 'Swim, bike and run rings', body: 'Each ring fills toward your weekly time target for that sport, with this week’s distance and time inside.' },
      { title: 'LCD panel', body: 'Day, date and time in seven-segment digits with faint unlit segments, plus amber seconds.' },
      { title: 'Race countdown', body: 'Days until race day, curved along the bottom bezel. You set the date and the label.' },
      { title: 'The everyday stuff', body: 'Steps, battery, heart rate, wind, conditions and temperature, plus phone, do-not-disturb and alarm status.' },
      { title: 'Burn-in safe always-on', body: 'Wrist down, it shows only the panel and time, dimmed and striped so no pixel stays lit for more than a minute.' },
      { title: 'Your targets', body: 'Weekly minutes for each sport, the race date and the countdown label are all settings in the Connect IQ app.' },
    ],
  },
];
