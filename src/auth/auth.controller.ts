import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { Request } from 'express';
import { RolesEnum } from 'src/factory/enums/roles.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthService } from './auth.service';
import { GetToken } from './decorators/get-token.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ConfirmCodeDto } from './dtos/confirmcode.dto';
import { ForgetPasswordDto } from './dtos/forgetpassword.dto';
import { ResetPasswordDto } from './dtos/resetpassword.dto';
import { SigninDto } from './dtos/signin.dto';
import { SignupDto } from './dtos/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  //   Sign up route
  @Post('signup')
  signUp(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  //   Sign in route
  @Post('signin')
  signin(@Body() signinDto: SigninDto) {
    return this.authService.signin(signinDto);
  }

  //   Forget password route (with email)
  @Post('forgetpassword')
  forgetPassword(@Body() forgetPassword: ForgetPasswordDto) {
    return this.authService.forgetPassword(forgetPassword);
  }

  // Confirm code
  @Post('confirmcode')
  confirmCode(@Body() confirmCodeDto: ConfirmCodeDto) {
    return this.authService.confirmCode(confirmCodeDto);
  }

  //   Create new password route
  @Post('resetpassword')
  resetPassword(@Body() resetPassword: ResetPasswordDto) {
    return this.authService.resetPassword(resetPassword);
  }

  //   @UseGuards(JwtGuard)
  //   @Get('test')
  //   test() {
  //     return 'test';
  //   }

  //   @UseGuards(JwtGuard)
  //   @Get('logout')
  //   logout(@Req() req: Request) {
  //     // console.log(req.headers);
  //     // console.log(user);
  //     // return this.authService.logout();
  //   }
}
