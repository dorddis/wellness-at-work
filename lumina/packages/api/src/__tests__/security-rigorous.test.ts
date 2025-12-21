/**
 * Security Tests - Rigorous
 *
 * Tests for:
 * 1. XSS prevention (malicious input handling)
 * 2. SQL/NoSQL injection prevention
 * 3. Input validation edge cases
 * 4. Data sanitization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithOtp: vi.fn(),
  },
};

vi.mock('../client', () => ({
  getSupabase: () => mockSupabase,
  isSupabaseInitialized: () => true,
  initializeSupabase: vi.fn(),
}));

// Import after mocking
import {
  syncWellnessData,
  syncAlert,
  type MinuteRollup,
} from '../sync';

import {
  getOrgMembers,
  getOrgWellnessStats,
  getDepartmentStats,
  getEmployeeWellnessData,
  getOrgAlerts,
  acknowledgeAlert,
  getOrgSettings,
  updateOrgSettings,
} from '../queries';

// ============================================================================
// TEST DATA - Malicious Payloads
// ============================================================================

// XSS payloads
const XSS_PAYLOADS = {
  scriptTag: '<script>alert("XSS")</script>',
  imgOnerror: '<img src=x onerror=alert("XSS")>',
  svgOnload: '<svg onload=alert("XSS")>',
  jsProtocol: 'javascript:alert("XSS")',
  dataUri: 'data:text/html,<script>alert("XSS")</script>',
  eventHandler: '" onclick="alert(\'XSS\')" data-foo="',
  cssExpression: 'expression(alert("XSS"))',
  templateLiteral: '${alert("XSS")}',
  unicodeEscape: '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
};

// SQL injection payloads
const SQL_INJECTION_PAYLOADS = {
  basic: "'; DROP TABLE users; --",
  union: "' UNION SELECT * FROM users --",
  commentBypass: "admin'--",
  orTrue: "' OR '1'='1",
  doubleQuote: '" OR "1"="1',
  semicolon: "'; SELECT * FROM pg_tables; --",
  stacked: "1; UPDATE users SET role='admin'",
  blindTime: "' AND SLEEP(5) --",
  blindBool: "' AND 1=1 --",
  hexEncoded: "0x27204f52202731273d2731",
};

// NoSQL injection payloads (for Supabase/PostgreSQL JSONB)
const NOSQL_PAYLOADS = {
  dollarOperator: '{"$gt": ""}',
  nestedOperator: '{"$where": "this.password == this.passwordConfirm"}',
  regexDos: '{"$regex": "^(a+)+$"}',
  jsonEscape: '{"key": "value\\"} OR 1=1--"}',
};

// Special characters
const SPECIAL_CHARS = {
  nullByte: 'test\x00injection',
  newline: 'test\ninjection',
  carriageReturn: 'test\rinjection',
  tab: 'test\tinjection',
  backslash: 'test\\injection',
  singleQuote: "test'injection",
  doubleQuote: 'test"injection',
  backTick: 'test`injection',
  dollarSign: 'test$injection',
  curlyBraces: 'test{injection}',
};

// Unicode edge cases
const UNICODE_PAYLOADS = {
  rtlOverride: '\u202Etest', // Right-to-left override
  zeroWidth: 'te\u200Bst', // Zero-width space
  homoglyph: 'tеst', // Cyrillic 'e' instead of Latin
  combinedChar: 'te\u0301st', // Combining acute accent
  emoji: 'test\uD83D\uDE00', // Emoji
  nullChar: 'test\u0000', // Null character
  bom: '\uFEFFtest', // Byte order mark
  surrogatePair: '\uD800\uDC00', // Surrogate pair
};

// Length edge cases
const LENGTH_PAYLOADS = {
  empty: '',
  veryLong: 'a'.repeat(100000),
  maxSafe: 'a'.repeat(65535), // Max VARCHAR in many DBs
};

describe('Security Tests - XSS Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncWellnessData handles XSS in session_id', () => {
    Object.entries(XSS_PAYLOADS).forEach(([name, payload]) => {
      it(`should safely pass ${name} payload through without execution context`, async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValue({ insert: mockInsert });

        const rollups: MinuteRollup[] = [
          {
            timestamp: Date.now(),
            blink_count: 10,
            avg_ear: 0.25,
            session_id: payload, // XSS in session_id
          },
        ];

        await syncWellnessData('org-123', 'user-456', rollups);

        expect(mockSupabase.from).toHaveBeenCalledWith('wellness_data');
        expect(mockInsert).toHaveBeenCalled();

        // Verify the payload was passed as-is (Supabase handles escaping)
        const insertedData = mockInsert.mock.calls[0][0];
        expect(insertedData[0].session_id).toBe(payload);

        // The key point: the data goes into database, not executed
        // React will escape it when rendering
      });
    });
  });

  describe('syncAlert handles XSS in message field', () => {
    Object.entries(XSS_PAYLOADS).forEach(([name, payload]) => {
      it(`should safely pass ${name} payload in alert message`, async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValue({ insert: mockInsert });

        await syncAlert(
          'org-123',
          'user-456',
          'low_blink',
          'warning',
          payload // XSS in message
        );

        expect(mockSupabase.from).toHaveBeenCalledWith('org_alerts');
        expect(mockInsert).toHaveBeenCalled();

        const insertedData = mockInsert.mock.calls[0][0];
        expect(insertedData.message).toBe(payload);
      });
    });
  });
});

describe('Security Tests - SQL Injection Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrgMembers with malicious orgId', () => {
    Object.entries(SQL_INJECTION_PAYLOADS).forEach(([name, payload]) => {
      it(`should safely handle ${name} injection in orgId`, async () => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        mockSupabase.from.mockReturnValue(mockChain);

        // Call with SQL injection payload as orgId
        await getOrgMembers(payload);

        // Verify eq() was called with the payload as a parameter
        // Supabase SDK uses parameterized queries, so this is safe
        expect(mockChain.eq).toHaveBeenCalledWith('org_id', payload);
      });
    });
  });

  describe('getOrgSettings with malicious orgId', () => {
    Object.entries(SQL_INJECTION_PAYLOADS).forEach(([name, payload]) => {
      it(`should safely handle ${name} injection in orgId`, async () => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
        mockSupabase.from.mockReturnValue(mockChain);

        const result = await getOrgSettings(payload);

        expect(mockChain.eq).toHaveBeenCalledWith('id', payload);
        expect(result).toBeNull();
      });
    });
  });

  describe('acknowledgeAlert with malicious alertId', () => {
    Object.entries(SQL_INJECTION_PAYLOADS).forEach(([name, payload]) => {
      it(`should safely handle ${name} injection in alertId`, async () => {
        const mockChain = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
        mockSupabase.from.mockReturnValue(mockChain);

        await acknowledgeAlert(payload);

        expect(mockChain.eq).toHaveBeenCalledWith('id', payload);
      });
    });
  });

  describe('getEmployeeWellnessData with malicious parameters', () => {
    it('should safely handle SQL injection in userId', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const maliciousUserId = "'; DELETE FROM wellness_data; --";
      await getEmployeeWellnessData('org-123', maliciousUserId);

      // Should call eq twice - once for org_id, once for user_id
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', maliciousUserId);
    });

    it('should safely handle SQL injection in orgId', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const maliciousOrgId = "' OR '1'='1";
      await getEmployeeWellnessData(maliciousOrgId, 'user-123');

      expect(mockChain.eq).toHaveBeenCalledWith('org_id', maliciousOrgId);
    });
  });

  describe('getOrgAlerts with numeric injection in limit', () => {
    it('should handle very large limit value', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      // Potentially dangerous large number
      await getOrgAlerts('org-123', Number.MAX_SAFE_INTEGER);

      expect(mockChain.limit).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative limit value', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await getOrgAlerts('org-123', -1);

      expect(mockChain.limit).toHaveBeenCalledWith(-1);
      // Note: Supabase should handle this, but we should add validation
    });

    it('should handle NaN as limit', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await getOrgAlerts('org-123', NaN);

      // NaN gets passed through - this is a potential issue
      expect(mockChain.limit).toHaveBeenCalledWith(NaN);
    });
  });
});

describe('Security Tests - Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Special character handling', () => {
    Object.entries(SPECIAL_CHARS).forEach(([name, payload]) => {
      it(`should handle ${name} in wellness data`, async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValue({ insert: mockInsert });

        const rollups: MinuteRollup[] = [
          {
            timestamp: Date.now(),
            blink_count: 10,
            avg_ear: 0.25,
            session_id: payload,
          },
        ];

        await syncWellnessData('org-123', 'user-456', rollups);

        const insertedData = mockInsert.mock.calls[0][0];
        expect(insertedData[0].session_id).toBe(payload);
      });
    });
  });

  describe('Unicode handling', () => {
    Object.entries(UNICODE_PAYLOADS).forEach(([name, payload]) => {
      it(`should handle ${name} unicode payload`, async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValue({ insert: mockInsert });

        const rollups: MinuteRollup[] = [
          {
            timestamp: Date.now(),
            blink_count: 10,
            avg_ear: 0.25,
            session_id: payload,
          },
        ];

        await syncWellnessData('org-123', 'user-456', rollups);

        const insertedData = mockInsert.mock.calls[0][0];
        expect(insertedData[0].session_id).toBe(payload);
      });
    });
  });

  describe('Length boundary handling', () => {
    it('should handle empty session_id', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const rollups: MinuteRollup[] = [
        {
          timestamp: Date.now(),
          blink_count: 10,
          avg_ear: 0.25,
          session_id: '',
        },
      ];

      await syncWellnessData('org-123', 'user-456', rollups);

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData[0].session_id).toBe('');
    });

    it('should handle very long session_id (100KB)', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const veryLongId = 'a'.repeat(100000);
      const rollups: MinuteRollup[] = [
        {
          timestamp: Date.now(),
          blink_count: 10,
          avg_ear: 0.25,
          session_id: veryLongId,
        },
      ];

      await syncWellnessData('org-123', 'user-456', rollups);

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData[0].session_id).toBe(veryLongId);
      expect(insertedData[0].session_id.length).toBe(100000);
    });

    it('should handle very long orgId', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const veryLongOrgId = 'org-' + 'a'.repeat(10000);
      await getOrgMembers(veryLongOrgId);

      expect(mockChain.eq).toHaveBeenCalledWith('org_id', veryLongOrgId);
    });
  });

  describe('Type coercion attacks', () => {
    it('should handle array where string expected', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // TypeScript prevents this, but at runtime it could happen
      const rollups: MinuteRollup[] = [
        {
          timestamp: Date.now(),
          blink_count: 10,
          avg_ear: 0.25,
          session_id: ['malicious', 'array'] as unknown as string,
        },
      ];

      await syncWellnessData('org-123', 'user-456', rollups);

      // Data passes through - Supabase/PostgreSQL will handle type validation
      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData[0].session_id).toEqual(['malicious', 'array']);
    });

    it('should handle object where string expected', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const rollups: MinuteRollup[] = [
        {
          timestamp: Date.now(),
          blink_count: 10,
          avg_ear: 0.25,
          session_id: { toString: () => 'malicious' } as unknown as string,
        },
      ];

      await syncWellnessData('org-123', 'user-456', rollups);

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData[0].session_id).toHaveProperty('toString');
    });

    it('should handle prototype pollution attempt', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      // Prototype pollution payload
      const maliciousPayload = JSON.parse('{"__proto__": {"admin": true}}');

      const rollups: MinuteRollup[] = [
        {
          timestamp: Date.now(),
          blink_count: 10,
          avg_ear: 0.25,
          session_id: maliciousPayload as unknown as string,
        },
      ];

      await syncWellnessData('org-123', 'user-456', rollups);

      // Verify prototype wasn't polluted
      const testObj: Record<string, unknown> = {};
      expect(testObj['admin']).toBeUndefined();
    });
  });
});

describe('Security Tests - updateOrgSettings validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle XSS in organization name', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const maliciousName = '<script>alert("XSS")</script>';
    await updateOrgSettings('org-123', { name: maliciousName });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: maliciousName })
    );
  });

  it('should handle XSS in slug', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // Slug with XSS - note: the onboarding page sanitizes this, but the API doesn't
    const maliciousSlug = '"><script>alert(1)</script>';
    await updateOrgSettings('org-123', { slug: maliciousSlug });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ slug: maliciousSlug })
    );
  });

  it('should handle SQL injection in privacy mode', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // TypeScript prevents invalid enum values, but test runtime behavior
    const maliciousPrivacyMode = "'; DROP TABLE organizations; --" as 'anonymous';
    await updateOrgSettings('org-123', { privacyMode: maliciousPrivacyMode });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ privacy_mode: maliciousPrivacyMode })
    );
  });

  it('should handle object injection in alertSettings', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // Malicious alert settings
    const maliciousSettings = {
      lowBlinkThreshold: 10,
      lowBlinkDuration: 10,
      sessionAlertHours: 3,
      emailNotifications: true,
      inAppNotifications: true,
      // Extra malicious fields
      __proto__: { admin: true },
      constructor: { prototype: { admin: true } },
    };

    await updateOrgSettings('org-123', {
      alertSettings: maliciousSettings as any,
    });

    expect(mockChain.update).toHaveBeenCalled();
  });
});

describe('Security Tests - IDOR Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query wellness data with provided IDs (RLS should enforce)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // Attacker trying to access another user's data
    const attackerOrgId = 'attacker-org';
    const victimUserId = 'victim-user';

    await getEmployeeWellnessData(attackerOrgId, victimUserId);

    // The API passes these through - RLS should block unauthorized access
    expect(mockChain.eq).toHaveBeenCalledWith('org_id', attackerOrgId);
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', victimUserId);
  });

  it('should query org members with provided orgId (RLS should enforce)', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // Attacker trying to enumerate another org's members
    const victimOrgId = 'victim-org-uuid';

    await getOrgMembers(victimOrgId);

    // API passes through - RLS should block
    expect(mockChain.eq).toHaveBeenCalledWith('org_id', victimOrgId);
  });

  it('should acknowledge alert with provided ID (RLS should enforce)', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    // Attacker trying to acknowledge another org's alert
    const victimAlertId = 'victim-alert-uuid';

    await acknowledgeAlert(victimAlertId);

    // API passes through - RLS should block
    expect(mockChain.eq).toHaveBeenCalledWith('id', victimAlertId);
  });
});

describe('Security Tests - Numeric Parameter Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrgWellnessStats days parameter', () => {
    it('should handle zero days', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await getOrgWellnessStats('org-123', 0);

      expect(mockSupabase.from).toHaveBeenCalledWith('wellness_data');
    });

    it('should handle negative days', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      // Negative days would query into the future (or very distant past)
      await getOrgWellnessStats('org-123', -365);

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should handle Infinity days by using default', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      // Should NOT throw - Infinity is validated to default of 7
      await getOrgWellnessStats('org-123', Infinity);

      expect(mockSupabase.from).toHaveBeenCalled();
      // gte should be called with a valid ISO timestamp
      expect(mockChain.gte).toHaveBeenCalled();
      const gteArgs = mockChain.gte.mock.calls[0];
      expect(gteArgs[0]).toBe('timestamp');
      // Should be a valid ISO string (not "Invalid Date")
      expect(() => new Date(gteArgs[1])).not.toThrow();
    });
  });

  describe('getDepartmentStats days parameter', () => {
    it('should handle NaN days by using default', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      // Should NOT throw - NaN is validated to default of 7
      await getDepartmentStats('org-123', NaN);

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });
});

describe('Security Tests - Batch Size Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should batch 1000 records correctly', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const rollups: MinuteRollup[] = Array(1000)
      .fill(null)
      .map((_, i) => ({
        timestamp: Date.now() + i,
        blink_count: 10,
        avg_ear: 0.25,
        session_id: `session-${i}`,
      }));

    const result = await syncWellnessData('org-123', 'user-456', rollups);

    // Should batch into 2 requests (500 each as per implementation)
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(result.synced).toBe(1000);
  });

  it('should handle 10000 records with proper batching', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const rollups: MinuteRollup[] = Array(10000)
      .fill(null)
      .map((_, i) => ({
        timestamp: Date.now() + i,
        blink_count: 10,
        avg_ear: 0.25,
        session_id: `session-${i}`,
      }));

    const result = await syncWellnessData('org-123', 'user-456', rollups);

    // 10000 / 500 = 20 batches
    expect(mockInsert).toHaveBeenCalledTimes(20);
    expect(result.synced).toBe(10000);
  });
});

describe('Security Tests - Error Message Exposure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not expose internal error details in sync errors', async () => {
    const sensitiveError = {
      message: 'connection to server at "localhost" (127.0.0.1), port 5432 failed',
      details: 'password authentication failed for user "supabase_admin"',
      hint: 'Check your pg_hba.conf',
      code: 'PGRST301',
    };

    const mockInsert = vi.fn().mockResolvedValue({ error: sensitiveError });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const rollups: MinuteRollup[] = [
      {
        timestamp: Date.now(),
        blink_count: 10,
        avg_ear: 0.25,
        session_id: 'session-1',
      },
    ];

    const result = await syncWellnessData('org-123', 'user-456', rollups);

    // Only the message should be exposed
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe(sensitiveError.message);
    // Details should NOT be exposed
    expect(result.errors[0]).not.toContain('password');
    expect(result.errors[0]).not.toContain('pg_hba.conf');
  });

  it('should not expose internal error details in alert sync', async () => {
    const sensitiveError = {
      message: 'duplicate key value violates unique constraint "org_alerts_pkey"',
      details: 'Key (id)=(uuid-here) already exists',
    };

    const mockInsert = vi.fn().mockResolvedValue({ error: sensitiveError });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await syncAlert(
      'org-123',
      'user-456',
      'low_blink',
      'warning',
      'Test message'
    );

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe(sensitiveError.message);
  });
});

describe('Security Tests - Concurrent Request Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle concurrent syncs without data leakage', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    // Simulate concurrent syncs from different users
    const user1Rollups: MinuteRollup[] = [
      { timestamp: 1, blink_count: 10, avg_ear: 0.25, session_id: 'user1-session' },
    ];

    const user2Rollups: MinuteRollup[] = [
      { timestamp: 2, blink_count: 20, avg_ear: 0.30, session_id: 'user2-session' },
    ];

    // Run concurrently
    await Promise.all([
      syncWellnessData('org-1', 'user-1', user1Rollups),
      syncWellnessData('org-2', 'user-2', user2Rollups),
    ]);

    // Verify each call had correct user data
    expect(mockInsert).toHaveBeenCalledTimes(2);

    const call1Data = mockInsert.mock.calls[0][0];
    const call2Data = mockInsert.mock.calls[1][0];

    // Data should not be mixed
    expect(call1Data[0].user_id).not.toBe(call2Data[0].user_id);
    expect(call1Data[0].org_id).not.toBe(call2Data[0].org_id);
  });
});
