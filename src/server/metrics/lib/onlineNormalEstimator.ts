/*
 * LingPipe v. 4.1.0
 * Copyright (C) 2003-2011 Alias-i
 *
 * This program is licensed under the Alias-i Royalty Free License
 * Version 1 WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the Alias-i
 * Royalty Free License Version 1 for more details.
 *
 * You should have received a copy of the Alias-i Royalty Free License
 * Version 1 along with this program; if not, visit
 * http://alias-i.com/lingpipe/licenses/lingpipe-license-1.txt or contact
 * Alias-i, Inc. at 181 North 11th Street, Suite 401, Brooklyn, NY 11211,
 * +1 (718) 290-9170.
 */
// Javascript port of
// http://www.alias-i.com/lingpipe/src/com/aliasi/stats/OnlineNormalEstimator.java

/**
 * An {@link OnlineNormalEstimator} provides an object that estimates
 * means, variances, and standard deviations for a stream of numbers
 * presented one at a time.  Given a set of samples
 * @example
 * x[0],...,x[N-1]}
 *
 * the mean is defined by:
 *
 * @example
 * mean(x) = (1/N) * <big><big>&Sigma;</big></big><sub>i &lt; N</sub> x[i]</pre></blockquote>
 *
 * The variance is defined as the average squared difference from the mean:
 *
 * <blockquote><pre>
 * var(x) = (1/N) * <big><big>&Sigma;</big></big><sub>i &lt; N</sub> (x[i] - mean(x))<sup>2</sup>
 * </pre></blockquote>
 *
 * and the standard deviation is the square root of variance:
 *
 * <blockquote><pre>
 * dev(x) = sqrt(var(x))</pre></blockquote>
 *
 * <p>By convention, the mean and variance of a zero-length sequence
 * of numbers are both returned as 0.0.
 *
 * The above functions provide the maximum likelihood estimates of
 * the mean, variance and standard deviation for a normal distribution
 * generating the values.  That is, the estimated parameters are the
 * parameters which assign the observed data sequence the highest probability.
 *
 * Unfortunately, the maximum likelihood variance and deviation
 * estimates are biased in that they tend to underestimate variance in
 * general.  The unbiased estimates adjust counts downward by one, thus
 * adjusting variance and deviation upwards:
 *
 * @example
 * const varUnbiased = (x) => (N / (N-1)) * var(x)
 * const devUnbiased = (x) => sqrt(varUnbiased(x))
 * </pre></blockquote>
 *
 * Note that {@code var'(x) >= var(x)} and {@code dev'(x) >= dev(x)}.
 *
 *
 * <b>Welford's Algorithm</b>
 *
 * <p>This class use's Welford's algorithm for estimation.  This
 * algorithm is far more numerically stable than either using two
 * passes calculating sums, and sum of square differences, or using a
 * single pass accumulating the sufficient statistics, which are the
 * two moments, the sum, and sum of squares of all entries.  The
 * algorithm keeps member variables in the class, and performs the
 * following update when seeing a new variable {@code x}:
 *
 * ```javascript
 * let n = 0;
 * let mu = 0.0;
 * let sq = 0.0;
 *
 * function update(x) {
 *	 ++n;
 *	 const muNew = mu + (x - mu)/n;
 *	 sq += (x - mu) * (x - muNew)
 *	 mu = muNew;
 * }
 * function mean() { return mu; }
 * function variance() { return n > 1 ? sq/n : 0.0; }
 * ```
 *
 * <b>Welford's Algorithm with Deletes</b>
 *
 * LingPipe extends the Welford's algorithm to support deletes by
 * value.  Given current values of {@code n}, {@code mu}, {@code sq},
 * and any {@code x} added at some point, we can compute the previous
 * values of {@code n}, {@code mu}, {@code sq}.  The delete method is:
 *
 *
 * ```javascript
 * function delete(x) {
 *	 if (n == 0) throw new IllegalStateException();
 *	 if (n == 1) {
 *		 n = 0; mu = 0.0; sq = 0.0;
 *		 return;
 *	 }
 *	 const muOld = (n * mu - x)/(n-1);
 *	 sq -= (x - mu) * (x - muOld);
 *	 mu = muOld;
 *	 --n;
 * }
 * ```
 *
 * Because the data are exchangeable for mean and variance
 * calculations (that is, permutations of the inputs produce
 * the same mean and variance), the order of removal does not
 * need to match the order of addition.
 *
 * <b>References</b>
 *
 * <ul>
 *
 * <li>Knuth, Donald E. (1998) <i>The Art of Computer Programming,
 * Volume 2: Seminumerical Algorithms, 3rd Edition.</i> Boston:
 * Addison-Wesley. Page 232.</li>
 *
 * <li>Welford, B. P. (1962) Note on a method for calculating
 * corrected sums of squares and products. <i>Technometrics</i>
 * <b>4</b>(3):419--420.</li>
 *
 * <li>Cook, John D. <a
 * href="http://www.johndcook.com/standard_deviation.html">Accurately
 * computing running variance</a>.</li>
 *
 *  </ul>
 *
 * @author  Bob Carpenter
 * @version 3.8.1
 * @since   Lingpipe3.8
 */
export default class OnlineNormalEstimator {
  private _count: number;
  private mS: number;
  private _mean = 0.0;

  /**
   * Construct an instance of an online normal estimator that has
   * seen no data.
   */
  constructor() {
    this.reset();
  }

  reset(): this {
    this._count = 0;
    this._mean = 0.0;
    this.mS = 0.0;
    return this;
  }

  /**
   * Add the specified value to the collection of samples for this
   * estimator.
   *
   * @param {number} x Value to add.
   */
  add(x: number): this {
    ++this._count;
    const nextMean = this._mean + (x - this._mean) / this._count;
    this.mS += (x - this._mean) * (x - nextMean);
    this._mean = nextMean;
    return this;
  }

  addAll(data: number[]): this {
    data.forEach((x) => this.add(x));
    return this;
  }

  /**
   * Removes the specified value from the sample set.  See the class
   * documentation above for the algorithm.
   *
   * @param {number} x  Value to remove from sample.
   * @throws RangeError If the current number of samples
   * is 0.
   */
  remove(x: number): this {
    if (this._count === 0) {
      const msg = 'Cannot remove after 0 samples.';
      throw new RangeError(msg);
    }
    if (this._count === 1) {
      this._count = 0;
      this._mean = 0.0;
      this.mS = 0.0;
      return;
    }
    const oldMean = (this._count * this._mean - x) / (this._count - 1);
    this.mS -= (x - this._mean) * (x - oldMean);
    this._mean = oldMean;
    --this._count;
    return this;
  }

  replace(oldValue: number, newValue: number): this {
    if (this._count === 0 || oldValue === undefined) {
      return this.add(newValue);
    }
    // precisely update the mean
    const prevM = this._mean;
    let sum = this._mean * this._count;
    sum -= oldValue;
    sum += newValue;
    this._mean = sum / this._count;

    this.mS -= (oldValue - prevM) * (oldValue - this._mean);
    this.mS += (newValue - prevM) * (newValue - this._mean);
    return this;
  }

  combine(that: OnlineNormalEstimator): this {
    const m = this._mean;
    // from http://www.johndcook.com/blog/skewness_kurtosis/
    const both = this._count + that._count;
    const newMean = (this._count * m + that._count * m) / both;
    const delta = this._mean - that._mean;
    const delta2 = delta * delta;
    const varianceDeltaSum =
      this.mS + that.mS + (delta2 * this._count * that._count) / both;

    this._count = both;
    this._mean = newMean;
    this.mS = varianceDeltaSum;
    return this;
  }

  /**
   * The number of samples seen by this estimator.
   *
   * @returns {number}
   */
  get numSamples(): number {
    return this._count;
  }

  /**
   * The number of samples seen by this estimator.
   *
   * @returns {number}
   */
  get count(): number {
    return this._count;
  }

  /**
   * The mean of the samples.
   *
   * @returns {number} The mean of the samples.
   */
  get mean(): number {
    return this._mean;
  }

  /**
   * Returns the maximum likelihood estimate of the variance of
   * the samples.
   *
   * @returns {number}
   */
  get variance(): number {
    return this._count > 1 ? this.mS / this._count : 0.0;
  }

  /**
   * The unbiased estimate of the variance of the samples.
   * @returns {number}
   */
  get varianceUnbiased(): number {
    return this._count > 1 ? this.mS / (this._count - 1) : 0.0;
  }

  /**
   * The maximum likelihood estimate of the standard deviation of
   * the samples.
   * @returns {number}
   */
  get standardDeviation(): number {
    return Math.sqrt(this.variance);
  }

  /**
   * The unbiased estimate of the standard deviation of the samples.
   * @return {number}
   */
  get standardDeviationUnbiased(): number {
    return Math.sqrt(this.varianceUnbiased);
  }
}
