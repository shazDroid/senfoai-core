// apps/platform-core/src/common/utils/debug-logger.ts
// Debug logging utility - controls all dev logs based on DEBUG_MODE flag
// Only audit logs (stored in MongoDB) bypass this - they go through AuditService

import { Logger } from '@nestjs/common';

/**
 * Check if we're in debug mode
 * Debug mode is enabled when:
 * - NODE_ENV is NOT 'production' AND
 * - DEBUG_MODE is 'true'
 */
const isDebugMode = (): boolean => {
    return process.env.NODE_ENV !== 'production' && process.env.DEBUG_MODE === 'true';
};

/**
 * Check if we're in production mode
 */
const isProduction = (): boolean => {
    return process.env.NODE_ENV === 'production';
};

/**
 * DebugLogger - Controls all development logs
 * 
 * In PRODUCTION mode (NODE_ENV=production):
 * - Only errors are logged
 * - All other logs are suppressed
 * 
 * In DEVELOPMENT mode with DEBUG_MODE=false:
 * - Only errors and warnings are logged
 * - Info/debug logs are suppressed
 * 
 * In DEVELOPMENT mode with DEBUG_MODE=true:
 * - ALL logs are shown including detailed debug info
 */
export class DebugLogger {
    private logger: Logger;
    private context: string;

    constructor(context: string) {
        this.logger = new Logger(context);
        this.context = context;
    }

    /**
     * Log info message - only in dev mode with DEBUG_MODE=true
     * Use this for general operational logs
     */
    log(message: string, ...optionalParams: any[]) {
        if (isDebugMode()) {
            this.logger.log(message, ...optionalParams);
        }
    }

    /**
     * Log debug info - only in dev mode with DEBUG_MODE=true
     * Use this for detailed debugging information
     */
    debug(message: string, ...optionalParams: any[]) {
        if (isDebugMode()) {
            this.logger.debug(`[DEBUG] ${message}`, ...optionalParams);
        }
    }

    /**
     * Log warning - in dev mode or if DEBUG_MODE=true
     * Warnings are shown in dev but suppressed in production
     */
    warn(message: string) {
        if (!isProduction()) {
            this.logger.warn(message);
        }
    }

    /**
     * Log error - ALWAYS logged regardless of mode
     * Errors are critical and should always be visible
     */
    error(message: string, trace?: string) {
        this.logger.error(message, trace);
    }

    /**
     * Log detailed step info - only in dev mode with DEBUG_MODE=true
     * Use for pipeline step tracking
     */
    step(stepName: string, details?: Record<string, any>) {
        if (isDebugMode()) {
            const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
            this.logger.log(`[STEP] ${stepName}${detailsStr}`);
        }
    }

    /**
     * Log timing info for performance debugging - only in debug mode
     */
    timing(operation: string, startTime: number) {
        if (isDebugMode()) {
            const duration = Date.now() - startTime;
            this.logger.log(`[TIMING] ${operation} completed in ${duration}ms`);
        }
    }

    /**
     * Log file operation details - only in debug mode
     */
    fileOp(operation: string, path: string, details?: Record<string, any>) {
        if (isDebugMode()) {
            const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
            this.logger.log(`[FILE] ${operation}: ${path}${detailsStr}`);
        }
    }

    /**
     * Log FTP operation details - only in debug mode
     */
    ftpOp(operation: string, details?: Record<string, any>) {
        if (isDebugMode()) {
            const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
            this.logger.log(`[FTP] ${operation}${detailsStr}`);
        }
    }

    /**
     * Log Git operation details - only in debug mode
     */
    gitOp(operation: string, details?: Record<string, any>) {
        if (isDebugMode()) {
            const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
            this.logger.log(`[GIT] ${operation}${detailsStr}`);
        }
    }

    /**
     * Log important info that should show even without full debug mode
     * Still suppressed in production
     */
    info(message: string) {
        if (!isProduction()) {
            this.logger.log(`[INFO] ${message}`);
        }
    }
}

export const createDebugLogger = (context: string) => new DebugLogger(context);

