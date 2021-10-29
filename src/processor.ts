import { keys } from "./utils";
import { ISubscriber } from "./xml";

export function categorize(
  subscribers: ISubscriber[],
  phoneNumberToGroup: { [key: string]: string | undefined }
) {
  return subscribers.reduce((obj, s) => {
    const groupName = phoneNumberToGroup[s.phoneNumber] ?? "_Unknown_";
    const entry = obj[groupName] ?? { sum: 0, numbers: {} };
    entry.numbers[s.phoneNumber] = +s.summaryPriceWithTax;
    entry.sum += +s.summaryPriceWithTax;
    obj[groupName] = entry;
    return obj;
  }, {} as { [key: string]: { sum: number; numbers: { [phoneNumber: string]: number } } });
}
