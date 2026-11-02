import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './user.schema';

const DUPLICATE_KEY = 11000;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserDocument> {
    try {
      return await this.users.create({ ...data, emailVerifiedAt: null });
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.users.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  /** Returns the user if this call verified them, null if already verified. */
  markEmailVerified(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.users
      .findOneAndUpdate(
        { _id: id, emailVerifiedAt: null },
        { $set: { emailVerifiedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  /** Includes the password hash, for login only. */
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.users
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .exec();
  }
}
