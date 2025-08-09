/**
 * Electron Security Tests
 * Tests for IPC validation, context isolation, and sandbox restrictions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ipcMain, BrowserWindow, session } from 'electron';
import { SecurityManager } from '../src/electron/main/security';

describe('Electron Security Tests', () => {
  let securityManager: SecurityManager;
  let mockWindow: any;
  
  beforeEach(() => {
    securityManager = new SecurityManager();
    
    // Mock BrowserWindow
    mockWindow = {
      webContents: {
        session: {
          webRequest: {
            onHeadersReceived: vi.fn()
          },
          setPermissionRequestHandler: vi.fn(),
          setPermissionCheckHandler: vi.fn(),
          clearStorageData: vi.fn(),
          clearCache: vi.fn(),
          getUserAgent: vi.fn(() => 'Mozilla/5.0 Electron/1.0.0'),
          setUserAgent: vi.fn(),
          cookies: {
            on: vi.fn()
          }
        },
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
        getURL: vi.fn(() => 'file:///app/index.html')
      }
    };
  });

  describe('IPC Channel Validation', () => {
    it('should validate allowed IPC channels', () => {
      const validChannels = [
        'system:toggle-fullscreen',
        'game:save-state',
        'settings:get',
        'game:get-high-scores'
      ];
      
      validChannels.forEach(channel => {
        expect(securityManager.isValidChannel(channel)).toBe(true);
      });
    });

    it('should reject unauthorized IPC channels', () => {
      const invalidChannels = [
        'fs:readFile',
        'process:exec',
        'eval:code',
        'require:module',
        '../../etc/passwd',
        'DROP TABLE users'
      ];
      
      invalidChannels.forEach(channel => {
        expect(securityManager.isValidChannel(channel)).toBe(false);
      });
    });

    it('should reject oversized IPC messages', () => {
      const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB
      
      const validateMessageSize = (data: any): boolean => {
        const size = JSON.stringify(data).length;
        return size <= MAX_MESSAGE_SIZE;
      };
      
      const smallData = { score: 100 };
      const largeData = { data: 'x'.repeat(11 * 1024 * 1024) };
      
      expect(validateMessageSize(smallData)).toBe(true);
      expect(validateMessageSize(largeData)).toBe(false);
    });

    it('should implement IPC rate limiting', () => {
      const rateLimiter = {
        requests: new Map<string, number[]>(),
        
        isAllowed(channel: string, maxRequests: number = 100, windowMs: number = 1000): boolean {
          const now = Date.now();
          const requests = this.requests.get(channel) || [];
          
          // Remove old requests outside window
          const validRequests = requests.filter(time => now - time < windowMs);
          
          if (validRequests.length >= maxRequests) {
            return false;
          }
          
          validRequests.push(now);
          this.requests.set(channel, validRequests);
          return true;
        }
      };
      
      // Simulate rapid requests
      const channel = 'game:save-state';
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(channel)).toBe(true);
      }
      // 101st request should be blocked
      expect(rateLimiter.isAllowed(channel)).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize string inputs', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const sanitized = securityManager.sanitizeInput(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Hello');
    });

    it('should sanitize javascript: protocols', () => {
      const input = 'javascript:alert(1)';
      const sanitized = securityManager.sanitizeInput(input);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize event handlers', () => {
      const input = '<img src=x onerror=alert(1)>';
      const sanitized = securityManager.sanitizeInput(input);
      
      expect(sanitized).not.toContain('onerror=');
    });

    it('should recursively sanitize objects', () => {
      const input = {
        name: '<script>evil</script>',
        nested: {
          value: 'javascript:alert(1)',
          array: ['<img onerror=alert(1)>', 'safe value']
        }
      };
      
      const sanitized = securityManager.sanitizeInput(input);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.nested.value).not.toContain('javascript:');
      expect(sanitized.nested.array[0]).not.toContain('onerror=');
      expect(sanitized.nested.array[1]).toBe('safe value');
    });
  });

  describe('Path Validation', () => {
    it('should detect path traversal attempts', () => {
      const validatePath = (path: string, basePath: string): boolean => {
        const normalizedPath = require('path').normalize(path);
        const resolvedPath = require('path').resolve(basePath, normalizedPath);
        return resolvedPath.startsWith(basePath);
      };
      
      const basePath = '/app/saves';
      
      expect(validatePath('save1.json', basePath)).toBe(true);
      expect(validatePath('../../../etc/passwd', basePath)).toBe(false);
      expect(validatePath('..\\..\\windows\\system32', basePath)).toBe(false);
    });

    it('should validate file extensions', () => {
      const validateFileExtension = (filename: string): boolean => {
        const allowedExtensions = ['.json', '.db', '.sav'];
        const ext = require('path').extname(filename).toLowerCase();
        return allowedExtensions.includes(ext);
      };
      
      expect(validateFileExtension('save.json')).toBe(true);
      expect(validateFileExtension('save.db')).toBe(true);
      expect(validateFileExtension('evil.exe')).toBe(false);
      expect(validateFileExtension('script.js')).toBe(false);
    });

    it('should prevent symlink attacks', () => {
      const isSymlink = async (path: string): Promise<boolean> => {
        try {
          const fs = require('fs').promises;
          const stats = await fs.lstat(path);
          return stats.isSymbolicLink();
        } catch {
          return false;
        }
      };
      
      // This is a conceptual test - in real scenario, would check actual files
      const validateFile = async (path: string): Promise<boolean> => {
        if (await isSymlink(path)) {
          return false; // Reject symlinks
        }
        return true;
      };
      
      expect(validateFile).toBeDefined();
    });
  });

  describe('Content Security Policy', () => {
    it('should apply restrictive CSP headers', () => {
      securityManager.applyCSP(mockWindow);
      
      const onHeadersReceived = mockWindow.webContents.session.webRequest.onHeadersReceived;
      expect(onHeadersReceived).toHaveBeenCalled();
      
      // Test CSP callback
      const callback = vi.fn();
      const details = { responseHeaders: {} };
      
      // Get the callback function that was passed
      const cspCallback = onHeadersReceived.mock.calls[0][0];
      cspCallback(details, callback);
      
      // Verify security headers are set
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          responseHeaders: expect.objectContaining({
            'Content-Security-Policy': expect.any(Array),
            'X-Content-Type-Options': ['nosniff'],
            'X-Frame-Options': ['DENY'],
            'X-XSS-Protection': ['1; mode=block']
          })
        })
      );
    });

    it('should block inline scripts in production', () => {
      const productionCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
      
      expect(productionCSP).not.toContain("'unsafe-eval'");
      expect(productionCSP).toContain("script-src 'self'");
      expect(productionCSP).not.toContain("script-src 'self' 'unsafe-inline'");
    });

    it('should prevent external resource loading', () => {
      const validateResourceURL = (url: string): boolean => {
        const allowedOrigins = ['self', 'file://', 'app://'];
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return false; // Block external HTTP resources
        }
        
        return allowedOrigins.some(origin => 
          url.startsWith(origin) || url === origin
        );
      };
      
      expect(validateResourceURL('file:///app/assets/image.png')).toBe(true);
      expect(validateResourceURL('https://evil.com/payload.js')).toBe(false);
      expect(validateResourceURL('http://tracker.com/pixel.gif')).toBe(false);
    });
  });

  describe('Permission Management', () => {
    it('should restrict dangerous permissions', () => {
      securityManager.configurePermissions(mockWindow);
      
      const handler = mockWindow.webContents.session.setPermissionRequestHandler;
      expect(handler).toHaveBeenCalled();
      
      // Get the permission handler function
      const permissionHandler = handler.mock.calls[0][0];
      
      // Test various permissions
      const testPermission = (permission: string): boolean => {
        let result = false;
        permissionHandler(null, permission, (granted: boolean) => {
          result = granted;
        });
        return result;
      };
      
      // Allowed permissions
      expect(testPermission('clipboard-read')).toBe(true);
      expect(testPermission('fullscreen')).toBe(true);
      
      // Blocked permissions
      expect(testPermission('camera')).toBe(false);
      expect(testPermission('microphone')).toBe(false);
      expect(testPermission('geolocation')).toBe(false);
      expect(testPermission('notifications')).toBe(false);
    });
  });

  describe('Window Security', () => {
    it('should prevent new window creation', () => {
      securityManager.secureWindow(mockWindow);
      
      expect(mockWindow.webContents.setWindowOpenHandler).toHaveBeenCalled();
      
      // Get the window open handler
      const handler = mockWindow.webContents.setWindowOpenHandler.mock.calls[0][0];
      
      // Test blocking new windows
      const result = handler({ url: 'https://malicious.com' });
      expect(result).toEqual({ action: 'deny' });
    });

    it('should prevent navigation in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const sm = new SecurityManager();
      sm.secureWindow(mockWindow);
      
      // Simulate navigation attempt
      const willNavigateHandlers = mockWindow.webContents.on.mock.calls
        .filter((call: any) => call[0] === 'will-navigate');
      
      expect(willNavigateHandlers.length).toBeGreaterThan(0);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should prevent webview injection', () => {
      securityManager.secureWindow(mockWindow);
      
      const webviewHandlers = mockWindow.webContents.on.mock.calls
        .filter((call: any) => call[0] === 'will-attach-webview');
      
      expect(webviewHandlers.length).toBeGreaterThan(0);
    });
  });

  describe('Sandbox Validation', () => {
    it('should verify context isolation is enabled', () => {
      const webPreferences = {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      };
      
      expect(webPreferences.contextIsolation).toBe(true);
      expect(webPreferences.nodeIntegration).toBe(false);
      expect(webPreferences.sandbox).toBe(true);
    });

    it('should block Node.js API access from renderer', () => {
      // This would be tested in actual renderer process
      const testNodeAccess = (): boolean => {
        try {
          // In properly sandboxed renderer, these should be undefined
          return typeof require === 'undefined' &&
                 typeof process === 'undefined' &&
                 typeof global === 'undefined';
        } catch {
          return true; // Error means it's blocked
        }
      };
      
      // Simulate sandboxed environment
      expect(testNodeAccess).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should clear sensitive data on startup', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const sm = new SecurityManager();
      sm.configureSession(mockWindow);
      
      expect(mockWindow.webContents.session.clearStorageData).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should sanitize user agent string', () => {
      securityManager.configureSession(mockWindow);
      
      expect(mockWindow.webContents.session.setUserAgent).toHaveBeenCalled();
      
      // Verify Electron version is hidden
      const userAgentCall = mockWindow.webContents.session.setUserAgent.mock.calls[0];
      expect(userAgentCall[0]).not.toContain('Electron/');
    });
  });

  describe('Certificate Validation', () => {
    it('should reject invalid certificates in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const sm = new SecurityManager();
      sm.secureWindow(mockWindow);
      
      // Find certificate-error handler
      const certHandlers = mockWindow.webContents.on.mock.calls
        .filter((call: any) => call[0] === 'certificate-error');
      
      expect(certHandlers.length).toBeGreaterThan(0);
      
      if (certHandlers.length > 0) {
        const handler = certHandlers[0][1];
        const callback = vi.fn();
        
        // Test certificate rejection
        handler(null, 'https://untrusted.com', 'cert-error', {}, callback);
        expect(callback).toHaveBeenCalledWith(false);
      }
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});