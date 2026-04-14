// src/models/userEntity.ts
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

  @Column({ type: "varchar", nullable: false, unique: true })
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

  @Column({ type: "boolean", default: false })
  isEmailVerified: boolean;

  @Column({ type: "boolean", default: true })
  accountStatus: boolean;

  @Column({ type: "boolean", default: false })
  isVirtualAcctCreated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Transaction PIN reset fields
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

  @OneToOne(() => Account, (account) => account.user, { cascade: true })
  account: Account;

  @OneToMany(() => Payee, (payee) => payee.user)
  payees: Payee[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @OneToMany(() => Loan, (loan) => loan.user)
  loans: Loan[];

  // Computed property for full name
  get fullName(): string {
    return `${this.firstname} ${this.middlename ? this.middlename + " " : ""}${this.lastname}`;
  }

  // Methods
  async compareTransactionPin(pin: string): Promise<boolean> {
    return bcrypt.compare(pin, this.transaction_pin);
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  @BeforeInsert()
  async generateId() {
    this.id = uuidv4();
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashTransactionPin() {
    if (this.transaction_pin && !this.transaction_pin.startsWith("$2")) {
      const saltRounds = 12;
      this.transaction_pin = await bcrypt.hash(
        this.transaction_pin,
        saltRounds,
      );
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith("$2")) {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  encryptSensitiveData() {
    if (this.bvn && !this.bvn.includes(":")) {
      this.bvn = this.encryptData(this.bvn);
    }
    if (this.nin && this.nin && !this.nin.includes(":")) {
      this.nin = this.encryptData(this.nin);
    }
  }

  createPasswordResetToken(): string {
    const otp = crypto.randomBytes(3).toString("hex");
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
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
