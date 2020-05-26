import pMap from 'p-map';
import { toArray } from 'lodash';

export async function setValues(
  listener,
  event,
  key: string,
  data,
): Promise<void> {
  data = toArray(data);
  await pMap(data, (datum) => {
    const evtData = {
      ts: Date.now(),
    };
    evtData[key] = datum;
    return listener.emit(event, evtData);
  });
}
