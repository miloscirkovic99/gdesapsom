import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError, timeout } from 'rxjs/operators';


@Injectable()
export class DdosProtectionInterceptor implements HttpInterceptor {
  private requestCache = new Map<string, Observable<any>>();
  private failedRequests = new Map<string, number>();
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly CIRCUIT_BREAK_THRESHOLD = 5; // Circuit breaks after 5 failures
  private readonly CIRCUIT_BREAK_DURATION = 60000; // 1 minute

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const requestKey = `${req.method}:${req.url}`;

    // Check if request is in circuit breaker state
    if (this.isCircuitBreakerOpen(requestKey)) {
      return throwError(
        () => new Error('Service temporarily unavailable - circuit breaker open')
      );
    }

    // Check cache for GET requests (deduplication)
    if (req.method === 'GET' && this.requestCache.has(requestKey)) {
      const cachedRequest = this.requestCache.get(requestKey);
      if (cachedRequest) {
        return cachedRequest;
      }
    }

    // Add security headers to all requests
    const secureReq = this.addSecurityHeaders(req);

    // Execute request with protection mechanisms
    const request$ = next.handle(secureReq).pipe(
      // Timeout protection: requests must complete within 30 seconds
      timeout(this.REQUEST_TIMEOUT),

      // Automatic retry with exponential backoff
      retry({
        count: this.MAX_RETRIES,
        delay: (error, retryCount) => {
          // Only retry on specific errors (5xx, network errors)
          if (
            error instanceof HttpErrorResponse &&
            error.status >= 500
          ) {
            const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.warn(
              `[DDoS Protection] Retrying request ${retryCount}/${this.MAX_RETRIES} after ${delayMs}ms`,
              requestKey
            );
            return new Promise(resolve => setTimeout(resolve, delayMs));
          }
          throw error;
        }
      }),

      // Error handling
      catchError((error) => {
        // Track failed requests for circuit breaker
        this.trackFailedRequest(requestKey);

        // Log security-relevant errors
        if (error instanceof HttpErrorResponse) {
          if (error.status === 429) {
            console.warn('[DDoS Protection] Rate limit exceeded:', requestKey);
          } else if (error.status >= 500) {
            console.error('[DDoS Protection] Server error:', error.status, requestKey);
          }
        }

        return throwError(() => error);
      })
    );

    // Cache GET requests for deduplication
    if (req.method === 'GET') {
      this.requestCache.set(requestKey, request$);
      setTimeout(() => {
        this.requestCache.delete(requestKey);
      }, this.CACHE_DURATION);
    }

    return request$;
  }

  /**
   * Add security headers to all requests
   * Note: Only add headers that are universally supported by CORS
   */
  private addSecurityHeaders(req: HttpRequest<any>): HttpRequest<any> {
    // Only add X-Requested-With which is widely supported by most APIs
    // X-Request-ID causes CORS issues with external APIs that don't explicitly allow it
    return req.clone({
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  }

 
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }


  private trackFailedRequest(requestKey: string): void {
    const failures = (this.failedRequests.get(requestKey) || 0) + 1;
    this.failedRequests.set(requestKey, failures);

    if (failures >= this.CIRCUIT_BREAK_THRESHOLD) {
      console.error(
        `[DDoS Protection] Circuit breaker opened for: ${requestKey}`
      );
      setTimeout(() => {
        this.failedRequests.delete(requestKey);
      }, this.CIRCUIT_BREAK_DURATION);
    }
  }

  private isCircuitBreakerOpen(requestKey: string): boolean {
    const failures = this.failedRequests.get(requestKey) || 0;
    return failures >= this.CIRCUIT_BREAK_THRESHOLD;
  }
}


@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private requests = new Map<string, number[]>();
  private readonly MAX_REQUESTS = 30;
  private readonly TIME_WINDOW = 60000; 

  isRequestAllowed(key: string = 'global'): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.TIME_WINDOW
    );

    if (recentRequests.length >= this.MAX_REQUESTS) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(key: string = 'global'): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.TIME_WINDOW
    );
    return Math.max(0, this.MAX_REQUESTS - recentRequests.length);
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilReset(key: string = 'global'): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    const resetTime = oldestRequest + this.TIME_WINDOW;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Reset rate limiter
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * DDoS Protection Service
 * Monitors and manages DDoS protection strategies
 */
@Injectable({
  providedIn: 'root'
})
export class DdosProtectionService {
  private isUnderAttack = false;
  private attackMetrics = {
    startTime: 0,
    requestCount: 0,
    errorCount: 0
  };
  private readonly ATTACK_THRESHOLD = 100; // Requests in 30 seconds
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor(private rateLimiter: RateLimiterService) {
    this.startMonitoring();
  }

  /**
   * Start monitoring for DDoS attacks
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.checkAttackStatus();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Check if system is under attack
   */
  private checkAttackStatus(): void {
    const now = Date.now();
    const timeSinceStart = now - this.attackMetrics.startTime;

    if (timeSinceStart > this.CHECK_INTERVAL) {
      // Calculate average requests per second
      const avgRps = this.attackMetrics.requestCount / (timeSinceStart / 1000);
      const errorRate =
        this.attackMetrics.requestCount > 0
          ? this.attackMetrics.errorCount / this.attackMetrics.requestCount
          : 0;

      // Determine if under attack
      this.isUnderAttack = avgRps > 10 || errorRate > 0.1; // > 10 RPS or > 10% error rate

      if (this.isUnderAttack) {
        console.warn(
          '[DDoS Protection] Possible DDoS attack detected!',
          { avgRps, errorRate }
        );
      }

      // Reset metrics
      this.attackMetrics = {
        startTime: now,
        requestCount: 0,
        errorCount: 0
      };
    }
  }

  /**
   * Record a request
   */
  recordRequest(success: boolean = true): void {
    this.attackMetrics.requestCount++;
    if (!success) {
      this.attackMetrics.errorCount++;
    }
  }

  /**
   * Get attack status
   */
  isUnderDDoSAttack(): boolean {
    return this.isUnderAttack;
  }

  /**
   * Activate protection mode
   */
  activateProtectionMode(): void {
    console.warn('[DDoS Protection] Protection mode activated');
    // Implement protection measures
    // - Show CAPTCHA
    // - Reduce feature availability
    // - Enable aggressive rate limiting
  }

  /**
   * Deactivate protection mode
   */
  deactivateProtectionMode(): void {
    console.info('[DDoS Protection] Protection mode deactivated');
    // Resume normal operation
  }
}
