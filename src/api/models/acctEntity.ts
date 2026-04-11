import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";

import { Loan } from "@/models/loanEntity";
import { Transaction } from "@/models/transactionEntity";
import { User } from "@/models/userEntity";
import { AccountType, AccountStatus } from "@/enums/user"

@Entity({ name: "accounts" })
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  @Column({ type: "varchar", nullable: false, unique: true })
  accountNumber: string;

// derived from the user's full name
  @Column({ type: "varchar", nullable: true })
  accountName: string;

// For transfers
  @Column({ type: "varchar", nullable: true, unique: true })
  paystackRecipientCode: string;

  // Paysack's ref for virtual acct
  @Column({ type: "varchar", nullable: true })
  paystackAccountId: string;

  @Column({ type: "varchar", nullable: true })
  paystackBankName: string;

  @Column({ type: "varchar", nullable: true })
  paystackBankcode: string;

  @Column({ type: "decimal", precision: 30, scale: 2, default: 0.0 })
  balance: number;

  @Column({ type: "decimal", precision: 30, scale: 2, default: 0.0 })
  ledgerBalance: number;

  @Column({ type: "enum", enum: AccountType, default: AccountType.SAVINGS })
  type: AccountType;

  @Column({ type: "enum", enum:AccountStatus, default: AccountStatus.PENDING })
  status: AccountStatus;

  @Column({ type: "jsonb", nullable: true })
  paystackMetadata: {
    virtualAccountNumber?: string;
    virtualAccountBank?: string;
    virtualAccountName?: string;
    assignmentDate?: Date;
    lastWebhookReceived?: Date;
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.account)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[];

  @OneToMany(() => Loan, (loan) => loan.account)
  loans: Loan[];

  // helper methd to check if the virtual acct is active 
  isVirtualAcctActive(): boolean {
    return (this.type === AccountType.VIRTUAL && 
      this.status === AccountStatus.ACTIVE && 
      !!this.accountNumber
      );
  }

  // helper to get virtual acct details
  getVirtualAcctDetails(){
    return {
      accountNumber: this.accountNumber,
      bankName: this.paystackBankName,
      accountName: this.accountName,
    }
  }
}
