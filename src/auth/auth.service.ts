import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import { ConfirmCodeDto } from './dtos/confirmcode.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}
  savetokenpass = '';

  // Sign up new User
  async signup(signupDto: any) {
    try {
      // check if passwords match
      if (signupDto.password !== signupDto.passwordConfirm)
        throw new HttpException(
          'Passwords does not match!',
          HttpStatus.BAD_REQUEST,
        );

      delete signupDto.passwordConfirm;

      //   Hashing the password
      signupDto.password = await bcrypt.hash(signupDto.password, 10);

      //   Create new user in resetPasswordbase
      const newUser = await this.prisma.user.create({
        data: { ...signupDto },
      });

      delete newUser.password;

      return newUser;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('Internal Error!');
      }
      throw err;
    }
  }

  //   sign in with an existing user
  async signin(signinDto: any) {
    try {
      // Get user by email
      const user = await this.prisma.user.findUnique({
        where: { email: signinDto.email },
      });

      //   Check if user exists with provided  email
      if (!user) throw new NotFoundException('Wrong Email or Password!');

      //   Check if provided email & password are a match
      const passCheck = await bcrypt.compare(signinDto.password, user.password);
      if (!passCheck) throw new NotFoundException('Wrong Email or Password!');

      const jwt = await this.signToken(user.id, user.email);

      await this.prisma.user.updateMany({
        where: { email: signinDto.email },
        data: {
          jwt,
        },
      });

      return { message: 'Logged In Successfully.', jwt };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('Internal Error!');
      }
      throw err;
    }
  }

  async forgetPassword(forgetPasswordDto: any) {
    try {
      // Find a user by email
      const checkUser = await this.prisma.user.findUnique({
        where: {
          email: forgetPasswordDto.email,
        },
      });

      // Check if user exists
      if (!checkUser) throw new NotFoundException('Wrong Email!');

      // Create reset code, encrypt it, then store it in db
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(resetCode);
      const token = await this.encrypt(
        resetCode,
        this.config.get('ENCRYPT_CODE_PASS'),
      );

      const date = Date.now() + 10 * 60 * 1000;

      // save encrypted code in db
      const user = await this.prisma.user.update({
        where: {
          email: forgetPasswordDto.email,
        },

        data: {
          resetPasswordToken: token,
          resetExpiresTime: new Date(date),
        },
      });
      // let message= fs.readFileSync(path.join(__dirname,'../../email/forgetPassword.html'),"utf-8")
      // message= message.replace("<token>",`${resetCode}`)

      // Sending mail with reset code
      const testMsg = `this is reste code ${resetCode}`;
      await this.emailService.sendEmail(
        user.email,
        'Camere-Store Password Reset Code',
        testMsg,
      );

      return { message: `check code in your email: ${user.email}` };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('Internal Error!');
      }
      throw err;
    }
  }

  async confirmCode(data: ConfirmCodeDto) {
    try {
      const hashedToken = await this.encrypt(
        data.code,
        this.config.get('ENCRYPT_CODE_PASS'),
      );
      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: hashedToken,
        },
      });
      if (!user) throw new Error(' wrong code');
      this.savetokenpass = user.resetPasswordToken;
      const date = Date.now();
      if (user.resetExpiresTime < new Date(date))
        throw new Error(' the code has expierd try agin');
      return { message: 'success' };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async resetPassword(resetPassword: any) {
    try {
      if (resetPassword.password != resetPassword.passwordConfirm)
        throw new BadRequestException('password not match');

      const hashedPassword = await bcrypt.hash(resetPassword.password, 10);
      console.log(resetPassword.password, hashedPassword);
      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: this.savetokenpass,
        },
      });
      await this.prisma.user.update({
        where: {
          email: user.email,
        },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetExpiresTime: null,
        },
      });
      this.savetokenpass = null;

      return { message: 'Password reseted successfully.' };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException('Internal Error!');
      }
      throw err;
    }
  }

  // create jwt
  async signToken(userId: string, email: string) {
    const payload = {
      userId,
      email,
    };

    const jwt = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });

    return jwt;
  }

  // encryption functoin
  async encrypt(text: string, secretKey: string) {
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    console.log('e' + encrypted);
    return encrypted;
  }
}