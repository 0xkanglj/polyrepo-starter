import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { info, warn, error, success, debug, setVerbose, moduleLabel } from '../../src/utils/logger.js';

describe('logger', () => {
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    setVerbose(false);
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    setVerbose(false);
  });

  it('info logs cyan [INFO] message', () => {
    info('test message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
  });

  it('warn logs yellow [WARN] message', () => {
    warn('warning text');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('warning text'));
  });

  it('error logs red [ERROR] message', () => {
    error('error text');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('error text'));
  });

  it('success logs green [OK] message', () => {
    success('done');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[OK]'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('done'));
  });

  it('debug does not log when verbose is false', () => {
    debug('debug info');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('debug logs when verbose is true', () => {
    setVerbose(true);
    debug('debug info');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('debug info'));
  });

  it('moduleLabel formats standard module', () => {
    const mod = { name: 'server', templateRef: 'server', isCustom: false };
    expect(moduleLabel('acme', mod)).toBe('acme-server');
  });

  it('moduleLabel formats custom module with template ref', () => {
    const mod = { name: 'crawler', templateRef: 'server', isCustom: true };
    expect(moduleLabel('acme', mod)).toBe('acme-crawler (based on server)');
  });
});
