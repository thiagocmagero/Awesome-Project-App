import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(errorCode: string, status: HttpStatus) {
    super({ error_code: errorCode, statusCode: status }, status);
  }
}
