import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { USER_REPOSITORY, UserRepository } from './user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [{ provide: USER_REPOSITORY, useClass: UserRepository }],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
