import crypto from "crypto";

import * as bcrypt from "bcryptjs";
import Cryptojs from "crypto-js";
import {
  Entity,
  Column,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  OneToOne,
  // JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { UserRole, GenderType } from "@/enums/user";
import { Account } from "@/models/acctEntity";
import { Loan } from "@/models/loanEntity";
import { Payee } from "@/models/payeeEntity";
import { Token } from "@/models/tokenEntity";
import { Transaction } from "@/models/transactionEntity";

@Entity({ name: "Users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: false })
  firstname: string;

  @Column({ type: "varchar", nullable: true })
  middlename: string;

  @Column({ type: "varchar", nullable: false })
  lastname: string;

  @Column({ type: "varchar", nullable: false })
  username: string;

  @Column({ type: "varchar", unique: true, nullable: false })
  phonenumber: string;

  @Column({ type: "varchar", unique: true, nullable: false })
  email: string;

  @Column({ type: "date", nullable: false })
  date_of_birth: Date;

  @Column({ type: "varchar", nullable: false })
  password: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  transaction_pin: string;

  @Column({ type: "varchar", unique: true, length: 255, nullable: true })
  nin: string;

  @Column({ type: "varchar", unique: true, length: 255, nullable: false })
  bvn: string;

  @Column({ type: "enum", enum: GenderType, nullable: false })
  gender: GenderType;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.CUSTOMER,
    nullable: false,
  })
  role: UserRole;

  @Column({ type: "timestamp", nullable: true })
  passwordChangedAt: Date;

  @Column({ type: "varchar", nullable: true })
  passwordResetToken: string;

  @Column({ type: "timestamp", nullable: true })
  passwordResetExpires: Date;

  @Column({ type: "int", default: 0 })
  passwordResetAttempts: number;

  @Column({ type: "varchar", unique: true, nullable: true })
  account_no: string;

  @Column({ type: "boolean", nullable: true })
  isEmailVerified: boolean;

  @Column({ type: "boolean", nullable: true })
  accountStatus: boolean;

  // @BeforeInsert()
  // generateAccountName() {
  //   this.accountName = `${this.firstName} ${this.middleName} ${this.lastName}`
  // }

  // @BeforeInsert()
  // generateAccountID() {
  //   this.account_no = this.phoneNumber;
  // }

  @BeforeInsert()
  async generateId() {
    this.id = uuidv4();
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  transactionPinResetExpires: Date;

  @Column({ type: "int", default: 0 })
  transaction_pinResetAttempts: number;

  @Column({ type: "varchar", nullable: true })
  transactionPinResetToken: string;

  @Column({ nullable: true, type: "timestamp" })
  transactionPinTokenExpires: Date;

  @Column({ type: "int", default: 0 })
  transactionResetAttempts: number;

  @OneToOne(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => Payee, (payee) => payee.user)
  payees: Payee[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @OneToMany(() => Loan, (loan) => loan.user)
  loans: Loan[];

  async compareTransactionPin(pin: string): Promise<boolean> {
    return bcrypt.compare(pin, this.transaction_pin);
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashTransactionPin() {
    if (this.transaction_pin) {
      const saltRounds = 12;
      this.transaction_pin = await bcrypt.hash(
        this.transaction_pin,
        saltRounds,
      );
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  encryptSensitiveData() {
    if (this.bvn) {
      this.bvn = this.encryptData(this.bvn);
    }
    if (this.nin) {
      this.nin = this.encryptData(this.nin);
    }
  }

  // decryptSensitiveData() {
  //   if(this.bvn) this.bvn = this.decryptData(this.bvn)
  // }

  /*   @BeforeInsert()
  @BeforeUpdate()
  syncAccountNoWithWallet() {
    if (this.wallet) {
      this.account_no =
        this.wallet.virtualAccountNumber || "Temporary_ACCOUNT_NO";
    }
  } */

  createPasswordResetToken(): string {
    const otp = crypto.randomBytes(3).toString("hex");
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    this.passwordResetAttempts = 0;
    return otp;
  }

  changedPasswordAfter(JWTTimestamp: number): boolean {
    if (this.passwordChangedAt) {
      const changedTimestamp = Math.floor(
        this.passwordChangedAt.getTime() / 1000,
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  }

  encryptData = (data: string): string => {
    return Cryptojs.AES.encrypt(data, process.env.ENCRYPTION_KEY!).toString();
  };

  decryptData = (encryptedData: string): string => {
    const bytes = Cryptojs.AES.decrypt(
      encryptedData,
      process.env.ENCRYPTION_KEY!,
    );
    return bytes.toString(Cryptojs.enc.Utf8);
  };
}
