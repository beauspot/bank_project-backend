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

  @Column({ type: "decimal", precision: 30, scale: 2, default: 0.0 })
  balance: number;

  @Column({ type: "varchar", nullable: false })
  type: string; // e.g., 'savings', 'current', etc.

  @Column({ type: "enum", enum:AccountStatus, default: AccountStatus.PENDING })
  status: string; // e.g., 'active', 'inactive', 'blocked'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[];

  @OneToMany(() => Loan, (loan) => loan.account)
  loans: Loan[];
}
