import { EWMA, TimeUnit } from '../../../src/server/stats';

const PRECISION_DIGITS = 5;

describe('EWMA', () => {
  test('One Minute EWM with a value of three', () => {
    const ewma = EWMA.oneMinuteEWMA();
    ewma.update(3);
    ewma.tick();

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(0.6, 5);

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.22072766,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.08120117,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.02987224,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.01098938,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00404277,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00148725,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00054713,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00020128,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00007405,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00002724,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00001002,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00000369,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00000136,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.0000005,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.00000018,
      PRECISION_DIGITS,
    );
  });

  test('Five Minute EWMA With A Value Of Three', () => {
    const ewma = EWMA.fiveMinuteEWMA();
    ewma.update(3);
    ewma.tick();

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(0.6, PRECISION_DIGITS);

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.49123845,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.40219203,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.32928698,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.26959738,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.22072766,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.18071653,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.14795818,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.12113791,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.09917933,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.08120117,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.0664819,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.05443077,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.04456415,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.03648604,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.02987224,
      PRECISION_DIGITS,
    );
  });

  test('Fifteen Minute EWMA With A Value Of Three', () => {
    const ewma = EWMA.fifteenMinuteEWMA();
    ewma.update(3);
    ewma.tick();

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(0.6, PRECISION_DIGITS);

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.56130419,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.52510399,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.49123845,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(0.459557, PRECISION_DIGITS);

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.42991879,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.40219203,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.37625345,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.35198773,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.32928698,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.30805027,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.28818318,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.26959738,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.25221023,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.23594443,
      PRECISION_DIGITS,
    );

    elapseMinute(ewma);

    expect(ewma.rate(TimeUnit.SECONDS)).toBeCloseTo(
      0.22072766,
      PRECISION_DIGITS,
    );
  });
});

function elapseMinute(ewma: EWMA) {
  ewma.tick(12);
}
