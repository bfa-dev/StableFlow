import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { AuthAttempt } from './entities/auth-attempt.entity';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  AuthResponseDto,
  UserProfileDto,
} from './dto/auth.dto';

@Injectable()
export class AuthServiceService {
  private readonly logger = new Logger(AuthServiceService.name);
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    @InjectRepository(AuthAttempt)
    private authAttemptRepository: Repository<AuthAttempt>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string): Promise<AuthResponseDto> {
    const { email, password, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      password_hash,
      role: role || UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);
    
    // Log successful registration
    await this.logAuthAttempt(email, ipAddress, true, savedUser.id);
    
    this.logger.log(`User registered successfully: ${email}`);

    // Generate tokens
    return this.generateAuthResponse(savedUser, ipAddress);
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      await this.logAuthAttempt(email, ipAddress, false, null, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.status === UserStatus.LOCKED && user.locked_until && user.locked_until > new Date()) {
      await this.logAuthAttempt(email, ipAddress, false, user.id, 'Account locked');
      throw new UnauthorizedException('Account is temporarily locked due to multiple failed attempts');
    }

    // Check if account is active
    if (user.status !== UserStatus.ACTIVE) {
      await this.logAuthAttempt(email, ipAddress, false, user.id, 'Account inactive');
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    if (user.failed_attempts > 0) {
      await this.userRepository.update(user.id, {
        failed_attempts: 0,
        locked_until: null,
        status: UserStatus.ACTIVE,
      });
    }

    // Update last login
    await this.userRepository.update(user.id, { last_login: new Date() });
    
    // Log successful login
    await this.logAuthAttempt(email, ipAddress, true, user.id);
    
    this.logger.log(`User logged in successfully: ${email}`);

    // Generate tokens
    return this.generateAuthResponse(user, ipAddress, userAgent);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string): Promise<AuthResponseDto> {
    const { refresh_token } = refreshTokenDto;

    // Find active session
    const session = await this.sessionRepository.findOne({
      where: {
        refresh_token,
        is_active: true,
        expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if user is still active
    if (session.user.status !== UserStatus.ACTIVE) {
      await this.sessionRepository.update(session.id, { is_active: false });
      throw new UnauthorizedException('User account is not active');
    }

    // Deactivate old session
    await this.sessionRepository.update(session.id, { is_active: false });

    // Generate new tokens
    return this.generateAuthResponse(session.user, ipAddress);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.update(
      { refresh_token: refreshToken },
      { is_active: false }
    );
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { current_password, new_password } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await this.userRepository.update(userId, { password_hash: new_password_hash });
    
    // Deactivate all user sessions to force re-login
    await this.sessionRepository.update(
      { user_id: userId },
      { is_active: false }
    );

    this.logger.log(`Password changed for user ID: ${userId}`);
  }

  async getProfile(userId: number): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      last_login: user.last_login,
      created_at: user.created_at,
    };
  }

  async validateUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
    });
  }

  private async generateAuthResponse(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Save refresh token session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionRepository.save({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async handleFailedLogin(user: User, ipAddress?: string): Promise<void> {
    const failedAttempts = user.failed_attempts + 1;
    
    let updateData: Partial<User> = { failed_attempts: failedAttempts };
    
    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_DURATION_MINUTES);
      
      updateData = {
        ...updateData,
        status: UserStatus.LOCKED,
        locked_until: lockUntil,
      };
      
      this.logger.warn(`Account locked for user ID: ${user.id} due to ${failedAttempts} failed attempts`);
    }
    
    await this.userRepository.update(user.id, updateData);
    await this.logAuthAttempt(user.email, ipAddress, false, user.id, 'Invalid password');
  }

  private async logAuthAttempt(
    email: string,
    ipAddress?: string,
    success: boolean = false,
    userId?: number,
    failureReason?: string,
  ): Promise<void> {
    await this.authAttemptRepository.save({
      user_id: userId,
      email,
      ip_address: ipAddress || 'unknown',
      success,
      failure_reason: failureReason,
    });
  }
}
