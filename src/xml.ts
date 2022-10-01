import * as parser from "fast-xml-parser";
import * as fs from "fs";

export interface IXml {
  summary: {
    summaryHead: {
      day: string;
      month: string;
      year: string;
      billingPeriod: {
        from: string;
        to: string;
      };
    };
    subscribers: { subscriber: ISubscriber[] };
  };
}

export interface ISubscriber {
  phoneNumber: string;
  summaryPrice: string;
  summaryPriceWithTax: string;
  mainTariff: string;
  summaryData: {
    oneTimeCharges:
      | {
          otcItem: IOneTimeChargeItem | IOneTimeChargeItem[];
        }
      | undefined;
    regularCharges:
      | {
          rcItem: IRegularChargeItem | IRegularChargeItem[];
        }
      | undefined;
    usageCharges:
      | {
          usageCharge: IUsageCharge | IUsageCharge[];
        }
      | undefined;
    additionalServices:
      | {
          asItem: IAdditionalServiceItem | IAdditionalServiceItem[];
        }
      | undefined;
    payments:
      | {
          payment: IPayment | IPayment[];
        }
      | undefined;
    discounts:
      | {
          discountItem: IDiscountItem | IDiscountItem[];
        }
      | undefined;
  };
  serviceTax: {
    serviceTaxGroup: IServiceTaxGroup | IServiceTaxGroup[];
  };
}

export interface IOneTimeChargeItem {
  rowID: string;
  priceWithoutTax: string;
  priceWithTax: string;
  feeName: string;
}

export interface IRegularChargeItem {
  rowID: string;
  priceWithoutTax: string;
  priceWithTax: string;
  feeName: string;
}

export interface IUsageCharge {
  ucItem: IUsageChargeItem | IUsageChargeItem[];
}

export interface IUsageChargeItem {
  rowID: string;
  priceWithoutTax: string;
  priceWithTax: string;
  totalUnits: string;
  quantityOfConnect: string;
  name: string;
}

export interface IAdditionalServiceItem {
  rowID: string;
  priceWithoutTax: string;
  priceWithTax: string;
  feeName: string;
}

export interface IPayment {
  paymentItem: IPaymentItem | IPaymentItem[];
}

export interface IPaymentItem {
  rowID: string;
  price: string;
  paymentItemName: string;
}

export interface IServiceTaxGroup {
  tax: string;
  priceWithoutTax: string;
  priceTax: string;
}

export interface IDiscountItem {
  rowID: string;
  priceWithoutTax: string;
  priceWithTax: string;
  discountItemName: string;
}

export function parse(fileName: string) {
  const xmlString = fs.readFileSync(fileName, "utf-8");
  return parser.parse(xmlString, {
    attributeNamePrefix: "",
    ignoreAttributes: false,
  }) as IXml;
}
