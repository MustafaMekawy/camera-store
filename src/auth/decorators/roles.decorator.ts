import { SetMetadata } from '@nestjs/common';
import { RolesEnum } from '../../factory/enums/roles.enum';

export const Roles = (...roles: RolesEnum[]) => SetMetadata('roles', roles);
