import { DataSource } from "typeorm";

import config from "@/api/helpers/config/env";
import { Account } from "@/models/acctEntity";
import { Loan } from "@/models/loanEntity";
import { Payee } from "@/models/payeeEntity";
import { Token } from "@/models/tokenEntity";
import { Transaction } from "@/models/transactionEntity";
import { User } from "@/models/userEntity";

const TestDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.db_user,
  password: config.db.db_password,
  database: config.db.db_name,
  entities: [User, Account, Transaction, Loan, Payee, Token],
  synchronize: true,
  dropSchema: true,
  logging: false,
});

export { TestDataSource };
