import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'];
    const contentType = headers['content-type'];

    const startTime = Date.now();

    this.logger.debug({
      message: 'Incoming request',
      method,
      url,
      ip,
      userAgent,
      contentType,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.debug({
            message: 'Request completed',
            method,
            url,
            ip,
            statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error({
            message: 'Request failed',
            method,
            url,
            ip,
            statusCode,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
      }),
    );
  }
}
