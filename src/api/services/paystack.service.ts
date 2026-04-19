import fetch from "node-fetch";

import config from "@/helpers/config/env";
import AppError from "@/utils/appErrors";

export class PaystackService {
  private baseURL = "https://api.paystack.co";
  private secretKey: string;

  constructor() {
    this.secretKey = config.paystack.paystack_secret_key!;

    if (!this.secretKey)
      throw new AppError("PAYSTACK_SECRET_KEY is not configured");
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async createVirtualAccount(data: {
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    bvn?: string;
  }) {
    try {
      // creating the paystack customer
      const createCustomerResponse = await fetch(`${this.baseURL}/customer`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data),
      });

      const createCustomerData = (await createCustomerResponse.json()) as any;

      if (!createCustomerResponse.ok || !createCustomerData.status)
        throw new AppError(
          `Paystack customer creation failed: ${Error}`,
          400,
          false,
        );

      const customerCode = createCustomerData.data.customer_code;

      // using the customerCode to create the DVA (Dedicated Virtual Account)

      const DVA_RES = await fetch(`${this.baseURL}/dedicated_account`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          customer: customerCode,
          preffered_bank: config.paystack.preferred_bank || "wema-bank",
        }),
      });

      const dvaData = (await DVA_RES.json()) as any;

      if (!dvaData)
        throw new AppError(
          `Paystack DVA creation failed: ${dvaData.message}`,
          400,
          false,
        );

      return dvaData.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getVirtualAccount(accountId: string) {
    try {
      const response = await fetch(
        `${this.baseURL}/dedicated_account/${accountId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok)
        throw new AppError(
          `Paystack API Error: ${response.status} - ${response.statusText}`,
          response.status,
          false,
        );
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async deactivateVirtualAccount(accountId: string) {
    try {
      const r = await fetch(
        `${this.baseURL}/dedicated_account/${accountId}/deactivate`,
        {
          method: "POST",
          headers: this.headers,
        },
      );

      const _r = (await r.json()) as any;
      if (!_r.ok) throw new AppError(_r.message);
      return _r.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Unknown Error";
    throw new AppError(`Paystack API error: ${message}`, 500, false);
  }
}
