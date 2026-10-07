import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; version: string; status: string } {
    return {
      message: 'Readers Club API is running',
      version: '1.0.0',
      status: 'online',
    };
  }
}
