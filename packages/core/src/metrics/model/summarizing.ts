
/**
 * Interface fo all metric classes that build a sum of values.
 *
 * @export
 * @interface Summarizing
 */
export interface Summarizing {

  /**
   * Gets the sum of values.
   *
   * @returns {number}
   * @memberof Summarizing
   */
  getSum(): bigint; // todo: Bigint
}

/**
 * The serialized version of {@link Summarizing}.
 *
 * @export
 * @interface SerializableSummarizing
 */
export interface SerializableSummarizing {

  /**
   * number in its string representation.
   *
   * @type {string}
   * @memberof SerializableSummarizing
   */
  sum: string;

}
