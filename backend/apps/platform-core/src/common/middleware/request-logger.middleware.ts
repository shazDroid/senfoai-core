import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { ip, method, originalUrl } = req;
        const userAgent = req.get('user-agent') || '';
        const start = Date.now();

        // Add Trace ID
        const traceId = randomUUID();
        req['traceId'] = traceId;
        res.setHeader('X-Trace-Id', traceId);

        res.on('finish', () => {
            const { statusCode } = res;
            const contentLength = res.get('content-length');
            const duration = Date.now() - start;

            this.logger.log({
                traceId,
                method,
                url: originalUrl,
                statusCode,
                contentLength,
                userAgent,
                ip,
                duration: `${duration}ms`
            });
        });

        next();
    }
}
