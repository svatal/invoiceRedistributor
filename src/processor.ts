import { IServiceTaxGroup, ISubscriber } from "./xml";

export const roundingErrorPlaceholder = "0";

export function categorize(
  subscribers: ISubscriber[],
  phoneNumberToGroup: { [key: string]: string | undefined }
) {
  let roundingError = 0;
  const result = subscribers.reduce((obj, s) => {
    add(obj, phoneNumberToGroup, s.phoneNumber, +s.summaryPriceWithTax);
    roundingError += getRoundingError(s.serviceTax.serviceTaxGroup);
    return obj;
  }, {} as ICategorized);

  if (phoneNumberToGroup[roundingErrorPlaceholder] !== undefined) {
    add(result, phoneNumberToGroup, roundingErrorPlaceholder, -roundingError);
  }
  return result;
}

export interface ICategorized {
  [key: string]: { sum: number; numbers: { [phoneNumber: string]: number } };
}

function add(
  obj: ICategorized,
  phoneNumberToGroup: { [key: string]: string | undefined },
  phoneNumber: string,
  price: number
) {
  const groupName = phoneNumberToGroup[phoneNumber] ?? "_Unknown_";
  const entry = obj[groupName] ?? { sum: 0, numbers: {} };
  entry.numbers[phoneNumber] = price;
  entry.sum += price;
  obj[groupName] = entry;
}

function getRoundingError(stg: IServiceTaxGroup | IServiceTaxGroup[]) {
  return (Array.isArray(stg) ? stg : [stg])
    .map((g) => +g.priceTax - (+g.priceWithoutTax * +g.tax) / 100)
    .reduce((a, b) => a + b, 0);
}
