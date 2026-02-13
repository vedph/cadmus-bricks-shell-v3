import { Assertion } from '@myrmidon/cadmus-refs-assertion';

import { HistoricalDateModel } from '../historical-date/historical-date';

/**
 * A historical date with an optional tag and assertion.
 */
export interface AssertedHistoricalDate extends HistoricalDateModel {
  tag?: string;
  assertion?: Assertion;
}
