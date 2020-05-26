import { sample } from 'lodash';

const VERBS = [
  'vaporized',
  'disintegrated',
  'liquefied',
  'infected',
  'decapitated',
  'dematerialized',
  'spaghettified',
  'obliterated',
  'worked over',
  'eaten alive',
  'submerged',
  'crushed',
  'excoriated',
  'extinguished',
];

const ADJECTIVES = [
  'catastrophic',
  'rabid',
  'extinction-level',
  'quantum-relativistic',
  'heat-seeking',
  'radioactive',
  'rancid',
  'putrefied',
  'ultramagnetic',
  'random',
  'radical',
  'psychedelic',
  'disruptive',
  'demonic',
  'passive-aggressive',
];

const ACTORS = [
  'super-nova',
  'gamma-ray burst',
  'vacuum-decay',
  'quantum decoherence',
  'troupe of killer clowns',
  'zombie apocalypse',
  'swarm of locusts',
  'barrage of intercontinental ballistic missiles',
  'vat of rancid cheese',
  'school of sharks with frickin" lasers',
  'pack of werewolves',
  'swarm of feral goldfish',
  'Romulo-Vulcan tractor beam',
  'thundering herd of bison',
  'pandemic contagion',
  'pack of gummy bears',
];

export function getCatastrophe(subject): string {
  const verb = sample(VERBS);
  const adjective = sample(ADJECTIVES);
  const actor = sample(ACTORS);
  return `${subject} ${verb} by a ${adjective} ${actor}`;
}
