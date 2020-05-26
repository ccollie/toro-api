import sample from 'lodash/sample';
import PD from 'probability-distributions';

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

export const chooseNoun = (): string => sample(NOUNS);
export const chooseAdjective = (): string => sample(ADJECTIVES);
export const chooseVerb = (): string => sample(VERBS);

export function chooseGerund(): string {
  let verb = chooseVerb();
  if (verb[verb.length - 1] === 'e') {
    verb = verb.slice(0, -1);
  }
  return `${verb}ing`;
}

export const chooseProductName = (): string => {
  let description = chooseAdjective();
  if (Math.random() > 0.2) {
    description += ' ' + chooseAdjective();
  }
  const noun = chooseNoun();
  return `${description} ${noun}`;
};

export const chooseProductNames = (count: number): string[] => {
  const adjectives = PD.sample(ADJECTIVES, count, false);
  const nouns = PD.sample(NOUNS, count, false);

  const result = [];
  for (let i = 0; i < count; i++) {
    let description = adjectives[i];
    if (PD.prng() > 0.2) {
      description += ' ' + chooseAdjective();
    }
    const noun = nouns[i];
    result.push(`${description} ${noun}`);
  }
  return result;
};
