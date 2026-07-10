import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Transaction, TransactionType } from './transaction.entity';

export interface RecordTransactionInput {
  tenantId: string;
  planId?: string | null;
  licenseId?: string | null;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  type: TransactionType;
  note?: string | null;
  recordedByAdminEmail?: string | null;
}

export interface TransactionSummary {
  monthToDate: number;
  yearToDate: number;
  byCycle: { monthly: number; yearly: number };
  last12Months: { month: string; total: number }[];
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
  ) {}

  /**
   * Best-effort by design — bookkeeping must never block the renew/change-plan
   * action it's recording. Same tradeoff as LicenseService.pushEntitlements().
   */
  async record(input: RecordTransactionInput): Promise<Transaction | null> {
    try {
      const tx = this.repo.create({
        tenantId: input.tenantId,
        planId: input.planId ?? null,
        licenseId: input.licenseId ?? null,
        amount: input.amount,
        billingCycle: input.billingCycle,
        type: input.type,
        note: input.note ?? null,
        recordedByAdminEmail: input.recordedByAdminEmail ?? null,
      });
      return await this.repo.save(tx);
    } catch (err) {
      this.logger.warn(`Failed to record transaction for tenant ${input.tenantId}: ${(err as Error).message}`);
      return null;
    }
  }

  async listAll(filters?: { tenantId?: string; from?: string; to?: string }): Promise<Transaction[]> {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.from && filters?.to) {
      where.createdAt = Between(new Date(filters.from), new Date(`${filters.to}T23:59:59.999Z`));
    }
    return this.repo.find({ where, relations: ['tenant', 'plan'], order: { createdAt: 'DESC' } });
  }

  async listForTenant(tenantId: string): Promise<Transaction[]> {
    return this.repo.find({ where: { tenantId }, relations: ['plan'], order: { createdAt: 'DESC' } });
  }

  async getSummary(): Promise<TransactionSummary> {
    const all = await this.repo.find();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const monthToDate = all
      .filter((t) => t.createdAt >= monthStart)
      .reduce((s, t) => s + Number(t.amount), 0);
    const yearToDate = all
      .filter((t) => t.createdAt >= yearStart)
      .reduce((s, t) => s + Number(t.amount), 0);

    const byCycle = { monthly: 0, yearly: 0 };
    for (const t of all) byCycle[t.billingCycle] += Number(t.amount);

    const monthMap = new Map<string, number>();
    for (const t of all) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(t.amount));
    }
    const last12Months = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, total]) => ({ month, total }));

    return { monthToDate, yearToDate, byCycle, last12Months };
  }
}
