import { randomBytes } from 'crypto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignupRequest } from './signup-request.entity';
import { ApproveSignupRequestDto, CreateSignupRequestDto, RejectSignupRequestDto } from './dto';
import { Tenant, BusinessType } from '../tenants/tenant.entity';
import { TenantsService } from '../tenants/tenants.service';
import { PosApiClient } from '../../common/clients/pos-api.client';
import { MailerService } from '../../common/mailer/mailer.service';
import { generateTempPassword } from '../../common/utils/generate-password';

/** Maps the landing page's human-readable category label to the canonical POS business type. */
const LABEL_TO_BUSINESS_TYPE: Partial<Record<string, BusinessType>> = {
  'Retail POS': 'retail',
  'Restaurant POS': 'restaurant',
  'Pharmacy POS': 'pharmacy',
};

function deriveSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'business';
  return `${base}-${randomBytes(2).toString('hex')}`;
}

@Injectable()
export class SignupRequestsService {
  private readonly logger = new Logger(SignupRequestsService.name);

  constructor(
    @InjectRepository(SignupRequest) private readonly repo: Repository<SignupRequest>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly tenantsService: TenantsService,
    private readonly posApiClient: PosApiClient,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateSignupRequestDto): Promise<{ id: string; message: string }> {
    const pending = await this.repo.findOneBy({ email: dto.email, status: 'pending' });
    if (pending) {
      throw new ConflictException('A request with this email is already pending review — no need to submit again.');
    }

    const saved = await this.repo.save(this.repo.create({ ...dto, status: 'pending' }));
    this.logger.log(`New signup request: "${dto.businessName}" <${dto.email}> (${saved.id})`);
    return { id: saved.id, message: "Thanks! Our team will review your request and be in touch shortly." };
  }

  findAll(status?: SignupRequest['status']): Promise<SignupRequest[]> {
    return this.repo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SignupRequest> {
    const request = await this.repo.findOneBy({ id });
    if (!request) throw new NotFoundException(`Signup request ${id} not found`);
    return request;
  }

  async approve(
    id: string,
    dto: ApproveSignupRequestDto,
    adminId: string | null,
  ): Promise<{ request: SignupRequest; tenant: Tenant; accountCreated: boolean; emailSent: boolean; emailError?: string }> {
    const request = await this.findOne(id);
    if (request.status !== 'pending') {
      throw new ConflictException(`This request was already ${request.status}.`);
    }

    const provisionPos = dto.provisionPos ?? true;
    const businessType = dto.businessTypeOverride ?? LABEL_TO_BUSINESS_TYPE[request.businessType];

    if (provisionPos && !businessType) {
      throw new BadRequestException(
        `"${request.businessType}" doesn't map to a POS business type automatically — ` +
        `pass businessTypeOverride to approve this request (or provisionPos: false to just record it as approved).`,
      );
    }
    if (provisionPos && !this.posApiClient.isConfigured) {
      throw new BadRequestException(
        'CLOUD_POS_API_URL / CONTROL_PANEL_API_KEY are not configured — cannot provision a POS login from here.',
      );
    }

    const trialDays = dto.trialDays ?? this.config.get<number>('DEFAULT_TRIAL_DAYS', 14);
    const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);
    const password = generateTempPassword();

    const result = await this.tenantsService.create({
      businessName: request.businessName,
      email: request.email,
      phone: request.phone,
      planId: dto.planId,
      notes: request.note ?? undefined,
      businessType: businessType ?? undefined,
      autoIssueLicense: { expiresAt: trialEndsAt.toISOString() },
      ...(provisionPos
        ? { slug: dto.slug ?? deriveSlug(request.businessName), businessType, adminPassword: password, adminFullName: request.fullName }
        : {}),
    });

    await this.tenantRepo.update(result.tenant.id, { trialEndsAt });
    const tenant = await this.tenantRepo.findOneByOrFail({ id: result.tenant.id });

    await this.repo.update(id, {
      status: 'approved',
      reviewedAt: new Date(),
      reviewedByAdminId: adminId,
      tenantId: result.tenant.id,
    });

    const accountCreated = !!result.posProvision;
    let emailSent = false;
    let emailError: string | undefined;

    if (accountCreated) {
      try {
        await this.mailer.sendWelcomeEmail({
          to: request.email,
          businessName: request.businessName,
          loginUrl: this.config.get<string>('FRONTEND_LOGIN_URL', 'https://app.pointsell.app/login'),
          email: request.email,
          password,
          trialEndsAt,
          planName: request.planName,
        });
        emailSent = true;
      } catch (err) {
        emailError = (err as Error).message;
        this.logger.error(`Welcome email failed for ${request.email}: ${emailError}`);
      }
    }

    return { request: await this.findOne(id), tenant, accountCreated, emailSent, emailError };
  }

  async reject(id: string, dto: RejectSignupRequestDto, adminId: string | null): Promise<SignupRequest> {
    const request = await this.findOne(id);
    if (request.status !== 'pending') {
      throw new ConflictException(`This request was already ${request.status}.`);
    }

    await this.repo.update(id, {
      status: 'rejected',
      rejectionReason: dto.reason ?? null,
      reviewedAt: new Date(),
      reviewedByAdminId: adminId,
    });

    try {
      await this.mailer.sendRejectionEmail({ to: request.email, businessName: request.businessName, reason: dto.reason });
    } catch (err) {
      this.logger.error(`Rejection email failed for ${request.email}: ${(err as Error).message}`);
    }

    return this.findOne(id);
  }
}
