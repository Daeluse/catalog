import { describe, it, expect } from 'vitest'
import { validators, validationMessages, validateFields } from '../../src/lib/validators'

describe('validators', () => {
  describe('moduleName', () => {
    it('should validate scoped module names', () => {
      expect(validators.moduleName('@myorg/my-module')).toBe(true)
      expect(validators.moduleName('@org/module')).toBe(true)
      expect(validators.moduleName('@my-org/my-module')).toBe(true)
      expect(validators.moduleName('@org_123/module_456')).toBe(true)
    })

    it('should validate unscoped module names', () => {
      expect(validators.moduleName('module')).toBe(true)
      expect(validators.moduleName('my-module')).toBe(true)
      expect(validators.moduleName('module_123')).toBe(true)
    })

    it('should reject invalid module names', () => {
      expect(validators.moduleName('')).toBe(false)
      expect(validators.moduleName('@/module')).toBe(false) // Empty org
      expect(validators.moduleName('@org/')).toBe(false) // Empty module
      expect(validators.moduleName('module name')).toBe(false) // Space
      expect(validators.moduleName('@org/module/path')).toBe(false) // Path
      expect(validators.moduleName('module!')).toBe(false) // Special char
      expect(validators.moduleName('@org@/module')).toBe(false) // Invalid char
    })
  })

  describe('email', () => {
    it('should validate correct email formats', () => {
      expect(validators.email('test@example.com')).toBe(true)
      expect(validators.email('user.name@example.com')).toBe(true)
      expect(validators.email('user+tag@example.co.uk')).toBe(true)
      expect(validators.email('test123@test-domain.com')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validators.email('')).toBe(false)
      expect(validators.email('invalid')).toBe(false)
      expect(validators.email('@example.com')).toBe(false)
      expect(validators.email('test@')).toBe(false)
      expect(validators.email('test@.com')).toBe(false)
      expect(validators.email('test @example.com')).toBe(false) // Space
      expect(validators.email('test@example')).toBe(false) // No TLD
    })
  })

  describe('semver', () => {
    it('should validate correct semantic versions', () => {
      expect(validators.semver('1.0.0')).toBe(true)
      expect(validators.semver('0.0.1')).toBe(true)
      expect(validators.semver('1.2.3')).toBe(true)
      expect(validators.semver('10.20.30')).toBe(true)
      expect(validators.semver('1.0.0-alpha')).toBe(true)
      expect(validators.semver('1.0.0-beta.1')).toBe(true)
      expect(validators.semver('1.0.0+build.123')).toBe(true)
    })

    it('should reject invalid semantic versions', () => {
      expect(validators.semver('')).toBe(false)
      expect(validators.semver('1')).toBe(false)
      expect(validators.semver('1.0')).toBe(false)
      // Note: semver.valid() accepts 'v' prefix, so v1.0.0 is valid
      expect(validators.semver('1.0.0.0')).toBe(false)
      expect(validators.semver('abc')).toBe(false)
      expect(validators.semver('1.x.0')).toBe(false)
    })
  })

  describe('url', () => {
    it('should validate correct URLs', () => {
      expect(validators.url('https://example.com')).toBe(true)
      expect(validators.url('http://example.com')).toBe(true)
      expect(validators.url('https://example.com/path')).toBe(true)
      expect(validators.url('https://example.com:8080')).toBe(true)
      expect(validators.url('https://sub.example.com')).toBe(true)
      expect(validators.url('https://example.com/path?query=value')).toBe(true)
      expect(validators.url('ftp://example.com')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(validators.url('')).toBe(false)
      expect(validators.url('example.com')).toBe(false) // No protocol
      expect(validators.url('/path/to/resource')).toBe(false)
      expect(validators.url('not a url')).toBe(false)
      expect(validators.url('://example.com')).toBe(false)
    })
  })

  describe('origin', () => {
    it('should validate correct origin URLs', () => {
      expect(validators.origin('https://example.com')).toBe(true)
      expect(validators.origin('http://example.com')).toBe(true)
      expect(validators.origin('https://example.com/')).toBe(true)
      expect(validators.origin('https://sub.example.com')).toBe(true)
      expect(validators.origin('https://example.com:8080')).toBe(true)
      expect(validators.origin('http://localhost:3000')).toBe(true)
    })

    it('should reject origin URLs with paths', () => {
      expect(validators.origin('https://example.com/path')).toBe(false)
      expect(validators.origin('https://example.com/api')).toBe(false)
      expect(validators.origin('https://example.com/path/to/resource')).toBe(false)
    })

    it('should reject invalid origin URLs', () => {
      expect(validators.origin('')).toBe(false)
      expect(validators.origin('example.com')).toBe(false) // No protocol
      expect(validators.origin('/path')).toBe(false)
      expect(validators.origin('not a url')).toBe(false)
    })
  })

  describe('notEmpty', () => {
    it('should validate non-empty strings', () => {
      expect(validators.notEmpty('test')).toBe(true)
      expect(validators.notEmpty('a')).toBe(true)
      expect(validators.notEmpty(' test ')).toBe(true)
    })

    it('should reject empty or whitespace-only strings', () => {
      expect(validators.notEmpty('')).toBe(false)
      expect(validators.notEmpty(' ')).toBe(false)
      expect(validators.notEmpty('  ')).toBe(false)
      expect(validators.notEmpty('\t')).toBe(false)
      expect(validators.notEmpty('\n')).toBe(false)
    })
  })

  describe('minLength', () => {
    it('should validate strings meeting minimum length', () => {
      expect(validators.minLength('test', 3)).toBe(true)
      expect(validators.minLength('test', 4)).toBe(true)
      expect(validators.minLength('hello', 5)).toBe(true)
      expect(validators.minLength('a', 1)).toBe(true)
    })

    it('should reject strings below minimum length', () => {
      expect(validators.minLength('', 1)).toBe(false)
      expect(validators.minLength('test', 5)).toBe(false)
      expect(validators.minLength('hi', 3)).toBe(false)
    })
  })

  describe('maxLength', () => {
    it('should validate strings within maximum length', () => {
      expect(validators.maxLength('test', 5)).toBe(true)
      expect(validators.maxLength('test', 4)).toBe(true)
      expect(validators.maxLength('', 10)).toBe(true)
    })

    it('should reject strings exceeding maximum length', () => {
      expect(validators.maxLength('test', 3)).toBe(false)
      expect(validators.maxLength('hello', 4)).toBe(false)
      expect(validators.maxLength('too long', 5)).toBe(false)
    })
  })
})

describe('validationMessages', () => {
  it('should provide error messages for validators', () => {
    expect(validationMessages.moduleName).toContain('module name')
    expect(validationMessages.email).toContain('email')
    expect(validationMessages.semver).toContain('version')
    expect(validationMessages.url).toContain('URL')
    expect(validationMessages.origin).toContain('origin')
    expect(validationMessages.notEmpty).toContain('required')
  })

  it('should provide dynamic error messages for length validators', () => {
    expect(validationMessages.minLength(5)).toContain('5')
    expect(validationMessages.minLength(10)).toContain('10')
    expect(validationMessages.maxLength(100)).toContain('100')
  })
})

describe('validateFields', () => {
  it('should validate multiple fields successfully', () => {
    const fields = {
      email: 'test@example.com',
      name: 'Test User',
      version: '1.0.0',
    }

    const rules = {
      email: [(v: string) => validators.email(v)],
      name: [(v: string) => validators.notEmpty(v)],
      version: [(v: string) => validators.semver(v)],
    }

    const errors = validateFields(fields, rules)
    expect(errors).toEqual({})
  })

  it('should collect errors for invalid fields', () => {
    const fields = {
      email: 'invalid-email',
      name: '',
      version: 'not-a-version',
    }

    const rules = {
      email: [(v: string) => validators.email(v)],
      name: [(v: string) => validators.notEmpty(v)],
      version: [(v: string) => validators.semver(v)],
    }

    const errors = validateFields(fields, rules)
    expect(errors).toHaveProperty('email')
    expect(errors).toHaveProperty('name')
    expect(errors).toHaveProperty('version')
  })

  it('should stop at first failing rule per field', () => {
    const fields = {
      name: '', // Fails both notEmpty and minLength
    }

    const rules = {
      name: [
        (v: string) => validators.notEmpty(v) || 'Field is required',
        (v: string) => validators.minLength(v, 3) || 'Must be at least 3 characters',
      ],
    }

    const errors = validateFields(fields, rules)
    expect(errors.name).toBe('Field is required')
  })

  it('should support custom error messages from rules', () => {
    const fields = {
      email: 'invalid',
    }

    const rules = {
      email: [(v: string) => validators.email(v) || 'Please enter a valid email address'],
    }

    const errors = validateFields(fields, rules)
    expect(errors.email).toBe('Please enter a valid email address')
  })

  it('should handle multiple rules for a field', () => {
    const fields = {
      password: 'short',
    }

    const rules = {
      password: [
        (v: string) => validators.notEmpty(v) || 'Password is required',
        (v: string) => validators.minLength(v, 8) || 'Password must be at least 8 characters',
      ],
    }

    const errors = validateFields(fields, rules)
    expect(errors.password).toBe('Password must be at least 8 characters')
  })

  it('should return empty object when all validations pass', () => {
    const fields = {
      moduleName: '@myorg/my-module',
      version: '1.0.0',
      url: 'https://example.com',
    }

    const rules = {
      moduleName: [(v: string) => validators.moduleName(v)],
      version: [(v: string) => validators.semver(v)],
      url: [(v: string) => validators.url(v)],
    }

    const errors = validateFields(fields, rules)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})
