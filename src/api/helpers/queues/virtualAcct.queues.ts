import { ConnectionOptions, QueueEvents, Queue, Worker } from "bullmq";

import { PaystackService } from "@/api/services/paystack.service";
import { AppDataSource } from "@/config/db.config";
import { AccountStatus, AccountType } from "@/enums/user";
import config from "@/helpers/config/env";
import { Account } from "@/models/acctEntity";
import { User } from "@/models/userEntity";
import AppError from "@/utils/appErrors";
import log from "@/utils/logging";
import redisModule from "@/utils/redis";

const { redisClient } = redisModule;
const connection: ConnectionOptions = redisClient;

// Queue definition for creating a user acct no
const virtualAccountQueue = new Queue("virtual-account-creation", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// const userRepoiroty = AppDataSource.getRepository(User);

// Add job to queue
async function queueVirtualAccountCreation(userId: string, userData: any) {
  await virtualAccountQueue.add("create-virtual-account", {
    userId,
    userData,
  });
}

// Function for just generating a random number used in place of an acct number
function generateNumberInString(): string {
  // Generate a number between 1,000,000,000 and 9,999,999,999
  const min = 1000000000;
  const max = 9999999999;
  const num: number = Math.floor(Math.random() * (max - min + 1)) + min;

  // Convert to string
  return num.toString();
}

// Worker to process jobs
const virtualAccountWorker = new Worker(
  "virtual-account-creation",
  async (job) => {
    const { userId } = job.data;
    const paystackService = new PaystackService();
    const userRepository = AppDataSource.getRepository(User);
    const accountRepository = AppDataSource.getRepository(Account);

    try {
      // Get user
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Check if virtual account already exists
      if (user.isVirtualAcctCreated)
        throw new AppError(`Virtual account already exists for user ${userId}`);

      log.info(`User found: ${user.email}`);

      /*

*/
      let dva: any;

      if (config.node_env === "development") {
        log.warn(
          `Using a mock Paystack DVA for user ${userId} in ${config.node_env} mode`,
        );
        dva = {
          account_number: generateNumberInString(),
          account_name: `${user.firstname} ${user.lastname}`,
          bank: { name: "Wema Bank" },
          recipient_code: null,
          customer: {
            customer_code: `CUS_mock_${user.id.slice(0, 8)}`,
          },
        };
      } else if (config.node_env === "production") {
        // Create virtual account with Paystack
        const paystackResponse = await paystackService.createVirtualAccount({
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          phonenumber: user.phonenumber,
          bvn: user.decryptData(user.bvn),
        });

        log.info(
          `Paystack response received: ${JSON.stringify(paystackResponse.data)}`,
        );
      } else {
        throw new AppError(
          "Environment could not be determined to work with Paystack API",
        );
      }

      // Create account record
      const account = accountRepository.create({
        userId: user.id,
        accountNumber: dva.account_number,
        paystackCustomerCode: dva.customer.customer_code,
        paystackRecipientCode: dva.recipient_code ?? null,
        paystackBankName: dva.bank?.name,
        accountName: dva.account_name,
        type: AccountType.VIRTUAL,
        status: AccountStatus.ACTIVE,
        paystackMetadata: {
          virtualAccountNumber: dva.account_number,
          virtualAccountBank: dva.bank?.name,
          virtualAccountName: dva.account_name,
          paystackCustomerCode: dva.customer.customer_code,
          assignmentDate: new Date(),
        },
      });

      // Explicitly link the user relation
      account.user = user;

      await accountRepository.save(account);

      // Update user
      user.account = account;
      user.isVirtualAcctCreated = true;
      await userRepository.save(user);

      log.info(`Virtual account created for user ${userId}`);
      return {
        success: true,
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          paystackBankName: account.paystackBankName,
          paystackCustomerCode: account.paystackCustomerCode,
          type: account.type,
          status: account.status,
        },
      };
    } catch (error) {
      throw new AppError(
        `Failed to create virtual account for user ${userId}: ${error}`,
      );
    }
  },
  { connection: connection },
);

// Handle worker events
virtualAccountWorker.on("completed", (job) => {
  log.info(`Job ${job.id} completed successfully`);
});

virtualAccountWorker.on("failed", (job, err) => {
  log.error(`Job ${job?.id} failed: ${err.message}`);
});

const vanQueueEvents = new QueueEvents("Paystack-Queues", {
  connection,
});

vanQueueEvents.on("completed", (jobId) => {
  log.info(`Job completed successfully: ${jobId}`);
});

vanQueueEvents.on("failed", (jobId, failedReson) => {
  log.error(`Job failed: ${jobId}, Reason: ${failedReson}`);
});

export default {
  virtualAccountWorker,
  queueVirtualAccountCreation,
  vanQueueEvents,
};
