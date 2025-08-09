import { BrowserWindow, session, app, shell } from 'electron';
import * as path from 'path';

/**
 * Security configuration for the Electron application
 * Implements defense-in-depth with multiple security layers
 */

// Content Security Policy configuration
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Vite in dev
  "style-src 'self' 'unsafe-inline'",  // unsafe-inline for inline styles
  "img-src 'self' data: blob:",        // data: for inline SVGs, blob: for generated images
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: http://localhost:* https://localhost:*", // For dev server
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "block-all-mixed-content",
  "upgrade-insecure-requests"
];

// Production CSP (stricter)
const CSP_PRODUCTION = CSP_DIRECTIVES.filter(
  directive => !directive.includes('localhost') && !directive.includes('ws:')
).join('; ');

// Development CSP (allows localhost and WebSocket for hot reload)
const CSP_DEVELOPMENT = CSP_DIRECTIVES.join('; ');

export class SecurityManager {
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Apply Content Security Policy headers to window
   */
  applyCSP(window: BrowserWindow): void {
    window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            this.isDevelopment ? CSP_DEVELOPMENT : CSP_PRODUCTION
          ],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['strict-origin-when-cross-origin']
        }
      });
    });
  }

  /**
   * Configure permission policies for the window
   */
  configurePermissions(window: BrowserWindow): void {
    // Handle permission requests
    window.webContents.session.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        const allowedPermissions: string[] = [
          'clipboard-read',
          'clipboard-write',
          'fullscreen'
        ];

        // Log permission request for monitoring
        console.log(`Permission requested: ${permission}`);

        // Only allow specific permissions
        if (allowedPermissions.includes(permission as string)) {
          callback(true);
        } else {
          console.warn(`Permission denied: ${permission}`);
          callback(false);
        }
      }
    );

    // Set permission check handler
    window.webContents.session.setPermissionCheckHandler(
      (webContents, permission, requestingOrigin) => {
        // In production, only allow permissions from our app
        if (!this.isDevelopment) {
          const appOrigin = `file://${app.getAppPath()}`;
          if (!requestingOrigin.startsWith(appOrigin)) {
            return false;
          }
        }

        const allowedPermissions: string[] = [
          'clipboard-read',
          'clipboard-write',
          'fullscreen'
        ];

        return allowedPermissions.includes(permission as string);
      }
    );
  }

  /**
   * Configure secure session settings
   */
  configureSession(window: BrowserWindow): void {
    const ses = window.webContents.session;

    // Clear storage data on app start (optional, for maximum security)
    if (!this.isDevelopment) {
      ses.clearStorageData({
        storages: ['cookies', 'localstorage', 'shadercache', 'websql', 'serviceworkers']
      });
    }

    // Set secure cookie policy
    ses.cookies.on('changed', (event, cookie, cause, removed) => {
      // Log cookie changes for security monitoring
      if (!removed && cookie.domain !== 'localhost' && !cookie.secure) {
        console.warn('Insecure cookie detected:', cookie.domain);
      }
    });

    // Disable cache in production for sensitive data
    if (!this.isDevelopment) {
      ses.clearCache();
    }

    // Set a strict user agent
    const userAgent = ses.getUserAgent()
      .replace(/Electron\/[\d.]+\s/, '') // Hide Electron version
      .replace(/\s[\w]+\/[\d.]+/g, '');  // Remove other version info
    
    ses.setUserAgent(userAgent);
  }

  /**
   * Apply all security configurations to a window
   */
  secureWindow(window: BrowserWindow): void {
    // Apply CSP
    this.applyCSP(window);
    
    // Configure permissions
    this.configurePermissions(window);
    
    // Configure session
    this.configureSession(window);
    
    // Prevent new window creation
    window.webContents.setWindowOpenHandler(({ url }) => {
      // Log attempt for security monitoring
      console.log('Window open attempt:', url);
      
      // Open external links in browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      
      return { action: 'deny' };
    });

    // Handle navigation
    window.webContents.on('will-navigate', (event, url) => {
      // In production, prevent all navigation
      if (!this.isDevelopment) {
        const appUrl = window.webContents.getURL();
        if (url !== appUrl) {
          console.warn('Navigation prevented:', url);
          event.preventDefault();
        }
      }
    });

    // Handle will-attach-webview (prevent webview usage)
    window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
      // Strip away preload scripts if unused or inherit from parent
      delete webPreferences.preload;
      
      // Disable Node.js integration
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      
      // Verify the URL is allowed
      if (!params.src.startsWith('file://')) {
        event.preventDefault();
      }
    });

    // Monitor for security-relevant events
    window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      // Log security-relevant console messages
      if (message.includes('CSP') || message.includes('Security') || message.includes('CORS')) {
        console.log(`[Renderer Security Log] ${message}`);
      }
    });

    // Handle certificate errors strictly
    window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      // In production, never ignore certificate errors
      if (!this.isDevelopment) {
        console.error('Certificate error:', { url, error: error });
        callback(false);
      } else if (url.startsWith('https://localhost')) {
        // In development, allow localhost certificates
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  /**
   * Validate IPC channel names for security
   */
  isValidChannel(channel: string): boolean {
    const validChannels = [
      'system:toggle-fullscreen',
      'system:get-display-info',
      'system:minimize',
      'system:maximize',
      'system:close',
      'game:save-state',
      'game:load-state',
      'game:get-saves',
      'game:delete-save',
      'game:take-screenshot',
      'game:get-high-scores',
      'game:save-high-score',
      'settings:get',
      'settings:set',
      'settings:get-all',
      'settings:reset'
    ];

    return validChannels.includes(channel);
  }

  /**
   * Sanitize data from renderer process
   */
  sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      // Remove potential script tags and dangerous content
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(data[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Configure app-level security settings
   */
  configureAppSecurity(): void {
    // Prevent new webContents creation
    app.on('web-contents-created', (event, contents) => {
      // Disable or limit capabilities
      contents.on('will-attach-webview', (event) => {
        event.preventDefault();
      });
    });

    // Set additional security headers through Chromium switches
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
    app.commandLine.appendSwitch('disable-site-isolation-trials');
    
    // Enable sandbox for all renderers
    app.enableSandbox();

    // Set secure app-level permissions
    if (!this.isDevelopment) {
      // Disable remote module (deprecated but ensure it's off)
      app.commandLine.appendSwitch('disable-remote-module');
      
      // Disable node integration in subframes
      app.commandLine.appendSwitch('disable-node-integration-in-subframes');
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();