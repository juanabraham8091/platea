import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}

export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

export class MfaActivateDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(128)
  newPassword!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
