import { sample, random } from 'unirand';

const VERBS = [
  'synergize',
  'calibrate',
  'ideate',
  'iterate',
  'archive',
  'morph',
  'target',
  'disambiguate',
  'initiate',
  'extrude',
  'materialize',
  'augment',
  'serialize',
  'deserialize',
  'render',
  'scale',
  'actuate',
  'exploit',
  'compress',
  'teleport',
  'engineer',
];

const ADJECTIVES = [
  'handcrafted',
  'ergonomic',
  'contextual',
  'baryonic',
  'virtual',
  'scalable',
  'haptic',
  'flux',
  'retro',
  'binaural',
  'torsion',
  'telescopic',
  'artisanal',
  'hydroponic',
  'logarithmic',
  'laser',
  'inertial',
  'user-centric',
  'relativistic',
  'multi-channel',
  'enterprise',
  'sinusoidal',
  'adaptive',
  'quantum',
  'cloud-based',
  'positronic',
];

const NOUNS = [
  'circuit',
  'actuator',
  'capacitor',
  'ergometer',
  'interferometer',
  'encabulator',
  'disruptor',
  'diffractor',
  'analyzer',
  'dampener',
  'metrics',
  'dynamometer',
  'calorimeter',
  'matrix',
  'paradigm',
  'magnetometer',
  'compensator',
  'gyroscope',
  'stator',
  'framework',
  'interface',
  'emulator',
  'deflector',
  'sprocket',
  'retroflector',
  'protocol',
];

function chooseOne(arr: string[]): string {
  const val = sample(arr, 1);
  return val[0];
}

export const chooseNoun = (): string => chooseOne(NOUNS);
export const chooseAdjective = (): string => chooseOne(ADJECTIVES);
export const chooseVerb = (): string => chooseOne(VERBS);

export function chooseGerund(): string {
  let verb = chooseVerb();
  if (verb[verb.length - 1] === 'e') {
    verb = verb.slice(0, -1);
  }
  return `${verb}ing`;
}

export const chooseProductName = (): string => {
  let description = chooseAdjective();
  if (random() > 0.2) {
    description += ' ' + chooseAdjective();
  }
  const noun = chooseNoun();
  return `${description} ${noun}`;
};

export const chooseProductNames = (count: number): string[] => {
  const adjectives = sample(ADJECTIVES, count, { shuffle: true });
  const nouns = sample(NOUNS, count, { shuffle: true });

  const result = [];
  for (let i = 0; i < count; i++) {
    let description = adjectives[i];
    if (random() > 0.2) {
      description += ' ' + chooseAdjective();
    }
    const noun = nouns[i];
    result.push(`${description} ${noun}`);
  }
  return result;
};
