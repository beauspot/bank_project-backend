import axios from "axios";

// import log from "@/utils/logging";
import config from "@/api/helpers/config/env";
import AppError from "@/utils/appErrors";

export class PaystackService {
  private baseURL = "https://api.paystack.co";
  private secretKey: string;

  constructor() {
    this.secretKey = config.paystack.paystack_secret_key!;

    if (!this.secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }
  }

  async createVirtualAccount(data: {
    email: string;
    firstname: string;
    lastname: string;
    phonenumber: string;
    bvn?: string;
  }) {
    try {
      const headers = {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      };

      // 1. Creating the paystack customer
      const createCustomerData = await axios.post(
        `${this.baseURL}/customer`,
        {
          email: data.email,
          firstname: data.firstname,
          lastname: data.lastname,
          phone: data.phonenumber,
        },
        { headers },
      );

      if (!createCustomerData.data.status)
        throw new AppError(
          `Paystack customer creation failed: ${createCustomerData.data.message}`,
          400,
          false,
        );

      const customerCode = createCustomerData.data.data.customer_code;

      // 2. using the customer code to create the DVA (Dedicated Virtual Account)

      const DVA_RES = await axios.post(
        `${this.baseURL}/dedicated_account`,
        {
          customer: customerCode,
          preferred_bank: config.paystack.preferred_bank || "wema-bank",
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!DVA_RES.data.status) {
        throw new AppError(
          `Paystack Dedicated Account creation failed: ${DVA_RES.data.message}`,
          400,
          false,
        );
      }

      return DVA_RES.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const body = error.response?.data;
        throw new AppError(
          `Paystack API error: ${error.response?.status} - ${JSON.stringify(body)}`,
          error.response?.status || 500,
          false,
        );
      }
      throw new AppError(`Paystack API error: ${error}`, 500, false);
    }
  }

  async getVirtualAccount(accountId: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/dedicated_account/${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new AppError(`Paystack API error: ${error}`, 401, false);
    }
  }

  async deactivateVirtualAccount(accountId: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/dedicated_account/${accountId}/deactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new AppError(`Paystack API error: ${error}`, 401, false);
    }
  }
}
